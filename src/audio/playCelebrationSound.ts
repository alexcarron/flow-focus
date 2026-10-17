const MAJOR_PENTATONIC_SEMITONES_FROM_ROOT = [0, 2, 4, 7, 9];
const NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE = MAJOR_PENTATONIC_SEMITONES_FROM_ROOT.length;
const ROOT_FREQUENCY_HERTZ = 523.25;
const MASTER_VOLUME = 0.3;
const CELEBRATION_STREAK_RESET_MILLISECONDS = 15 * 60 * 1000;
const ARPEGGIO_PENTATONIC_DEGREE_OFFSETS = [0, 1, 2, 3, 5];
const ARPEGGIO_NOTE_SPACING_SECONDS = 0.06;
const ARPEGGIO_START_DELAY_SECONDS = 0.03;
const ARPEGGIO_NOTE_VOLUME = 0.5;
const ARPEGGIO_NOTE_DECAY_SECONDS = 0.6;
const ARPEGGIO_FINAL_NOTE_VOLUME = 0.6;
const ARPEGGIO_FINAL_NOTE_DECAY_SECONDS = 1.2;
const SPARKLE_NOTE_COUNT = 6;
const SPARKLE_LOWEST_PENTATONIC_DEGREE = 10;
const SPARKLE_HIGHEST_PENTATONIC_DEGREE = 14;
const SPARKLE_START_SECONDS_RANGE = { minimum: 0.35, maximum: 1.8 };
const SPARKLE_STEREO_PAN_RANGE = { minimum: -0.6, maximum: 0.6 };
const SPARKLE_NOTE_VOLUME = 0.12;
const SPARKLE_NOTE_DECAY_SECONDS = 0.35;
const POP_NOISE_SECONDS = 0.1;
const POP_NOISE_FILTER_FREQUENCY_HERTZ = 1800;
const POP_NOISE_VOLUME = 0.5;
const POP_NOISE_DECAY_SECONDS = 0.09;
const POP_THUMP_START_FREQUENCY_HERTZ = 300;
const POP_THUMP_END_FREQUENCY_HERTZ = 80;
const POP_THUMP_VOLUME = 0.4;
const POP_THUMP_DECAY_SECONDS = 0.12;
const NOTE_ATTACK_SECONDS = 0.005;
const SILENT_VOLUME = 0.0001;
const STOP_FADE_OUT_SECONDS = 0.03;
const LONGEST_SOUND_SECONDS = 3;

let audioContext: AudioContext | null = null;
let masterVolumeNode: GainNode | null = null;
let celebrationStreakLength = 0;
let lastCelebrationMilliseconds = -Infinity;

function getRandomNumberInRange({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum + Math.random() * (maximum - minimum);
}

function getRandomIntegerInRange({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function getAudioOutput(): { audioContext: AudioContext, masterVolumeNode: GainNode } | null {
	if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null;

	if (!audioContext || !masterVolumeNode) {
		audioContext = new AudioContext();
		const compressor = audioContext.createDynamicsCompressor();
		masterVolumeNode = audioContext.createGain();
		masterVolumeNode.gain.value = MASTER_VOLUME;
		masterVolumeNode.connect(compressor);
		compressor.connect(audioContext.destination);
	}
	if (audioContext.state === 'suspended') void audioContext.resume();
	return { audioContext, masterVolumeNode };
}

function convertPentatonicDegreeToFrequency(pentatonicDegree: number): number {
	const octave = Math.floor(pentatonicDegree / NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE);
	const degreeWithinOctave = pentatonicDegree % NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE;
	const semitonesFromRoot = MAJOR_PENTATONIC_SEMITONES_FROM_ROOT[degreeWithinOctave] + octave * 12;
	return ROOT_FREQUENCY_HERTZ * 2 ** (semitonesFromRoot / 12);
}

function advanceCelebrationStreak(): number {
	const currentMilliseconds = performance.now();
	const isCelebrationStreakOver = currentMilliseconds - lastCelebrationMilliseconds > CELEBRATION_STREAK_RESET_MILLISECONDS;
	if (isCelebrationStreakOver) celebrationStreakLength = 0;

	lastCelebrationMilliseconds = currentMilliseconds;
	const celebrationStreakStep = celebrationStreakLength % NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE;
	celebrationStreakLength++;
	return celebrationStreakStep;
}

function playVolumeEnvelope({ volumeNode, startTime, peakVolume, decaySeconds }: {
	volumeNode: GainNode,
	startTime: number,
	peakVolume: number,
	decaySeconds: number,
}) {
	volumeNode.gain.setValueAtTime(SILENT_VOLUME, startTime);
	volumeNode.gain.linearRampToValueAtTime(peakVolume, startTime + NOTE_ATTACK_SECONDS);
	volumeNode.gain.exponentialRampToValueAtTime(SILENT_VOLUME, startTime + NOTE_ATTACK_SECONDS + decaySeconds);
}

function playBellNote({ audioContext, destination, frequency, startTime, peakVolume, decaySeconds }: {
	audioContext: AudioContext,
	destination: AudioNode,
	frequency: number,
	startTime: number,
	peakVolume: number,
	decaySeconds: number,
}) {
	const bellOvertones = [
		{ frequencyMultiplier: 1, volumeMultiplier: 1, decayMultiplier: 1 },
		{ frequencyMultiplier: 2, volumeMultiplier: 0.25, decayMultiplier: 0.6 },
		{ frequencyMultiplier: 3, volumeMultiplier: 0.08, decayMultiplier: 0.35 },
	];

	for (const { frequencyMultiplier, volumeMultiplier, decayMultiplier } of bellOvertones) {
		const oscillator = audioContext.createOscillator();
		const volumeNode = audioContext.createGain();
		oscillator.frequency.value = frequency * frequencyMultiplier;
		playVolumeEnvelope({
			volumeNode,
			startTime,
			peakVolume: peakVolume * volumeMultiplier,
			decaySeconds: decaySeconds * decayMultiplier,
		});
		oscillator.connect(volumeNode);
		volumeNode.connect(destination);
		oscillator.start(startTime);
		oscillator.stop(startTime + NOTE_ATTACK_SECONDS + decaySeconds);
	}
}

function playPop({ audioContext, destination, startTime }: {
	audioContext: AudioContext,
	destination: AudioNode,
	startTime: number,
}) {
	const noiseBuffer = audioContext.createBuffer(
		1,
		Math.ceil(audioContext.sampleRate * POP_NOISE_SECONDS),
		audioContext.sampleRate,
	);
	const noiseSamples = noiseBuffer.getChannelData(0);
	for (let sampleIndex = 0; sampleIndex < noiseSamples.length; sampleIndex++) {
		noiseSamples[sampleIndex] = Math.random() * 2 - 1;
	}

	const noiseSource = audioContext.createBufferSource();
	const noiseFilter = audioContext.createBiquadFilter();
	const noiseVolumeNode = audioContext.createGain();
	noiseSource.buffer = noiseBuffer;
	noiseFilter.type = 'bandpass';
	noiseFilter.frequency.value = POP_NOISE_FILTER_FREQUENCY_HERTZ;
	playVolumeEnvelope({
		volumeNode: noiseVolumeNode,
		startTime,
		peakVolume: POP_NOISE_VOLUME,
		decaySeconds: POP_NOISE_DECAY_SECONDS,
	});
	noiseSource.connect(noiseFilter);
	noiseFilter.connect(noiseVolumeNode);
	noiseVolumeNode.connect(destination);
	noiseSource.start(startTime);

	const thumpOscillator = audioContext.createOscillator();
	const thumpVolumeNode = audioContext.createGain();
	thumpOscillator.frequency.setValueAtTime(POP_THUMP_START_FREQUENCY_HERTZ, startTime);
	thumpOscillator.frequency.exponentialRampToValueAtTime(POP_THUMP_END_FREQUENCY_HERTZ, startTime + POP_THUMP_DECAY_SECONDS);
	playVolumeEnvelope({
		volumeNode: thumpVolumeNode,
		startTime,
		peakVolume: POP_THUMP_VOLUME,
		decaySeconds: POP_THUMP_DECAY_SECONDS,
	});
	thumpOscillator.connect(thumpVolumeNode);
	thumpVolumeNode.connect(destination);
	thumpOscillator.start(startTime);
	thumpOscillator.stop(startTime + NOTE_ATTACK_SECONDS + POP_THUMP_DECAY_SECONDS);
}

function playSparkleNote({ audioContext, destination, startTime }: {
	audioContext: AudioContext,
	destination: AudioNode,
	startTime: number,
}) {
	const stereoPanner = audioContext.createStereoPanner();
	stereoPanner.pan.value = getRandomNumberInRange(SPARKLE_STEREO_PAN_RANGE);
	stereoPanner.connect(destination);

	playBellNote({
		audioContext,
		destination: stereoPanner,
		frequency: convertPentatonicDegreeToFrequency(getRandomIntegerInRange({
			minimum: SPARKLE_LOWEST_PENTATONIC_DEGREE,
			maximum: SPARKLE_HIGHEST_PENTATONIC_DEGREE,
		})),
		startTime,
		peakVolume: SPARKLE_NOTE_VOLUME,
		decaySeconds: SPARKLE_NOTE_DECAY_SECONDS,
	});
}

export function playCelebrationSound(): () => void {
	const audioOutput = getAudioOutput();
	if (!audioOutput) return () => {};

	const { audioContext, masterVolumeNode } = audioOutput;
	const celebrationStreakStep = advanceCelebrationStreak();
	const soundStartTime = audioContext.currentTime;
	const celebrationVolumeNode = audioContext.createGain();
	celebrationVolumeNode.connect(masterVolumeNode);

	playPop({
		audioContext,
		destination: celebrationVolumeNode,
		startTime: soundStartTime,
	});

	ARPEGGIO_PENTATONIC_DEGREE_OFFSETS.forEach((pentatonicDegreeOffset, arpeggioNoteIndex) => {
		const isFinalArpeggioNote = arpeggioNoteIndex === ARPEGGIO_PENTATONIC_DEGREE_OFFSETS.length - 1;
		playBellNote({
			audioContext,
			destination: celebrationVolumeNode,
			frequency: convertPentatonicDegreeToFrequency(celebrationStreakStep + pentatonicDegreeOffset),
			startTime: soundStartTime + ARPEGGIO_START_DELAY_SECONDS + arpeggioNoteIndex * ARPEGGIO_NOTE_SPACING_SECONDS,
			peakVolume: isFinalArpeggioNote ? ARPEGGIO_FINAL_NOTE_VOLUME : ARPEGGIO_NOTE_VOLUME,
			decaySeconds: isFinalArpeggioNote ? ARPEGGIO_FINAL_NOTE_DECAY_SECONDS : ARPEGGIO_NOTE_DECAY_SECONDS,
		});
	});

	for (let sparkleNoteIndex = 0; sparkleNoteIndex < SPARKLE_NOTE_COUNT; sparkleNoteIndex++) {
		playSparkleNote({
			audioContext,
			destination: celebrationVolumeNode,
			startTime: soundStartTime + getRandomNumberInRange(SPARKLE_START_SECONDS_RANGE),
		});
	}

	const disconnectTimeoutID = setTimeout(() => celebrationVolumeNode.disconnect(), LONGEST_SOUND_SECONDS * 1000);

	return function stopCelebrationSound() {
		clearTimeout(disconnectTimeoutID);
		const stopTime = audioContext.currentTime;
		celebrationVolumeNode.gain.setValueAtTime(celebrationVolumeNode.gain.value, stopTime);
		celebrationVolumeNode.gain.linearRampToValueAtTime(0, stopTime + STOP_FADE_OUT_SECONDS);
		setTimeout(() => celebrationVolumeNode.disconnect(), STOP_FADE_OUT_SECONDS * 1000 * 2);
	};
}

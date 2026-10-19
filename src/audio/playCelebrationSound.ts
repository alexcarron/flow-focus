import { getAudioOutput } from './getAudioOutput';
import { getReverbImpulseResponseOfAudioContext, REVERB_SECONDS } from './getReverbImpulseResponse';
import { convertPentatonicDegreeToFrequency } from './convertPentatonicDegreeToFrequency';
import { convertSemitonesFromRootToFrequency } from './convertSemitonesFromRootToFrequency';
import { playTone, playVolumeEnvelope, type Overtone } from './playTone';

type TaskEffortRange = { atNoTaskEffort: number, atFullTaskEffort: number };

const CELEBRATION_STREAK_RESET_MILLISECONDS = 60 * 1000;
const LANDING_PENTATONIC_DEGREE = 5;
const RISING_KEY_SHIFTS_SEMITONES = [-7, -5, -3, -2, 0];
const SEMITONES_PER_OCTAVE = 12;
const CLIMB_SHAPES_PENTATONIC_DEGREES_BEFORE_LANDING = [
	[-2, -1, 0, 1, 2, 3],
	[-5, -3, -2, 0, 2, 3],
	[-3, -1, 0, 2, 3, 4],
];
const LANDING_CHORDS: { bassSemitonesFromRoot: number, chordSemitonesFromRoot: number[] }[] = [
	{ bassSemitonesFromRoot: -24, chordSemitonesFromRoot: [-12, -5, 4] },
	{ bassSemitonesFromRoot: -31, chordSemitonesFromRoot: [-12, -7, -3] },
	{ bassSemitonesFromRoot: -27, chordSemitonesFromRoot: [-15, -8, 0] },
	{ bassSemitonesFromRoot: -24, chordSemitonesFromRoot: [-12, -3, 4] },
];
const CLIMB_NOTE_COUNT: TaskEffortRange = { atNoTaskEffort: 3, atFullTaskEffort: 7 };
const CLIMB_START_DELAY_SECONDS = 0.02;
const CLIMB_NOTE_SPACING_SECONDS: TaskEffortRange = { atNoTaskEffort: 0.07, atFullTaskEffort: 0.085 };
const CLIMB_FIRST_NOTE_VOLUME = 0.3;
const CLIMB_LAST_NOTE_VOLUME = 0.45;
const CLIMB_NOTE_DECAY_SECONDS = 0.5;
const ANTICIPATION_PAUSE_SECONDS: TaskEffortRange = { atNoTaskEffort: 0, atFullTaskEffort: 0.12 };
const LANDING_NOTE_VOLUME = 0.55;
const LANDING_NOTE_DECAY_SECONDS: TaskEffortRange = { atNoTaskEffort: 0.9, atFullTaskEffort: 1.8 };

const LANDING_CHORD_NOTE_VOLUME: TaskEffortRange = { atNoTaskEffort: 0.05, atFullTaskEffort: 0.16 };
const LANDING_CHORD_ATTACK_SECONDS: TaskEffortRange = { atNoTaskEffort: 0.02, atFullTaskEffort: 0.06 };
const LANDING_CHORD_DECAY_SECONDS: TaskEffortRange = { atNoTaskEffort: 1, atFullTaskEffort: 2.6 };
const LANDING_BASS_VOLUME: TaskEffortRange = { atNoTaskEffort: 0, atFullTaskEffort: 0.22 };

const SPARKLE_NOTE_COUNT: TaskEffortRange = { atNoTaskEffort: 1, atFullTaskEffort: 9 };
const SPARKLE_LOWEST_PENTATONIC_DEGREE = 5;
const SPARKLE_HIGHEST_PENTATONIC_DEGREE = 9;
const SPARKLE_EARLIEST_SECONDS_AFTER_LANDING = 0.08;
const SPARKLE_LATEST_SECONDS_AFTER_LANDING: TaskEffortRange = { atNoTaskEffort: 0.5, atFullTaskEffort: 2 };
const SPARKLE_STEREO_PAN_RANGE = { minimum: -0.6, maximum: 0.6 };
const SPARKLE_NOTE_VOLUME = 0.09;
const SPARKLE_NOTE_DECAY_SECONDS = 0.4;

const TAP_THUMP_START_FREQUENCY_HERTZ = 240;
const TAP_THUMP_END_FREQUENCY_HERTZ = 110;
const TAP_THUMP_VOLUME = 0.22;
const TAP_THUMP_DECAY_SECONDS = 0.07;
const TAP_NOISE_SECONDS = 0.05;
const TAP_NOISE_LOWPASS_FREQUENCY_HERTZ = 1500;
const TAP_NOISE_VOLUME = 0.12;
const TAP_NOISE_DECAY_SECONDS = 0.03;

const REVERB_WET_VOLUME: TaskEffortRange = { atNoTaskEffort: 0.18, atFullTaskEffort: 0.35 };
const REVERB_PREDELAY_SECONDS = 0.02;
const REVERB_HIGHPASS_FREQUENCY_HERTZ = 250;
const REVERB_LOWPASS_FREQUENCY_HERTZ = 4000;

const MALLET_OVERTONES: Overtone[] = [
	{ frequencyMultiplier: 1, volumeMultiplier: 1, decayMultiplier: 1 },
	{ frequencyMultiplier: 2, volumeMultiplier: 0.18, decayMultiplier: 0.45 },
	{ frequencyMultiplier: 4.2, volumeMultiplier: 0.05, decayMultiplier: 0.08 },
];
const PAD_OVERTONES: Overtone[] = [
	{ frequencyMultiplier: 1, volumeMultiplier: 1, decayMultiplier: 1 },
	{ frequencyMultiplier: 2, volumeMultiplier: 0.12, decayMultiplier: 0.6 },
];
const SPARKLE_OVERTONES: Overtone[] = [
	{ frequencyMultiplier: 1, volumeMultiplier: 1, decayMultiplier: 1 },
	{ frequencyMultiplier: 2, volumeMultiplier: 0.15, decayMultiplier: 0.4 },
];
const MALLET_ATTACK_SECONDS = 0.005;
const HUMANIZED_TIMING_SECONDS_RANGE = { minimum: -0.005, maximum: 0.005 };
const HUMANIZED_VOLUME_MULTIPLIER_RANGE = { minimum: 0.92, maximum: 1.08 };
const STOP_FADE_OUT_SECONDS = 0.03;

let celebrationStreakLength = 0;
let lastCelebrationMilliseconds = -Infinity;

function getRandomNumberInRange({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum + Math.random() * (maximum - minimum);
}

function getRandomIntegerInRange({ minimum, maximum }: { minimum: number, maximum: number }): number {
	return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function advanceCelebrationStreak(): number {
	const currentMilliseconds = performance.now();
	const isCelebrationStreakOver = currentMilliseconds - lastCelebrationMilliseconds > CELEBRATION_STREAK_RESET_MILLISECONDS;
	if (isCelebrationStreakOver) celebrationStreakLength = 0;

	lastCelebrationMilliseconds = currentMilliseconds;
	const celebrationStreakStep = celebrationStreakLength;
	celebrationStreakLength++;
	return celebrationStreakStep;
}

function scaleByTaskEffort({ range, taskEffort }: { range: TaskEffortRange, taskEffort: number }): number {
	return range.atNoTaskEffort + (range.atFullTaskEffort - range.atNoTaskEffort) * taskEffort;
}

function playMalletNote({ audioContext, destination, pentatonicDegree, keyFrequencyMultiplier, startTime, peakVolume, decaySeconds }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	pentatonicDegree: number,
	keyFrequencyMultiplier: number,
	startTime: number,
	peakVolume: number,
	decaySeconds: number,
}) {
	playTone({
		audioContext,
		destination,
		frequency: convertPentatonicDegreeToFrequency(pentatonicDegree) * keyFrequencyMultiplier,
		startTime: Math.max(startTime + getRandomNumberInRange(HUMANIZED_TIMING_SECONDS_RANGE), audioContext.currentTime),
		peakVolume: peakVolume * getRandomNumberInRange(HUMANIZED_VOLUME_MULTIPLIER_RANGE),
		attackSeconds: MALLET_ATTACK_SECONDS,
		decaySeconds,
		overtones: MALLET_OVERTONES,
	});
}

function playTap({ audioContext, destination, startTime }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	startTime: number,
}) {
	const noiseBuffer = audioContext.createBuffer(
		1,
		Math.ceil(audioContext.sampleRate * TAP_NOISE_SECONDS),
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
	noiseFilter.type = 'lowpass';
	noiseFilter.frequency.value = TAP_NOISE_LOWPASS_FREQUENCY_HERTZ;
	playVolumeEnvelope({
		volumeNode: noiseVolumeNode,
		startTime,
		peakVolume: TAP_NOISE_VOLUME,
		attackSeconds: MALLET_ATTACK_SECONDS,
		decaySeconds: TAP_NOISE_DECAY_SECONDS,
	});
	noiseSource.connect(noiseFilter);
	noiseFilter.connect(noiseVolumeNode);
	noiseVolumeNode.connect(destination);
	noiseSource.start(startTime);

	const thumpOscillator = audioContext.createOscillator();
	const thumpVolumeNode = audioContext.createGain();
	thumpOscillator.frequency.setValueAtTime(TAP_THUMP_START_FREQUENCY_HERTZ, startTime);
	thumpOscillator.frequency.exponentialRampToValueAtTime(TAP_THUMP_END_FREQUENCY_HERTZ, startTime + TAP_THUMP_DECAY_SECONDS);
	playVolumeEnvelope({
		volumeNode: thumpVolumeNode,
		startTime,
		peakVolume: TAP_THUMP_VOLUME,
		attackSeconds: MALLET_ATTACK_SECONDS,
		decaySeconds: TAP_THUMP_DECAY_SECONDS,
	});
	thumpOscillator.connect(thumpVolumeNode);
	thumpVolumeNode.connect(destination);
	thumpOscillator.start(startTime);
	thumpOscillator.stop(startTime + MALLET_ATTACK_SECONDS + TAP_THUMP_DECAY_SECONDS);
}

function playClimbAndGetLandingTime({ audioContext, destination, startTime, taskEffort, celebrationStreakStep, keyFrequencyMultiplier }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	startTime: number,
	taskEffort: number,
	celebrationStreakStep: number,
	keyFrequencyMultiplier: number,
}): number {
	const climbNoteCountIncludingLanding = Math.round(scaleByTaskEffort({ range: CLIMB_NOTE_COUNT, taskEffort }));
	const climbShape = CLIMB_SHAPES_PENTATONIC_DEGREES_BEFORE_LANDING[celebrationStreakStep % CLIMB_SHAPES_PENTATONIC_DEGREES_BEFORE_LANDING.length];
	const climbPentatonicDegrees = climbShape.slice(-(climbNoteCountIncludingLanding - 1));
	const climbNoteSpacingSeconds = scaleByTaskEffort({ range: CLIMB_NOTE_SPACING_SECONDS, taskEffort });

	climbPentatonicDegrees.forEach((pentatonicDegree, climbNoteIndex) => {
		const climbProgress = climbNoteIndex / Math.max(1, climbPentatonicDegrees.length - 1);
		playMalletNote({
			audioContext,
			destination,
			pentatonicDegree,
			keyFrequencyMultiplier,
			startTime: startTime + climbNoteIndex * climbNoteSpacingSeconds,
			peakVolume: CLIMB_FIRST_NOTE_VOLUME + (CLIMB_LAST_NOTE_VOLUME - CLIMB_FIRST_NOTE_VOLUME) * climbProgress,
			decaySeconds: CLIMB_NOTE_DECAY_SECONDS,
		});
	});

	const anticipationPauseSeconds = scaleByTaskEffort({ range: ANTICIPATION_PAUSE_SECONDS, taskEffort });
	return startTime + climbPentatonicDegrees.length * climbNoteSpacingSeconds + anticipationPauseSeconds;
}

function playLanding({ audioContext, destination, landingTime, taskEffort, celebrationStreakStep, keyFrequencyMultiplier }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	landingTime: number,
	taskEffort: number,
	celebrationStreakStep: number,
	keyFrequencyMultiplier: number,
}) {
	const landingChord = LANDING_CHORDS[celebrationStreakStep % LANDING_CHORDS.length];
	playMalletNote({
		audioContext,
		destination,
		pentatonicDegree: LANDING_PENTATONIC_DEGREE,
		keyFrequencyMultiplier,
		startTime: landingTime,
		peakVolume: LANDING_NOTE_VOLUME,
		decaySeconds: scaleByTaskEffort({ range: LANDING_NOTE_DECAY_SECONDS, taskEffort }),
	});

	const landingChordAttackSeconds = scaleByTaskEffort({ range: LANDING_CHORD_ATTACK_SECONDS, taskEffort });
	const landingChordDecaySeconds = scaleByTaskEffort({ range: LANDING_CHORD_DECAY_SECONDS, taskEffort });
	for (const semitonesFromRoot of landingChord.chordSemitonesFromRoot) {
		playTone({
			audioContext,
			destination,
			frequency: convertSemitonesFromRootToFrequency(semitonesFromRoot) * keyFrequencyMultiplier,
			startTime: landingTime,
			peakVolume: scaleByTaskEffort({ range: LANDING_CHORD_NOTE_VOLUME, taskEffort }),
			attackSeconds: landingChordAttackSeconds,
			decaySeconds: landingChordDecaySeconds,
			overtones: PAD_OVERTONES,
		});
	}

	playTone({
		audioContext,
		destination,
		frequency: convertSemitonesFromRootToFrequency(landingChord.bassSemitonesFromRoot) * keyFrequencyMultiplier,
		startTime: landingTime,
		peakVolume: scaleByTaskEffort({ range: LANDING_BASS_VOLUME, taskEffort }),
		attackSeconds: landingChordAttackSeconds,
		decaySeconds: landingChordDecaySeconds,
		overtones: PAD_OVERTONES,
	});
}

function playSparkles({ audioContext, destination, landingTime, taskEffort, keyFrequencyMultiplier }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	landingTime: number,
	taskEffort: number,
	keyFrequencyMultiplier: number,
}) {
	const sparkleNoteCount = Math.round(scaleByTaskEffort({ range: SPARKLE_NOTE_COUNT, taskEffort }));
	const sparkleLatestSecondsAfterLanding = scaleByTaskEffort({ range: SPARKLE_LATEST_SECONDS_AFTER_LANDING, taskEffort });

	for (let sparkleNoteIndex = 0; sparkleNoteIndex < sparkleNoteCount; sparkleNoteIndex++) {
		const stereoPanner = audioContext.createStereoPanner();
		stereoPanner.pan.value = getRandomNumberInRange(SPARKLE_STEREO_PAN_RANGE);
		stereoPanner.connect(destination);

		playTone({
			audioContext,
			destination: stereoPanner,
			frequency: convertPentatonicDegreeToFrequency(getRandomIntegerInRange({
				minimum: SPARKLE_LOWEST_PENTATONIC_DEGREE,
				maximum: SPARKLE_HIGHEST_PENTATONIC_DEGREE,
			})) * keyFrequencyMultiplier,
			startTime: landingTime + getRandomNumberInRange({
				minimum: SPARKLE_EARLIEST_SECONDS_AFTER_LANDING,
				maximum: sparkleLatestSecondsAfterLanding,
			}),
			peakVolume: SPARKLE_NOTE_VOLUME * getRandomNumberInRange(HUMANIZED_VOLUME_MULTIPLIER_RANGE),
			attackSeconds: MALLET_ATTACK_SECONDS,
			decaySeconds: SPARKLE_NOTE_DECAY_SECONDS,
			overtones: SPARKLE_OVERTONES,
		});
	}
}

function connectReverbSend({ audioContext, source, destination, taskEffort }: {
	audioContext: BaseAudioContext,
	source: AudioNode,
	destination: AudioNode,
	taskEffort: number,
}) {
	const predelay = audioContext.createDelay();
	predelay.delayTime.value = REVERB_PREDELAY_SECONDS;
	const convolver = audioContext.createConvolver();
	convolver.buffer = getReverbImpulseResponseOfAudioContext(audioContext);
	const highpassFilter = audioContext.createBiquadFilter();
	highpassFilter.type = 'highpass';
	highpassFilter.frequency.value = REVERB_HIGHPASS_FREQUENCY_HERTZ;
	const lowpassFilter = audioContext.createBiquadFilter();
	lowpassFilter.type = 'lowpass';
	lowpassFilter.frequency.value = REVERB_LOWPASS_FREQUENCY_HERTZ;
	const wetVolumeNode = audioContext.createGain();
	wetVolumeNode.gain.value = scaleByTaskEffort({ range: REVERB_WET_VOLUME, taskEffort });

	source.connect(predelay);
	predelay.connect(convolver);
	convolver.connect(highpassFilter);
	highpassFilter.connect(lowpassFilter);
	lowpassFilter.connect(wetVolumeNode);
	wetVolumeNode.connect(destination);
}

export function scheduleCelebrationSound({ audioContext, destination, startTime, taskEffort, celebrationStreakStep }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	startTime: number,
	taskEffort: number,
	celebrationStreakStep: number,
}): { celebrationOutputNode: GainNode, celebrationSeconds: number } {
	const clampedTaskEffort = Math.min(1, Math.max(0, taskEffort));
	const keyShiftSemitones = RISING_KEY_SHIFTS_SEMITONES[celebrationStreakStep % RISING_KEY_SHIFTS_SEMITONES.length];
	const keyFrequencyMultiplier = 2 ** (keyShiftSemitones / SEMITONES_PER_OCTAVE);
	const instrumentsNode = audioContext.createGain();
	const celebrationOutputNode = audioContext.createGain();
	instrumentsNode.connect(celebrationOutputNode);
	connectReverbSend({
		audioContext,
		source: instrumentsNode,
		destination: celebrationOutputNode,
		taskEffort: clampedTaskEffort,
	});
	celebrationOutputNode.connect(destination);

	playTap({
		audioContext,
		destination: instrumentsNode,
		startTime,
	});
	const landingTime = playClimbAndGetLandingTime({
		audioContext,
		destination: instrumentsNode,
		startTime: startTime + CLIMB_START_DELAY_SECONDS,
		taskEffort: clampedTaskEffort,
		celebrationStreakStep,
		keyFrequencyMultiplier,
	});
	playLanding({
		audioContext,
		destination: instrumentsNode,
		landingTime,
		taskEffort: clampedTaskEffort,
		celebrationStreakStep,
		keyFrequencyMultiplier,
	});
	playSparkles({
		audioContext,
		destination: instrumentsNode,
		landingTime,
		taskEffort: clampedTaskEffort,
		keyFrequencyMultiplier,
	});

	const longestRingSecondsAfterLanding = Math.max(
		scaleByTaskEffort({ range: LANDING_NOTE_DECAY_SECONDS, taskEffort: clampedTaskEffort }),
		scaleByTaskEffort({ range: LANDING_CHORD_DECAY_SECONDS, taskEffort: clampedTaskEffort }),
		scaleByTaskEffort({ range: SPARKLE_LATEST_SECONDS_AFTER_LANDING, taskEffort: clampedTaskEffort }) + SPARKLE_NOTE_DECAY_SECONDS,
	);
	const celebrationSeconds = landingTime - startTime + longestRingSecondsAfterLanding + REVERB_PREDELAY_SECONDS + REVERB_SECONDS;
	return { celebrationOutputNode, celebrationSeconds };
}

export function playCelebrationSound({ taskEffort }: { taskEffort: number }): () => void {
	const audioOutput = getAudioOutput();
	if (!audioOutput) return () => {};

	const { audioContext, masterVolumeNode } = audioOutput;
	const { celebrationOutputNode, celebrationSeconds } = scheduleCelebrationSound({
		audioContext,
		destination: masterVolumeNode,
		startTime: audioContext.currentTime,
		taskEffort,
		celebrationStreakStep: advanceCelebrationStreak(),
	});

	const disconnectTimeoutID = setTimeout(() => celebrationOutputNode.disconnect(), celebrationSeconds * 1000);

	return function stopCelebrationSound() {
		clearTimeout(disconnectTimeoutID);
		const stopTime = audioContext.currentTime;
		celebrationOutputNode.gain.setValueAtTime(celebrationOutputNode.gain.value, stopTime);
		celebrationOutputNode.gain.linearRampToValueAtTime(0, stopTime + STOP_FADE_OUT_SECONDS);
		setTimeout(() => celebrationOutputNode.disconnect(), STOP_FADE_OUT_SECONDS * 1000 * 2);
	};
}

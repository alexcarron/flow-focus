import { getAudioOutput } from './getAudioOutput';
import { convertPentatonicDegreeToFrequency, NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE } from './convertPentatonicDegreeToFrequency';
import { playTone, type Overtone } from './playTone';

const PENTATONIC_DEGREES_FROM_TASK_START_TO_FINISH = [-5, -4, -3, -2, -1];
const LOWEST_STEP_COMPLETION_PENTATONIC_DEGREE = -5;
const STEP_COMPLETION_CLIMB_OCTAVES_BEFORE_REPEATING = 3;
const STEP_COMPLETION_STREAK_RESET_SECONDS = 1;
const STEP_COMPLETION_SOUND_VOLUME = 0.15;
const STEP_COMPLETION_SOUND_ATTACK_SECONDS = 0.003;
const STEP_COMPLETION_SOUND_DECAY_SECONDS = 0.14;
const STEP_COMPLETION_SOUND_STARTING_PITCH_MULTIPLIER = 1.02;
const STEP_COMPLETION_SOUND_OVERTONES: Overtone[] = [
	{ frequencyMultiplier: 1, volumeMultiplier: 1, decayMultiplier: 1 },
	{ frequencyMultiplier: 4.2, volumeMultiplier: 0.04, decayMultiplier: 0.15 },
];
const SHEPARD_TONE_CLIMB_REPEAT_OFFSETS = [-1, 0, 1];
const SHEPARD_TONE_LOUDEST_FREQUENCY_HERTZ = 680;
const SHEPARD_TONE_OCTAVE_SPREAD = 0.7;
const SHEPARD_TONE_QUIETEST_LAYER_VOLUME_MULTIPLIER = 0.02;
const MINIMUM_SECONDS_BETWEEN_STEP_COMPLETION_SOUNDS = 0.035;
const RAPID_STEP_COMPLETION_WINDOW_SECONDS = 0.35;
const RAPID_REPEAT_VOLUME_MULTIPLIER = 0.8;
const QUIETEST_RAPID_REPEAT_VOLUME_MULTIPLIER = 0.45;
const HUMANIZED_VOLUME_MULTIPLIER_RANGE = { minimum: 0.94, maximum: 1.06 };

let lastStepCompletionSoundSeconds = -Infinity;
let rapidRepeatVolumeMultiplier = 1;
let lastStepCompletionPentatonicDegree = LOWEST_STEP_COMPLETION_PENTATONIC_DEGREE;

function convertTaskProgressToPentatonicDegree(taskProgress: number): number {
	const pentatonicDegreeIndex = Math.min(
		PENTATONIC_DEGREES_FROM_TASK_START_TO_FINISH.length - 1,
		Math.floor(Math.max(0, taskProgress) * PENTATONIC_DEGREES_FROM_TASK_START_TO_FINISH.length),
	);
	return PENTATONIC_DEGREES_FROM_TASK_START_TO_FINISH[pentatonicDegreeIndex];
}

function getStepCompletionPentatonicDegree({ taskProgress, isStepCompletionStreakContinuing }: {
	taskProgress: number,
	isStepCompletionStreakContinuing: boolean,
}): number {
	const taskProgressPentatonicDegree = convertTaskProgressToPentatonicDegree(taskProgress);
	if (!isStepCompletionStreakContinuing) return taskProgressPentatonicDegree;

	return Math.max(taskProgressPentatonicDegree, lastStepCompletionPentatonicDegree + 1);
}

function getShepardToneLayers(pentatonicDegree: number): { frequency: number, volumeMultiplier: number }[] {
	const climbNoteCountBeforeRepeating = NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE * STEP_COMPLETION_CLIMB_OCTAVES_BEFORE_REPEATING;
	const notesAboveLowest = pentatonicDegree - LOWEST_STEP_COMPLETION_PENTATONIC_DEGREE;
	const positionWithinClimb = ((notesAboveLowest % climbNoteCountBeforeRepeating) + climbNoteCountBeforeRepeating) % climbNoteCountBeforeRepeating;
	const baseFrequency = convertPentatonicDegreeToFrequency(LOWEST_STEP_COMPLETION_PENTATONIC_DEGREE + positionWithinClimb);
	const layers = SHEPARD_TONE_CLIMB_REPEAT_OFFSETS.map(climbRepeatOffset => {
		const frequency = baseFrequency * 2 ** (climbRepeatOffset * STEP_COMPLETION_CLIMB_OCTAVES_BEFORE_REPEATING);
		const octavesFromLoudestFrequency = Math.log2(frequency / SHEPARD_TONE_LOUDEST_FREQUENCY_HERTZ) / SHEPARD_TONE_OCTAVE_SPREAD;
		return { frequency, volumeMultiplier: Math.exp(-0.5 * octavesFromLoudestFrequency ** 2) };
	});
	const totalLoudness = Math.hypot(...layers.map(layer => layer.volumeMultiplier));
	return layers
		.map(layer => ({ frequency: layer.frequency, volumeMultiplier: layer.volumeMultiplier / totalLoudness }))
		.filter(layer => layer.volumeMultiplier >= SHEPARD_TONE_QUIETEST_LAYER_VOLUME_MULTIPLIER);
}

export function scheduleStepCompletionSound({ audioContext, destination, startTime, pentatonicDegree, volumeMultiplier }: {
	audioContext: BaseAudioContext,
	destination: AudioNode,
	startTime: number,
	pentatonicDegree: number,
	volumeMultiplier: number,
}) {
	const { minimum, maximum } = HUMANIZED_VOLUME_MULTIPLIER_RANGE;
	const humanizedVolumeMultiplier = minimum + Math.random() * (maximum - minimum);

	for (const shepardToneLayer of getShepardToneLayers(pentatonicDegree)) {
		playTone({
			audioContext,
			destination,
			frequency: shepardToneLayer.frequency,
			startTime,
			peakVolume: STEP_COMPLETION_SOUND_VOLUME * shepardToneLayer.volumeMultiplier * volumeMultiplier * humanizedVolumeMultiplier,
			attackSeconds: STEP_COMPLETION_SOUND_ATTACK_SECONDS,
			decaySeconds: STEP_COMPLETION_SOUND_DECAY_SECONDS,
			overtones: STEP_COMPLETION_SOUND_OVERTONES,
			startingPitchMultiplier: STEP_COMPLETION_SOUND_STARTING_PITCH_MULTIPLIER,
		});
	}
}

export function playStepCompletionSound({ taskProgress }: { taskProgress: number }) {
	const audioOutput = getAudioOutput();
	if (!audioOutput) return;

	const { audioContext, masterVolumeNode } = audioOutput;
	const currentSeconds = performance.now() / 1000;
	const secondsSinceLastStepCompletionSound = currentSeconds - lastStepCompletionSoundSeconds;
	if (secondsSinceLastStepCompletionSound < MINIMUM_SECONDS_BETWEEN_STEP_COMPLETION_SOUNDS) return;

	if (secondsSinceLastStepCompletionSound < RAPID_STEP_COMPLETION_WINDOW_SECONDS) {
		rapidRepeatVolumeMultiplier = Math.max(QUIETEST_RAPID_REPEAT_VOLUME_MULTIPLIER, rapidRepeatVolumeMultiplier * RAPID_REPEAT_VOLUME_MULTIPLIER);
	}
	else {
		rapidRepeatVolumeMultiplier = 1;
	}

	const pentatonicDegree = getStepCompletionPentatonicDegree({
		taskProgress,
		isStepCompletionStreakContinuing: secondsSinceLastStepCompletionSound < STEP_COMPLETION_STREAK_RESET_SECONDS,
	});
	lastStepCompletionSoundSeconds = currentSeconds;
	lastStepCompletionPentatonicDegree = pentatonicDegree;

	scheduleStepCompletionSound({
		audioContext,
		destination: masterVolumeNode,
		startTime: audioContext.currentTime,
		pentatonicDegree,
		volumeMultiplier: rapidRepeatVolumeMultiplier,
	});
}

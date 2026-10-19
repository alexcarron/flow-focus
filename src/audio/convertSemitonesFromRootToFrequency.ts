const ROOT_FREQUENCY_HERTZ = 523.25;
const SEMITONES_PER_OCTAVE = 12;

export function convertSemitonesFromRootToFrequency(semitonesFromRoot: number): number {
	return ROOT_FREQUENCY_HERTZ * 2 ** (semitonesFromRoot / SEMITONES_PER_OCTAVE);
}

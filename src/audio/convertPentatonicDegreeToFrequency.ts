import { convertSemitonesFromRootToFrequency } from './convertSemitonesFromRootToFrequency';

const MAJOR_PENTATONIC_SEMITONES_FROM_ROOT = [0, 2, 4, 7, 9];
export const NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE = MAJOR_PENTATONIC_SEMITONES_FROM_ROOT.length;

export function convertPentatonicDegreeToFrequency(pentatonicDegree: number): number {
	const octave = Math.floor(pentatonicDegree / NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE);
	const degreeWithinOctave = pentatonicDegree - octave * NOTES_PER_OCTAVE_IN_PENTATONIC_SCALE;
	return convertSemitonesFromRootToFrequency(MAJOR_PENTATONIC_SEMITONES_FROM_ROOT[degreeWithinOctave] + octave * 12);
}

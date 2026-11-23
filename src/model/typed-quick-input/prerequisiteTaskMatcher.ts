import type { FindMatchesConfig, Matcher, RawMatch } from './typedQuickInputMatchers';

const AFTER_TRIGGER_REGEX = /\bafter\s+/gi;
const WORD_REGEX = /[^\s,]+/g;

type WordLocation = { startIndex: number; endIndex: number };

type PrerequisiteTaskCandidate = { id: string; description: string };

function normalizeName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function findConsecutiveWordsStartingAt({ input, startIndex }: { input: string; startIndex: number }): WordLocation[] {
	const words: WordLocation[] = [];
	const wordRegex = new RegExp(WORD_REGEX.source, 'g');
	wordRegex.lastIndex = startIndex;
	let previousWordEndIndex = startIndex;
	let wordMatch: RegExpExecArray | null;
	while ((wordMatch = wordRegex.exec(input)) !== null) {
		const textBetweenWords = input.slice(previousWordEndIndex, wordMatch.index);
		if (textBetweenWords.trim() !== '') break;
		const endIndex = wordMatch.index + wordMatch[0].length;
		words.push({ startIndex: wordMatch.index, endIndex });
		previousWordEndIndex = endIndex;
	}
	return words;
}

function doesTypedNameMatchStartOfTaskName({ typedName, taskName }: { typedName: string; taskName: string }): boolean {
	const firstWordOfTaskName = taskName.split(' ')[0];
	return taskName.startsWith(typedName) && typedName.length >= firstWordOfTaskName.length;
}

function findOnlyCandidateMatchingTypedName({ typedName, candidates }: { typedName: string; candidates: PrerequisiteTaskCandidate[] }): PrerequisiteTaskCandidate | 'none' | 'several' {
	const matchingCandidates = candidates.filter(candidate => doesTypedNameMatchStartOfTaskName({
		typedName,
		taskName: normalizeName(candidate.description),
	}));
	if (matchingCandidates.length === 0) return 'none';
	if (matchingCandidates.length === 1) return matchingCandidates[0];

	const exactlyNamedCandidates = matchingCandidates.filter(candidate => normalizeName(candidate.description) === typedName);
	if (exactlyNamedCandidates.length === 1) return exactlyNamedCandidates[0];
	return 'several';
}

function createPrerequisiteTaskMatch({ input, triggerStartIndex, nameEndIndex, prerequisiteTask }: {
	input: string;
	triggerStartIndex: number;
	nameEndIndex: number;
	prerequisiteTask: PrerequisiteTaskCandidate;
}): RawMatch {
	const prerequisiteTaskDescription = prerequisiteTask.description;
	return {
		field: 'prerequisiteTask',
		colorClass: 'prerequisiteTask',
		startIndex: triggerStartIndex,
		endIndex: nameEndIndex,
		matchedText: input.slice(triggerStartIndex, nameEndIndex),
		explanation: `Do after: ${prerequisiteTaskDescription}`,
		timing: {},
		prerequisiteTaskID: prerequisiteTask.id,
	};
}

export const prerequisiteTaskMatcher: Matcher = {
	field: 'prerequisiteTask',
	colorClass: 'prerequisiteTask',
	findMatches({ input, prerequisiteTaskCandidates, pinnedPrerequisiteTaskLocations }: FindMatchesConfig): RawMatch[] {
		if (prerequisiteTaskCandidates.length === 0) return [];

		const matches: RawMatch[] = [];
		const triggerRegex = new RegExp(AFTER_TRIGGER_REGEX.source, 'gi');
		let triggerMatch: RegExpExecArray | null;
		while ((triggerMatch = triggerRegex.exec(input)) !== null) {
			const nameStartIndex = triggerMatch.index + triggerMatch[0].length;

			const pinnedLocation = pinnedPrerequisiteTaskLocations.find(location =>
				location.startIndex === nameStartIndex &&
				input.slice(location.startIndex, location.endIndex) === location.matchedText
			);
			const pinnedPrerequisiteTask = prerequisiteTaskCandidates.find(candidate => candidate.id === pinnedLocation?.prerequisiteTaskID);
			if (pinnedLocation !== undefined && pinnedPrerequisiteTask !== undefined) {
				matches.push(createPrerequisiteTaskMatch({
					input,
					triggerStartIndex: triggerMatch.index,
					nameEndIndex: pinnedLocation.endIndex,
					prerequisiteTask: pinnedPrerequisiteTask,
				}));
				triggerRegex.lastIndex = pinnedLocation.endIndex;
				continue;
			}

			const words = findConsecutiveWordsStartingAt({ input, startIndex: nameStartIndex });
			for (let wordCount = words.length; wordCount > 0; wordCount--) {
				const nameEndIndex = words[wordCount - 1].endIndex;
				const typedName = normalizeName(input.slice(nameStartIndex, nameEndIndex));
				const matchingCandidate = findOnlyCandidateMatchingTypedName({
					typedName,
					candidates: prerequisiteTaskCandidates,
				});
				if (matchingCandidate === 'none') continue;
				if (matchingCandidate === 'several') break;

				matches.push(createPrerequisiteTaskMatch({
					input,
					triggerStartIndex: triggerMatch.index,
					nameEndIndex,
					prerequisiteTask: matchingCandidate,
				}));
				triggerRegex.lastIndex = nameEndIndex;
				break;
			}
		}
		return matches;
	},
};

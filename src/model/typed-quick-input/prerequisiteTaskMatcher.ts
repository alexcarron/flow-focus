import type { FindMatchesConfig, Matcher, RawMatch } from './typedQuickInputMatchers';

const AFTER_TRIGGER_REGEX = /\bafter\s+/gi;
const WORD_REGEX = /[^\s,]+/g;

type WordLocation = { startIndex: number; endIndex: number };

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

export const prerequisiteTaskMatcher: Matcher = {
	field: 'prerequisiteTask',
	colorClass: 'prerequisiteTask',
	findMatches({ input, prerequisiteTaskCandidates }: FindMatchesConfig): RawMatch[] {
		if (prerequisiteTaskCandidates.length === 0) return [];

		const matches: RawMatch[] = [];
		const triggerRegex = new RegExp(AFTER_TRIGGER_REGEX.source, 'gi');
		let triggerMatch: RegExpExecArray | null;
		while ((triggerMatch = triggerRegex.exec(input)) !== null) {
			const nameStartIndex = triggerMatch.index + triggerMatch[0].length;
			const words = findConsecutiveWordsStartingAt({ input, startIndex: nameStartIndex });

			for (let wordCount = words.length; wordCount > 0; wordCount--) {
				const nameEndIndex = words[wordCount - 1].endIndex;
				const typedName = normalizeName(input.slice(nameStartIndex, nameEndIndex));
				const matchingCandidates = prerequisiteTaskCandidates.filter(candidate => doesTypedNameMatchStartOfTaskName({
					typedName,
					taskName: normalizeName(candidate.description),
				}));
				if (matchingCandidates.length === 0) continue;
				if (matchingCandidates.length > 1) break;

				const prerequisiteTask = matchingCandidates[0];
				const prerequisiteTaskDescription = prerequisiteTask.description;
				matches.push({
					field: 'prerequisiteTask',
					colorClass: 'prerequisiteTask',
					startIndex: triggerMatch.index,
					endIndex: nameEndIndex,
					matchedText: input.slice(triggerMatch.index, nameEndIndex),
					explanation: `After: ${prerequisiteTaskDescription}`,
					timing: {},
					prerequisiteTaskID: prerequisiteTask.id,
				});
				triggerRegex.lastIndex = nameEndIndex;
				break;
			}
		}
		return matches;
	},
};

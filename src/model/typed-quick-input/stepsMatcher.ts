import type { Matcher, RawMatch } from './typedQuickInputMatchers';

const COLON_OPTIONAL_TRIGGER_PHRASES = ['the steps are', 'steps are'];
const COLON_REQUIRED_TRIGGER_PHRASES = ['with steps', 'steps', 'step'];

const allTriggerPhrasesLongestFirst = [...COLON_OPTIONAL_TRIGGER_PHRASES, ...COLON_REQUIRED_TRIGGER_PHRASES]
	.sort((left, right) => right.length - left.length);

const TRIGGER_PHRASE_REGEX = new RegExp(`\\b(${allTriggerPhrasesLongestFirst.join('|')})\\b`, 'gi');
const LEADING_COLON_REGEX = /^\s*:\s*/;
const LEADING_WHITESPACE_REGEX = /^\s*/;
const LEADING_CONJUNCTION_REGEX = /^(and|or)\s+/i;
const STANDALONE_THEN_REGEX = /\bthen\b/i;
const STANDALONE_BY_REGEX = /\bby\b/i;

const HOW_TO_USE_EXPLANATION = 'Type steps: step one, step two to list steps (or separate them with "then")';

function stripLeadingConjunction(text: string): string {
	return text.replace(LEADING_CONJUNCTION_REGEX, '').trim();
}

function splitStepListText(text: string): string[] {
	let rawItems: string[];
	if (text.includes(';')) {
		rawItems = text.split(';');
	} else if (STANDALONE_THEN_REGEX.test(text)) {
		rawItems = text.split(STANDALONE_THEN_REGEX);
	} else {
		rawItems = text.split(',');
	}

	return rawItems
		.map(item => stripLeadingConjunction(item.trim()))
		.filter(item => item.length > 0);
}

function buildStepsMatch(config: { startIndex: number; endIndex: number; input: string; steps: string[] }): RawMatch {
	return {
		field: 'steps',
		colorClass: 'steps',
		startIndex: config.startIndex,
		endIndex: config.endIndex,
		matchedText: config.input.slice(config.startIndex, config.endIndex),
		explanation: `Steps: ${config.steps.join(', ')}`,
		timing: {},
		stepsList: config.steps,
	};
}

function buildIncompleteTriggerMatch(config: { startIndex: number; endIndex: number; input: string }): RawMatch {
	return {
		field: 'steps',
		colorClass: 'steps',
		startIndex: config.startIndex,
		endIndex: config.endIndex,
		matchedText: config.input.slice(config.startIndex, config.endIndex),
		explanation: HOW_TO_USE_EXPLANATION,
		timing: {},
		keepInName: true,
	};
}

function findTriggerPhraseMatches(input: string): RawMatch[] {
	const matches: RawMatch[] = [];

	let triggerMatch: RegExpExecArray | null;
	while ((triggerMatch = TRIGGER_PHRASE_REGEX.exec(input)) !== null) {
		const triggerPhrase = triggerMatch[1].toLowerCase();
		const isColonOptional = COLON_OPTIONAL_TRIGGER_PHRASES.includes(triggerPhrase);
		const triggerEnd = triggerMatch.index + triggerMatch[0].length;
		const afterTrigger = input.slice(triggerEnd);

		const colonMatch = LEADING_COLON_REGEX.exec(afterTrigger);
		let contentStart: number;
		if (colonMatch) {
			contentStart = triggerEnd + colonMatch[0].length;
		} else if (isColonOptional) {
			contentStart = triggerEnd + (LEADING_WHITESPACE_REGEX.exec(afterTrigger)?.[0].length ?? 0);
		} else {
			matches.push(buildIncompleteTriggerMatch({ startIndex: triggerMatch.index, endIndex: triggerEnd, input }));
			continue;
		}

		const remainder = input.slice(contentStart);
		const steps = splitStepListText(remainder);
		if (steps.length === 0) {
			matches.push(buildIncompleteTriggerMatch({ startIndex: triggerMatch.index, endIndex: contentStart, input }));
			continue;
		}

		matches.push(buildStepsMatch({ startIndex: triggerMatch.index, endIndex: input.length, input, steps }));
	}

	return matches;
}

function findBareThenChainMatch(input: string): RawMatch | null {
	const firstThenMatch = STANDALONE_THEN_REGEX.exec(input);
	if (!firstThenMatch) return null;

	const remainderStart = firstThenMatch.index + firstThenMatch[0].length;
	const steps = splitStepListText(input.slice(remainderStart));
	if (steps.length === 0) return null;

	return buildStepsMatch({ startIndex: firstThenMatch.index, endIndex: input.length, input, steps });
}

function findByThenChainMatch(input: string): RawMatch | null {
	const byMatch = STANDALONE_BY_REGEX.exec(input);
	if (!byMatch) return null;

	const remainderStart = byMatch.index + byMatch[0].length;
	const remainder = input.slice(remainderStart);
	if (!STANDALONE_THEN_REGEX.test(remainder)) return null;

	const steps = splitStepListText(remainder);
	if (steps.length === 0) return null;

	return buildStepsMatch({ startIndex: byMatch.index, endIndex: input.length, input, steps });
}

export const stepsMatcher: Matcher = {
	field: 'steps',
	colorClass: 'steps',
	findMatches({ input }) {
		const matches = findTriggerPhraseMatches(input);
		const byThenChainMatch = findByThenChainMatch(input);
		if (byThenChainMatch) matches.push(byThenChainMatch);

		const bareThenChainMatch = findBareThenChainMatch(input);
		if (bareThenChainMatch) matches.push(bareThenChainMatch);

		return matches;
	},
};

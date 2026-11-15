import Tag from '../tag/Tag';
import TaskTimingOptions from '../task/TaskTimingOptions';
import Time from '../time-management/Time';
import { timeUnits, TimeUnitName } from '../time-management/StandardTimeUnit';
import parseDatePhrase from './parseDatePhrase';
import { parseDurationRange, parseSingleDuration } from './parseDurationPhrase';
import { repeatMatcher } from './repeatMatcher';
import { stepsMatcher } from './stepsMatcher';
import { tagMatcher } from './tagMatcher';
import { EscapedTokenLocation, isTokenEscapedByAnyLocation, TypedQuickInputField } from './TypedQuickInputToken';

export type RawMatch = {
	field: TypedQuickInputField;
	colorClass: string;
	startIndex: number;
	endIndex: number;
	matchedText: string;
	explanation: string;
	timing: Partial<TaskTimingOptions>;
	stepsList?: string[];
	tagMatch?: { existingTagID: string | null; newTagName: string | null };
	keepInName?: boolean;
};

export type FindMatchesConfig = {
	input: string;
	now: Date;
	nightTime: Time;
	morningTime: Time;
	escapedTokenLocations: EscapedTokenLocation[];
	existingTags: Tag[];
};

export type Matcher = {
	field: TypedQuickInputField;
	colorClass: string;
	findMatches: (config: FindMatchesConfig) => RawMatch[];
};

export function getEndOfDayTimeOfDay(nightTime: Time): { hour: number; minute: number } {
	const isNightTimeBeforeEndOfDay = nightTime.getTotalMinutes() < 23 * 60 + 59;
	if (isNightTimeBeforeEndOfDay) return { hour: nightTime.getHour(), minute: nightTime.getMinute() };
	return { hour: 23, minute: 59 };
}

function getStartOfDayTimeOfDay(): { hour: number; minute: number } {
	return { hour: 0, minute: 0 };
}

function withTimeOfDay(date: Date, hour: number, minute: number): Date {
	const result = new Date(date);
	result.setHours(hour, minute, 0, 0);
	return result;
}

function formatDateForExplanation(date: Date, now: Date): string {
	const includeYear = date.getFullYear() !== now.getFullYear();
	const datePart = date.toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: includeYear ? 'numeric' : undefined,
	});

	const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
	if (isMidnight) return datePart;

	const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	return `${datePart}, ${timePart}`;
}

function formatDurationForExplanation(milliseconds: number): string {
	const orderedUnitNames = [
		TimeUnitName.Weeks, TimeUnitName.Days, TimeUnitName.Hours,
		TimeUnitName.Minutes, TimeUnitName.Seconds,
	];
	for (const unitName of orderedUnitNames) {
		const unitMilliseconds = timeUnits[unitName].milliseconds;
		if (milliseconds >= unitMilliseconds && milliseconds % unitMilliseconds === 0) {
			const amount = milliseconds / unitMilliseconds;
			const singularUnit = unitName.replace(/s$/, '');
			return `${amount} ${amount === 1 ? singularUnit : unitName}`;
		}
	}
	return `${Math.round(milliseconds / timeUnits[TimeUnitName.Minutes].milliseconds)} minutes`;
}

function toPhraseAlternation(phrases: string[]): string {
	return [...phrases]
		.sort((left, right) => right.length - left.length)
		.map(phrase => phrase.replace(/'/g, "['’]").replace(/ /g, '\\s+'))
		.join('|');
}

type DateField = 'dueDate' | 'targetDate' | 'startDate';

const POSSESSIVE_SUFFIX_REGEX = /^['’]s\b/;

function isFollowedByPossessiveSuffix(input: string, endIndex: number): boolean {
	return POSSESSIVE_SUFFIX_REGEX.test(input.slice(endIndex));
}

const dateFieldToExplanationLabel: Record<DateField, string> = {
	dueDate: 'Due',
	targetDate: 'Ideally',
	startDate: 'Starts',
};

function findDatesAfterTriggerPhrases(parameters: {
	config: FindMatchesConfig;
	field: DateField;
	triggerAlternation: string;
	getDefaultTimeOfDay: (nightTime: Time) => { hour: number; minute: number };
	shouldIgnoreDatesBeforeNow: boolean;
}): RawMatch[] {
	const { input, now, nightTime, morningTime } = parameters.config;
	const matches: RawMatch[] = [];
	const triggerRegex = new RegExp(`\\b(${parameters.triggerAlternation})\\s+`, 'gi');
	let triggerMatch: RegExpExecArray | null;
	while ((triggerMatch = triggerRegex.exec(input)) !== null) {
		const argumentStart = triggerMatch.index + triggerMatch[0].length;
		const parsed = parseDatePhrase({ text: input.slice(argumentStart), now, nightTime, morningTime });
		if (!parsed) continue;

		const timeOfDay = parsed.timeOfDay ?? parameters.getDefaultTimeOfDay(nightTime);
		const date = withTimeOfDay(parsed.date, timeOfDay.hour, timeOfDay.minute);
		const endIndex = argumentStart + parsed.matchedLength;
		const isDateBeforeNow = date.getTime() < now.getTime();
		if (isFollowedByPossessiveSuffix(input, endIndex)) continue;
		if (parameters.shouldIgnoreDatesBeforeNow && isDateBeforeNow) continue;

		const explanationLabel = dateFieldToExplanationLabel[parameters.field];
		const formattedDate = formatDateForExplanation(date, now);
		matches.push({
			field: parameters.field,
			colorClass: parameters.field,
			startIndex: triggerMatch.index,
			endIndex,
			matchedText: input.slice(triggerMatch.index, endIndex),
			explanation: `${explanationLabel} ${formattedDate}`,
			timing: { [parameters.field]: date },
		});
		triggerRegex.lastIndex = endIndex;
	}
	return matches;
}

function makeDateMatcher(config: {
	field: DateField;
	triggerPhrases: string[];
	getDefaultTimeOfDay: (nightTime: Time) => { hour: number; minute: number };
	shouldIgnoreDatesBeforeNow: boolean;
}): Matcher {
	return {
		field: config.field,
		colorClass: config.field,
		findMatches(findMatchesConfig) {
			return findDatesAfterTriggerPhrases({
				config: findMatchesConfig,
				field: config.field,
				triggerAlternation: toPhraseAlternation(config.triggerPhrases),
				getDefaultTimeOfDay: config.getDefaultTimeOfDay,
				shouldIgnoreDatesBeforeNow: config.shouldIgnoreDatesBeforeNow,
			});
		},
	};
}

const dueDateTriggerPhrases = [
	'due',
	'deadline',
	'must be done by',
	'has to be done by',
	'have to be done by',
	'no later than',
	"can't finish after",
	"can't do after",
	'cant finish after',
	'cant do after',
	'cannot finish after',
	'cannot do after',
	'can not finish after',
	'can not do after',
];
const targetDateTriggerPhrases = ['want to finish by', 'aim for', 'aim to finish by', 'ideally by'];
const byTriggerPhrase = 'by';
const startDateTriggerPhrases = ['starts', 'start', 'starting', 'from', 'after', 'not before'];

const dueDateMatcher = makeDateMatcher({
	field: 'dueDate',
	triggerPhrases: dueDateTriggerPhrases,
	getDefaultTimeOfDay: getEndOfDayTimeOfDay,
	shouldIgnoreDatesBeforeNow: false,
});

const targetDateMatcher = makeDateMatcher({
	field: 'targetDate',
	triggerPhrases: targetDateTriggerPhrases,
	getDefaultTimeOfDay: getEndOfDayTimeOfDay,
	shouldIgnoreDatesBeforeNow: false,
});

const startDateMatcher = makeDateMatcher({
	field: 'startDate',
	triggerPhrases: startDateTriggerPhrases,
	getDefaultTimeOfDay: getStartOfDayTimeOfDay,
	shouldIgnoreDatesBeforeNow: true,
});

const DUE_DATE_LEAD_IN_REGEX = /^\s*((?:i\s+)?(?:have|has)\s+to)\s+/i;
const TARGET_DATE_LEAD_IN_REGEX = /^\s*((?:i\s+)?(?:want|try)\s+to)\s+/i;

function findLeadInThatDecidesByDate(input: string): RawMatch | null {
	const leadInRegexes: Array<{ regex: RegExp; field: DateField }> = [
		{ regex: DUE_DATE_LEAD_IN_REGEX, field: 'dueDate' },
		{ regex: TARGET_DATE_LEAD_IN_REGEX, field: 'targetDate' },
	];
	for (const { regex, field } of leadInRegexes) {
		const leadInMatch = regex.exec(input);
		if (!leadInMatch) continue;

		const startIndex = leadInMatch.index + leadInMatch[0].indexOf(leadInMatch[1]);
		const endIndex = startIndex + leadInMatch[1].length;
		const dateKind = field === 'dueDate' ? 'due date' : 'target date';
		return {
			field,
			colorClass: field,
			startIndex,
			endIndex,
			matchedText: leadInMatch[1],
			explanation: `Makes "by" set a ${dateKind}`,
			timing: {},
		};
	}
	return null;
}

const byDateMatcher: Matcher = {
	field: 'targetDate',
	colorClass: 'targetDate',
	findMatches(config) {
		const leadIn = findLeadInThatDecidesByDate(config.input);
		const isLeadInEscaped = leadIn !== null && isTokenEscapedByAnyLocation(leadIn, config.escapedTokenLocations);
		let byDateField: DateField = 'targetDate';
		if (leadIn !== null && !isLeadInEscaped) {
			byDateField = leadIn.field as DateField;
		}

		const byDateMatches = findDatesAfterTriggerPhrases({
			config,
			field: byDateField,
			triggerAlternation: toPhraseAlternation([byTriggerPhrase]),
			getDefaultTimeOfDay: getEndOfDayTimeOfDay,
			shouldIgnoreDatesBeforeNow: false,
		});
		if (leadIn === null || byDateMatches.length === 0) return byDateMatches;
		return [leadIn, ...byDateMatches];
	},
};

type BareDateCandidate = {
	startIndex: number;
	endIndex: number;
	matchedText: string;
	date: Date;
};

function findBareDateCandidates(config: FindMatchesConfig): BareDateCandidate[] {
	const { input, now, nightTime, morningTime } = config;
	const candidates: BareDateCandidate[] = [];
	const wordStartRegex = /\S+/g;
	let wordStart: RegExpExecArray | null;
	while ((wordStart = wordStartRegex.exec(input)) !== null) {
		const startIndex = wordStart.index;
		const parsed = parseDatePhrase({ text: input.slice(startIndex), now, nightTime, morningTime });
		if (!parsed) continue;

		const endIndex = startIndex + parsed.matchedLength;
		if (isFollowedByPossessiveSuffix(input, endIndex)) {
			wordStartRegex.lastIndex = endIndex;
			continue;
		}

		const timeOfDay = parsed.timeOfDay ?? getEndOfDayTimeOfDay(nightTime);
		const date = withTimeOfDay(parsed.date, timeOfDay.hour, timeOfDay.minute);
		candidates.push({ startIndex, endIndex, matchedText: input.slice(startIndex, endIndex), date });
		wordStartRegex.lastIndex = endIndex;
	}
	return candidates;
}

const impliedTargetDateMatcher: Matcher = {
	field: 'targetDate',
	colorClass: 'targetDate',
	findMatches(config) {
		const isCandidateEscaped = (candidate: BareDateCandidate) => isTokenEscapedByAnyLocation(
			{
				field: 'targetDate',
				matchedText: candidate.matchedText,
				startIndex: candidate.startIndex,
				endIndex: candidate.endIndex,
			},
			config.escapedTokenLocations
		);

		const matchesThatAlreadyClaimDates = [
			repeatMatcher,
			dueDateMatcher,
			targetDateMatcher,
			byDateMatcher,
			startDateMatcher,
		].flatMap(matcher => matcher.findMatches(config));
		const isCandidateInsideMatchThatAlreadyClaimsDate = (candidate: BareDateCandidate) => matchesThatAlreadyClaimDates.some(match =>
			candidate.startIndex < match.endIndex && match.startIndex < candidate.endIndex
		);

		const candidates = findBareDateCandidates(config)
			.filter(candidate => !isCandidateInsideMatchThatAlreadyClaimsDate(candidate))
			.sort((left, right) => left.startIndex - right.startIndex);
		if (candidates.length === 0) return [];

		const winner = candidates.find(candidate => !isCandidateEscaped(candidate));

		return candidates.map((candidate): RawMatch => {
			if (candidate === winner) {
				const formattedDate = formatDateForExplanation(candidate.date, config.now);
				return {
					field: 'targetDate',
					colorClass: 'targetDate',
					startIndex: candidate.startIndex,
					endIndex: candidate.endIndex,
					matchedText: candidate.matchedText,
					explanation: `Ideally ${formattedDate}`,
					timing: { targetDate: candidate.date },
				};
			}

			let explanation = 'Ignored, not used as a target date';
			if (winner) {
				explanation = `Ignored, "${winner.matchedText}" is the earlier target date`;
			}
			return {
				field: 'ignoredDate',
				colorClass: 'ignoredDate',
				startIndex: candidate.startIndex,
				endIndex: candidate.endIndex,
				matchedText: candidate.matchedText,
				explanation,
				timing: {},
				keepInName: true,
			};
		});
	},
};

function buildDurationMatch(config: {
	startIndex: number;
	endIndex: number;
	input: string;
	minimumMilliseconds: number;
	maximumMilliseconds: number;
}): RawMatch {
	const explanation = config.minimumMilliseconds === config.maximumMilliseconds
		? `Takes about ${formatDurationForExplanation(config.minimumMilliseconds)}`
		: `Takes ${formatDurationForExplanation(config.minimumMilliseconds)} to ${formatDurationForExplanation(config.maximumMilliseconds)}`;
	return {
		field: 'duration',
		colorClass: 'duration',
		startIndex: config.startIndex,
		endIndex: config.endIndex,
		matchedText: config.input.slice(config.startIndex, config.endIndex),
		explanation,
		timing: {
			minDuration: config.minimumMilliseconds,
			maxDuration: config.maximumMilliseconds,
		},
	};
}

const durationMatcher: Matcher = {
	field: 'duration',
	colorClass: 'duration',
	findMatches({ input }) {
		const matches: RawMatch[] = [];

		const parentheticalRegex = /\(([^()]+)\)/g;
		let parentheticalMatch: RegExpExecArray | null;
		while ((parentheticalMatch = parentheticalRegex.exec(input)) !== null) {
			const inner = parentheticalMatch[1];
			const range = parseDurationRange(inner);
			if (range) {
				matches.push(buildDurationMatch({
					startIndex: parentheticalMatch.index,
					endIndex: parentheticalMatch.index + parentheticalMatch[0].length,
					input,
					minimumMilliseconds: range.minimumMilliseconds,
					maximumMilliseconds: range.maximumMilliseconds,
				}));
				continue;
			}
			const single = parseSingleDuration(inner);
			if (single) {
				matches.push(buildDurationMatch({
					startIndex: parentheticalMatch.index,
					endIndex: parentheticalMatch.index + parentheticalMatch[0].length,
					input,
					minimumMilliseconds: single.milliseconds,
					maximumMilliseconds: single.milliseconds,
				}));
			}
		}

		const takesRegex = /\btakes?\s+/gi;
		let takesMatch: RegExpExecArray | null;
		while ((takesMatch = takesRegex.exec(input)) !== null) {
			const argumentStart = takesMatch.index + takesMatch[0].length;
			const remainder = input.slice(argumentStart);

			const range = parseDurationRange(remainder);
			if (range) {
				const endIndex = argumentStart + range.matchedLength;
				matches.push(buildDurationMatch({
					startIndex: takesMatch.index,
					endIndex,
					input,
					minimumMilliseconds: range.minimumMilliseconds,
					maximumMilliseconds: range.maximumMilliseconds,
				}));
				takesRegex.lastIndex = endIndex;
				continue;
			}

			const single = parseSingleDuration(remainder);
			if (single) {
				const endIndex = argumentStart + single.matchedLength;
				matches.push(buildDurationMatch({
					startIndex: takesMatch.index,
					endIndex,
					input,
					minimumMilliseconds: single.milliseconds,
					maximumMilliseconds: single.milliseconds,
				}));
				takesRegex.lastIndex = endIndex;
			}
		}

		return matches;
	},
};

export const typedQuickInputMatchers: Matcher[] = [
	dueDateMatcher,
	targetDateMatcher,
	byDateMatcher,
	startDateMatcher,
	repeatMatcher,
	durationMatcher,
	stepsMatcher,
	tagMatcher,
	impliedTargetDateMatcher,
];

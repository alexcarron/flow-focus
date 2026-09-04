import TaskTimingOptions from '../task/TaskTimingOptions';
import Time from '../time-management/Time';
import { timeUnits, TimeUnitName } from '../time-management/StandardTimeUnit';
import Weekday from '../time-management/Weekday';
import parseDatePhrase, { nextDateForWeekday } from './parseDatePhrase';
import { parseDurationRange, parseSingleDuration } from './parseDurationPhrase';
import { stepsMatcher } from './stepsMatcher';
import { TypedQuickInputField } from './TypedQuickInputToken';

export type RawMatch = {
	field: TypedQuickInputField;
	colorClass: string;
	startIndex: number;
	endIndex: number;
	matchedText: string;
	explanation: string;
	timing: Partial<TaskTimingOptions>;
	stepsList?: string[];
	keepInName?: boolean;
};

export type FindMatchesConfig = {
	input: string;
	now: Date;
	nightTime: Time;
	morningTime: Time;
};

export type Matcher = {
	field: TypedQuickInputField;
	colorClass: string;
	findMatches: (config: FindMatchesConfig) => RawMatch[];
};

function getEndOfDayTimeOfDay(nightTime: Time): { hour: number; minute: number } {
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

function makeDateMatcher(config: {
	field: TypedQuickInputField;
	colorClass: string;
	triggerAlternation: string;
	getDefaultTimeOfDay: (nightTime: Time) => { hour: number; minute: number };
	explanationLabel: string;
}): Matcher {
	return {
		field: config.field,
		colorClass: config.colorClass,
		findMatches({ input, now, nightTime, morningTime }) {
			const matches: RawMatch[] = [];
			const triggerRegex = new RegExp(`\\b(${config.triggerAlternation})\\s+`, 'gi');
			let triggerMatch: RegExpExecArray | null;
			while ((triggerMatch = triggerRegex.exec(input)) !== null) {
				const argumentStart = triggerMatch.index + triggerMatch[0].length;
				const parsed = parseDatePhrase({ text: input.slice(argumentStart), now, nightTime, morningTime });
				if (!parsed) continue;

				const timeOfDay = parsed.timeOfDay ?? config.getDefaultTimeOfDay(nightTime);
				const date = withTimeOfDay(parsed.date, timeOfDay.hour, timeOfDay.minute);
				const endIndex = argumentStart + parsed.matchedLength;
				matches.push({
					field: config.field,
					colorClass: config.colorClass,
					startIndex: triggerMatch.index,
					endIndex,
					matchedText: input.slice(triggerMatch.index, endIndex),
					explanation: `${config.explanationLabel} ${formatDateForExplanation(date, now)}`,
					timing: { [config.field]: date },
				});
				triggerRegex.lastIndex = endIndex;
			}
			return matches;
		},
	};
}

const deadlineMatcher = makeDateMatcher({
	field: 'deadline',
	colorClass: 'deadline',
	triggerAlternation: 'due|deadline',
	getDefaultTimeOfDay: getEndOfDayTimeOfDay,
	explanationLabel: 'Due',
});

const startTimeMatcher = makeDateMatcher({
	field: 'startTime',
	colorClass: 'start',
	triggerAlternation: 'starts|start|starting',
	getDefaultTimeOfDay: getStartOfDayTimeOfDay,
	explanationLabel: 'Starts',
});

const endTimeMatcher = makeDateMatcher({
	field: 'endTime',
	colorClass: 'end',
	triggerAlternation: 'ends|end|ending|until',
	getDefaultTimeOfDay: getEndOfDayTimeOfDay,
	explanationLabel: 'Ends',
});

const POSSESSIVE_SUFFIX_REGEX = /^['’]s\b/;

function isFollowedByPossessiveSuffix(input: string, endIndex: number): boolean {
	return POSSESSIVE_SUFFIX_REGEX.test(input.slice(endIndex));
}

const dateTriggerWords = ['due', 'deadline', 'starts', 'start', 'starting', 'ends', 'end', 'ending', 'until', 'every'];
const dateTriggerWordAlternation = dateTriggerWords.sort((left, right) => right.length - left.length).join('|');
const PRECEDING_DATE_TRIGGER_WORD_REGEX = new RegExp(`\\\\?(${dateTriggerWordAlternation})\\s+$`, 'i');

function isImmediatelyPrecededByDateTriggerWord(input: string, startIndex: number): boolean {
	return PRECEDING_DATE_TRIGGER_WORD_REGEX.test(input.slice(0, startIndex));
}

type BareDateCandidate = {
	startIndex: number;
	endIndex: number;
	matchedText: string;
	date: Date;
};

const TRAILING_WHITESPACE_AND_PUNCTUATION_REGEX = /[\s.!?,]*$/;

function getEffectiveEndOfInput(input: string): number {
	const match = TRAILING_WHITESPACE_AND_PUNCTUATION_REGEX.exec(input);
	return match ? match.index : input.length;
}

function findBareDateCandidates(config: FindMatchesConfig): BareDateCandidate[] {
	const { input, now, nightTime, morningTime } = config;
	const candidates: BareDateCandidate[] = [];
	const effectiveEndOfInput = getEffectiveEndOfInput(input);
	const wordStartRegex = /\S+/g;
	let wordStart: RegExpExecArray | null;
	while ((wordStart = wordStartRegex.exec(input)) !== null) {
		const startIndex = wordStart.index;
		if (isImmediatelyPrecededByDateTriggerWord(input, startIndex)) continue;

		const fullWordParsed = parseDatePhrase({ text: input.slice(startIndex), now, nightTime, morningTime, restrictToFullWords: true });
		const abbreviatedParsed = fullWordParsed
			? null
			: parseDatePhrase({ text: input.slice(startIndex), now, nightTime, morningTime, restrictToFullWords: false });
		const parsed = fullWordParsed ?? abbreviatedParsed;
		if (!parsed) continue;

		const endIndex = startIndex + parsed.matchedLength;
		const isAbbreviatedMatchNotAtEndOfInput = !fullWordParsed && endIndex < effectiveEndOfInput;
		if (isAbbreviatedMatchNotAtEndOfInput) {
			wordStartRegex.lastIndex = endIndex;
			continue;
		}

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

const impliedDueDateMatcher: Matcher = {
	field: 'deadline',
	colorClass: 'deadline',
	findMatches(config) {
		const candidates = findBareDateCandidates(config);
		if (candidates.length === 0) return [];

		const [winner, ...ignored] = [...candidates].sort((left, right) => left.startIndex - right.startIndex);

		const matches: RawMatch[] = [{
			field: 'deadline',
			colorClass: 'deadline',
			startIndex: winner.startIndex,
			endIndex: winner.endIndex,
			matchedText: winner.matchedText,
			explanation: `Due ${formatDateForExplanation(winner.date, config.now)}`,
			timing: { deadline: winner.date },
		}];

		for (const candidate of ignored) {
			matches.push({
				field: 'ignoredDate',
				colorClass: 'ignoredDate',
				startIndex: candidate.startIndex,
				endIndex: candidate.endIndex,
				matchedText: candidate.matchedText,
				explanation: `Ignored, "${winner.matchedText}" is the earlier due date`,
				timing: {},
				keepInName: true,
			});
		}

		return matches;
	},
};

const weekdayNameToWeekday: Record<string, Weekday> = {
	monday: Weekday.MONDAY, mon: Weekday.MONDAY,
	tuesday: Weekday.TUESDAY, tues: Weekday.TUESDAY, tue: Weekday.TUESDAY,
	wednesday: Weekday.WEDNESDAY, wed: Weekday.WEDNESDAY,
	thursday: Weekday.THURSDAY, thurs: Weekday.THURSDAY, thur: Weekday.THURSDAY, thu: Weekday.THURSDAY,
	friday: Weekday.FRIDAY, fri: Weekday.FRIDAY,
	saturday: Weekday.SATURDAY, sat: Weekday.SATURDAY,
	sunday: Weekday.SUNDAY, sun: Weekday.SUNDAY,
};

const weekdayAlternation = Object.keys(weekdayNameToWeekday)
	.sort((left, right) => right.length - left.length)
	.join('|');

const repeatUnitWordToMilliseconds: Record<string, number> = {
	day: timeUnits[TimeUnitName.Days].milliseconds, days: timeUnits[TimeUnitName.Days].milliseconds,
	week: timeUnits[TimeUnitName.Weeks].milliseconds, weeks: timeUnits[TimeUnitName.Weeks].milliseconds,
	month: timeUnits[TimeUnitName.Months].milliseconds, months: timeUnits[TimeUnitName.Months].milliseconds,
	year: timeUnits[TimeUnitName.Years].milliseconds, years: timeUnits[TimeUnitName.Years].milliseconds,
};

const repeatUnitAlternation = Object.keys(repeatUnitWordToMilliseconds)
	.sort((left, right) => right.length - left.length)
	.join('|');

const namedRepeatWordToMilliseconds: Record<string, number> = {
	everyday: timeUnits[TimeUnitName.Days].milliseconds,
	daily: timeUnits[TimeUnitName.Days].milliseconds,
	weekly: timeUnits[TimeUnitName.Weeks].milliseconds,
	monthly: timeUnits[TimeUnitName.Months].milliseconds,
	yearly: timeUnits[TimeUnitName.Years].milliseconds,
	annually: timeUnits[TimeUnitName.Years].milliseconds,
};

function buildRepeatMatch(config: {
	startIndex: number;
	endIndex: number;
	input: string;
	intervalMilliseconds: number;
	explanation: string;
	startTime?: Date;
}): RawMatch {
	const timing: Partial<TaskTimingOptions> = { repeatInterval: config.intervalMilliseconds };
	if (config.startTime) timing.startTime = config.startTime;
	return {
		field: 'repeatInterval',
		colorClass: 'repeat',
		startIndex: config.startIndex,
		endIndex: config.endIndex,
		matchedText: config.input.slice(config.startIndex, config.endIndex),
		explanation: config.explanation,
		timing,
	};
}

const repeatMatcher: Matcher = {
	field: 'repeatInterval',
	colorClass: 'repeat',
	findMatches({ input, now }) {
		const matches: RawMatch[] = [];

		const namedRegex = new RegExp(`\\b(${Object.keys(namedRepeatWordToMilliseconds).join('|')}|every\\s+day)\\b`, 'gi');
		let namedMatch: RegExpExecArray | null;
		while ((namedMatch = namedRegex.exec(input)) !== null) {
			const word = namedMatch[1].toLowerCase().replace(/\s+/g, '');
			const intervalMilliseconds = word === 'everyday'
				? timeUnits[TimeUnitName.Days].milliseconds
				: namedRepeatWordToMilliseconds[word];
			const endIndex = namedMatch.index + namedMatch[0].length;
			matches.push(buildRepeatMatch({
				startIndex: namedMatch.index,
				endIndex,
				input,
				intervalMilliseconds,
				explanation: `Repeats every ${formatDurationForExplanation(intervalMilliseconds)}`,
			}));
		}

		const everyRegex = /\bevery\s+/gi;
		let everyMatch: RegExpExecArray | null;
		while ((everyMatch = everyRegex.exec(input)) !== null) {
			const argumentStart = everyMatch.index + everyMatch[0].length;
			const remainder = input.slice(argumentStart);

			const weekdayMatch = new RegExp(`^(${weekdayAlternation})\\b`, 'i').exec(remainder);
			if (weekdayMatch) {
				const weekday = weekdayNameToWeekday[weekdayMatch[1].toLowerCase()];
				const endIndex = argumentStart + weekdayMatch[0].length;
				matches.push(buildRepeatMatch({
					startIndex: everyMatch.index,
					endIndex,
					input,
					intervalMilliseconds: timeUnits[TimeUnitName.Weeks].milliseconds,
					explanation: `Repeats every week on ${weekdayMatch[1]}`,
					startTime: nextDateForWeekday(weekday, true, now),
				}));
				everyRegex.lastIndex = endIndex;
				continue;
			}

			const countUnitMatch = new RegExp(`^(?:(\\d+)\\s+)?(${repeatUnitAlternation})\\b`, 'i').exec(remainder);
			if (countUnitMatch) {
				const count = countUnitMatch[1] ? parseInt(countUnitMatch[1], 10) : 1;
				const unitMilliseconds = repeatUnitWordToMilliseconds[countUnitMatch[2].toLowerCase()];
				const intervalMilliseconds = count * unitMilliseconds;
				const endIndex = argumentStart + countUnitMatch[0].length;
				matches.push(buildRepeatMatch({
					startIndex: everyMatch.index,
					endIndex,
					input,
					intervalMilliseconds,
					explanation: `Repeats every ${formatDurationForExplanation(intervalMilliseconds)}`,
				}));
				everyRegex.lastIndex = endIndex;
			}
		}

		return matches;
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

function toWordAlternation(phrases: string[]): string {
	return phrases.sort((left, right) => right.length - left.length).join('|');
}

const mandatoryCoreWords = ['mandatory', 'required', 'obligatory', 'obligated', 'compulsory'];
const mandatoryPhrases = [...mandatoryCoreWords, 'must do', 'must be completed', 'needs to be completed', 'must be done'];
const optionalCoreWords = ['optional', 'voluntary', 'discretionary'];
const optionalPhrases = [
	...optionalCoreWords, 'may complete', 'do not have to complete', 'do not need to complete', 'does not need to be completed', 'does not have to completed',
];

type MandatoryRule = { regex: RegExp; isMandatory: boolean };

const mandatoryRules: MandatoryRule[] = [
	{ regex: new RegExp(`\\bnot\\s+(?:${toWordAlternation(mandatoryCoreWords)})\\b`, 'gi'), isMandatory: false },
	{ regex: new RegExp(`\\bnot\\s+(?:${toWordAlternation(optionalCoreWords)})\\b`, 'gi'), isMandatory: true },
	{ regex: new RegExp(`\\b(?:${toWordAlternation(mandatoryPhrases)})\\b`, 'gi'), isMandatory: true },
	{ regex: new RegExp(`\\b(?:${toWordAlternation(optionalPhrases)})\\b`, 'gi'), isMandatory: false },
];

const mandatoryMatcher: Matcher = {
	field: 'isMandatory',
	colorClass: 'mandatory',
	findMatches({ input }) {
		const matches: RawMatch[] = [];
		const claimedRanges: Array<{ start: number; end: number }> = [];

		for (const rule of mandatoryRules) {
			let match: RegExpExecArray | null;
			while ((match = rule.regex.exec(input)) !== null) {
				const startIndex = match.index;
				const endIndex = match.index + match[0].length;
				const overlapsClaimedRange = claimedRanges.some(range => startIndex < range.end && range.start < endIndex);
				if (overlapsClaimedRange) continue;

				claimedRanges.push({ start: startIndex, end: endIndex });
				matches.push({
					field: 'isMandatory',
					colorClass: 'mandatory',
					startIndex,
					endIndex,
					matchedText: match[0],
					explanation: rule.isMandatory ? 'Marked as mandatory' : 'Marked as optional',
					timing: { isMandatory: rule.isMandatory },
				});
			}
		}

		return matches;
	},
};

export const typedQuickInputMatchers: Matcher[] = [
	deadlineMatcher,
	startTimeMatcher,
	endTimeMatcher,
	repeatMatcher,
	durationMatcher,
	mandatoryMatcher,
	stepsMatcher,
	impliedDueDateMatcher,
];

import { DEFAULT_SETTINGS } from '../AppSettings';
import Tag from '../tag/Tag';
import TaskTimingOptions from '../task/TaskTimingOptions';
import { hasRecurrenceWeekdays } from '../task/recurrence/RecurrenceDuration';
import { getDefaultTargetDateOfWeekdayRepeat } from '../task/recurrence/recurrenceWeekdayOccurrences';
import Time from '../time-management/Time';
import { addDays } from '../../utilities/dateFormatting';
import { getEndOfDayTimeOfDay, RawMatch, typedQuickInputMatchers } from './typedQuickInputMatchers';
import { EscapedTokenLocation, isTokenEscapedByAnyLocation, TypedQuickInputParseResult, TypedQuickInputTagMatch } from './TypedQuickInputToken';

const defaultNightTime = Time.fromString(DEFAULT_SETTINGS.nightTime);
const defaultMorningTime = Time.fromString(DEFAULT_SETTINGS.morningTime);

type Range = { start: number; end: number };

function rangesOverlap(left: Range, right: Range): boolean {
	return left.start < right.end && right.start < left.end;
}

function findQuoteSpans(input: string): Array<{ openIndex: number; closeIndex: number }> {
	const spans: Array<{ openIndex: number; closeIndex: number }> = [];
	const regex = /"([^"]*)"/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(input)) !== null) {
		spans.push({ openIndex: match.index, closeIndex: match.index + match[0].length - 1 });
	}
	return spans;
}

function resolveOverlappingMatches(matches: RawMatch[]): RawMatch[] {
	const sorted = [...matches].sort((left, right) => left.startIndex - right.startIndex);
	const kept: RawMatch[] = [];
	for (const match of sorted) {
		const overlapsKept = kept.some(other =>
			rangesOverlap(
				{ start: match.startIndex, end: match.endIndex },
				{ start: other.startIndex, end: other.endIndex }
			)
		);
		if (!overlapsKept) kept.push(match);
	}
	return kept;
}

function buildCleanedName(input: string, removedIndices: Set<number>): string {
	let result = '';
	for (let index = 0; index < input.length; index++) {
		if (!removedIndices.has(index)) result += input[index];
	}
	return result.replace(/\s+/g, ' ').trim();
}

function moveTimeOfDayToFirstMomentOnOrAfterStartDate({ time, startDate }: { time: Date; startDate: Date }): Date {
	const timeOnStartDay = new Date(startDate);
	timeOnStartDay.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
	if (timeOnStartDay.getTime() >= startDate.getTime()) return timeOnStartDay;
	return addDays(timeOnStartDay, 1);
}

function keepDateOnOrAfterStartDate({ date, startDate }: { date: Date | null | undefined; startDate: Date }): Date | null | undefined {
	if (date === null || date === undefined) return date;
	if (date.getTime() >= startDate.getTime()) return date;
	return moveTimeOfDayToFirstMomentOnOrAfterStartDate({ time: date, startDate });
}

function applyWeekdayRepeatTimingDefaults({ timing, nightTime }: { timing: Partial<TaskTimingOptions>; nightTime: Time }): Partial<TaskTimingOptions> {
	const { recurrenceDuration, startDate } = timing;
	if (!recurrenceDuration || !startDate || !hasRecurrenceWeekdays(recurrenceDuration)) return timing;

	const timingWithDefaults: Partial<TaskTimingOptions> = { ...timing };
	const wasAnyTargetOrDueDateTyped = timing.targetDate !== undefined || timing.dueDate !== undefined;
	if (!wasAnyTargetOrDueDateTyped) {
		const defaultTargetDate = getDefaultTargetDateOfWeekdayRepeat({
			startDate,
			endOfDayTimeOfDay: getEndOfDayTimeOfDay(nightTime),
		});
		if (defaultTargetDate) timingWithDefaults.targetDate = defaultTargetDate;
	}
	if (timing.targetDate !== undefined) {
		timingWithDefaults.targetDate = keepDateOnOrAfterStartDate({ date: timing.targetDate, startDate });
	}
	if (timing.dueDate !== undefined) {
		timingWithDefaults.dueDate = keepDateOnOrAfterStartDate({ date: timing.dueDate, startDate });
	}
	return timingWithDefaults;
}

function isTargetDateAfterDueDate(timing: Partial<TaskTimingOptions>): boolean {
	const { targetDate, dueDate } = timing;
	if (!targetDate || !dueDate) return false;
	return targetDate.getTime() > dueDate.getTime();
}

function ignoreTargetDateAfterDueDate(parameters: { timing: Partial<TaskTimingOptions>; keptMatches: RawMatch[] }): { timing: Partial<TaskTimingOptions>; keptMatches: RawMatch[] } {
	if (!isTargetDateAfterDueDate(parameters.timing)) return parameters;

	const timing = { ...parameters.timing };
	delete timing.targetDate;
	const keptMatches = parameters.keptMatches.map(match => {
		if (match.timing.targetDate === undefined) return match;
		return {
			...match,
			explanation: "Ignored, it's after the due date",
			timing: {},
		};
	});
	return {
		timing,
		keptMatches,
	};
}

export default function parseTypedQuickInput(config: {
	input: string;
	now?: Date;
	nightTime?: Time;
	morningTime?: Time;
	escapedTokenLocations?: EscapedTokenLocation[];
	existingTags?: Tag[];
}): TypedQuickInputParseResult {
	const input = config.input;
	const now = config.now ?? new Date();
	const nightTime = config.nightTime ?? defaultNightTime;
	const morningTime = config.morningTime ?? defaultMorningTime;
	const escapedTokenLocations = config.escapedTokenLocations ?? [];
	const existingTags = config.existingTags ?? [];

	const rawMatches = typedQuickInputMatchers.flatMap(matcher => matcher.findMatches({ input, now, nightTime, morningTime, escapedTokenLocations, existingTags }));

	const quoteSpans = findQuoteSpans(input);

	const protectedRanges: Range[] = quoteSpans.map(span => ({ start: span.openIndex + 1, end: span.closeIndex }));

	const isMatchEscaped = (match: RawMatch) => isTokenEscapedByAnyLocation(match, escapedTokenLocations);

	const unprotectedMatches = rawMatches.filter(match =>
		match.field === 'tag' ||
		!protectedRanges.some(range =>
			rangesOverlap({ start: match.startIndex, end: match.endIndex }, range)
		)
	);

	const keptMatchesBeforeDateOrderCheck = resolveOverlappingMatches(unprotectedMatches.filter(match => !isMatchEscaped(match)));
	const keptEscapedMatches = resolveOverlappingMatches(unprotectedMatches.filter(isMatchEscaped));

	const removedIndices = new Set<number>();
	for (const match of keptMatchesBeforeDateOrderCheck) {
		if (match.keepInName) continue;
		for (let index = match.startIndex; index < match.endIndex; index++) removedIndices.add(index);
	}

	for (const span of quoteSpans) {
		const innerRange = { start: span.openIndex + 1, end: span.closeIndex };
		const protectsAToken = rawMatches.some(match =>
			rangesOverlap({ start: match.startIndex, end: match.endIndex }, innerRange)
		);
		if (protectsAToken) {
			removedIndices.add(span.openIndex);
			removedIndices.add(span.closeIndex);
		}
	}

	const typedTiming: Partial<TaskTimingOptions> = {};
	let steps: string[] | null = null;
	for (const match of keptMatchesBeforeDateOrderCheck) {
		Object.assign(typedTiming, match.timing);
		if (match.stepsList) steps = match.stepsList;
	}
	const timingWithDefaults = applyWeekdayRepeatTimingDefaults({
		timing: typedTiming,
		nightTime,
	});
	const { timing, keptMatches } = ignoreTargetDateAfterDueDate({
		timing: timingWithDefaults,
		keptMatches: keptMatchesBeforeDateOrderCheck,
	});

	const matchToToken = (match: RawMatch) => ({
		field: match.field,
		matchedText: match.matchedText,
		startIndex: match.startIndex,
		endIndex: match.endIndex,
		explanation: match.explanation,
		colorClass: match.colorClass,
	});

	const tokens = keptMatches.map(matchToToken).sort((left, right) => left.startIndex - right.startIndex);
	const escapedTokens = keptEscapedMatches.map(matchToToken).sort((left, right) => left.startIndex - right.startIndex);

	const tags: TypedQuickInputTagMatch[] = keptMatches
		.filter(match => match.tagMatch)
		.map(match => ({
			startIndex: match.startIndex,
			endIndex: match.endIndex,
			existingTagID: match.tagMatch!.existingTagID,
			newTagName: match.tagMatch!.newTagName,
		}))
		.sort((left, right) => left.startIndex - right.startIndex);

	return {
		cleanedName: buildCleanedName(input, removedIndices),
		timing,
		steps,
		tags,
		tokens,
		escapedTokens,
	};
}

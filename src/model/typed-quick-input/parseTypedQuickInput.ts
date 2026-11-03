import { DEFAULT_SETTINGS } from '../AppSettings';
import Tag from '../tag/Tag';
import TaskTimingOptions from '../task/TaskTimingOptions';
import { hasRecurrenceWeekdays } from '../task/recurrence/RecurrenceDuration';
import { getDefaultDeadlineOfWeekdayRepeat } from '../task/recurrence/recurrenceWeekdayOccurrences';
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

function moveTimeOfDayToFirstMomentOnOrAfterStartTime({ time, startTime }: { time: Date; startTime: Date }): Date {
	const timeOnStartDay = new Date(startTime);
	timeOnStartDay.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
	if (timeOnStartDay.getTime() >= startTime.getTime()) return timeOnStartDay;
	return addDays(timeOnStartDay, 1);
}

function keepTimeOnOrAfterStartTime({ time, startTime }: { time: Date | null | undefined; startTime: Date }): Date | null | undefined {
	if (time === null || time === undefined) return time;
	if (time.getTime() >= startTime.getTime()) return time;
	return moveTimeOfDayToFirstMomentOnOrAfterStartTime({ time, startTime });
}

function applyWeekdayRepeatTimingDefaults({ timing, nightTime }: { timing: Partial<TaskTimingOptions>; nightTime: Time }): Partial<TaskTimingOptions> {
	const { recurrenceDuration, startTime } = timing;
	if (!recurrenceDuration || !startTime || !hasRecurrenceWeekdays(recurrenceDuration)) return timing;

	const timingWithDefaults: Partial<TaskTimingOptions> = { ...timing };
	if (timing.deadline === undefined) {
		const defaultDeadline = getDefaultDeadlineOfWeekdayRepeat({
			startTime,
			endOfDayTimeOfDay: getEndOfDayTimeOfDay(nightTime),
		});
		if (defaultDeadline) timingWithDefaults.deadline = defaultDeadline;
	}
	else {
		timingWithDefaults.deadline = keepTimeOnOrAfterStartTime({ time: timing.deadline, startTime });
	}
	if (timing.endTime !== undefined) {
		timingWithDefaults.endTime = keepTimeOnOrAfterStartTime({ time: timing.endTime, startTime });
	}
	return timingWithDefaults;
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

	const keptMatches = resolveOverlappingMatches(unprotectedMatches.filter(match => !isMatchEscaped(match)));
	const keptEscapedMatches = resolveOverlappingMatches(unprotectedMatches.filter(isMatchEscaped));

	const removedIndices = new Set<number>();
	for (const match of keptMatches) {
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

	const timing: Partial<TaskTimingOptions> = {};
	let steps: string[] | null = null;
	for (const match of keptMatches) {
		Object.assign(timing, match.timing);
		if (match.stepsList) steps = match.stepsList;
	}

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
		timing: applyWeekdayRepeatTimingDefaults({ timing, nightTime }),
		steps,
		tags,
		tokens,
		escapedTokens,
	};
}

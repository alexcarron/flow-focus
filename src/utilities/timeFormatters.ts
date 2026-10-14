import Duration from '../model/time-management/Duration';
import { TimeUnitName, timeUnits } from '../model/time-management/StandardTimeUnit';

const TIME_UNIT_NAME_TO_COMPACT_LABELS: Record<TimeUnitName, { singular: string; plural: string }> = {
	[TimeUnitName.Milliseconds]: { singular: 'ms', plural: 'ms' },
	[TimeUnitName.Seconds]: { singular: 's', plural: 's' },
	[TimeUnitName.Minutes]: { singular: 'm', plural: 'm' },
	[TimeUnitName.Hours]: { singular: 'h', plural: 'h' },
	[TimeUnitName.Days]: { singular: 'd', plural: 'd' },
	[TimeUnitName.Weeks]: { singular: 'w', plural: 'w' },
	[TimeUnitName.Months]: { singular: 'mo', plural: 'mo' },
	[TimeUnitName.Years]: { singular: 'yr', plural: 'yr' },
};

const TIME_UNIT_NAME_TO_ABBREVIATED_LABELS: Record<TimeUnitName, { singular: string; plural: string }> = {
	[TimeUnitName.Milliseconds]: { singular: 'ms', plural: 'ms' },
	[TimeUnitName.Seconds]: { singular: 'sec', plural: 'sec' },
	[TimeUnitName.Minutes]: { singular: 'min', plural: 'min' },
	[TimeUnitName.Hours]: { singular: 'hr', plural: 'hrs' },
	[TimeUnitName.Days]: { singular: 'day', plural: 'days' },
	[TimeUnitName.Weeks]: { singular: 'week', plural: 'wks' },
	[TimeUnitName.Months]: { singular: 'mo', plural: 'mos' },
	[TimeUnitName.Years]: { singular: 'year', plural: 'yrs' },
};

const TIME_UNIT_NAME_TO_FULL_LABELS: Record<TimeUnitName, { singular: string; plural: string }> = {
	[TimeUnitName.Milliseconds]: { singular: 'millisecond', plural: 'milliseconds' },
	[TimeUnitName.Seconds]: { singular: 'second', plural: 'seconds' },
	[TimeUnitName.Minutes]: { singular: 'minute', plural: 'minutes' },
	[TimeUnitName.Hours]: { singular: 'hour', plural: 'hours' },
	[TimeUnitName.Days]: { singular: 'day', plural: 'days' },
	[TimeUnitName.Weeks]: { singular: 'week', plural: 'weeks' },
	[TimeUnitName.Months]: { singular: 'month', plural: 'months' },
	[TimeUnitName.Years]: { singular: 'year', plural: 'years' },
};

export function formatTime(ms: number): string {
	const isNegative = ms < 0;
	let abs = Math.abs(ms);

	const years = Math.floor(abs / 1000 / 60 / 60 / 24 / 365);
	const weeks = Math.floor(abs / 1000 / 60 / 60 / 24 / 7);
	const days = Math.floor(abs / 1000 / 60 / 60 / 24);
	const hours = Math.floor(abs / 1000 / 60 / 60);
	const minutes = Math.floor((abs / 1000 / 60) % 60);
	const seconds = Math.floor((abs / 1000) % 60);
	const msLeft = Math.floor(abs % 1000);

	let result: string;
	if (years > 0) result = `${years} year${years > 1 ? 's' : ''}`;
	else if (weeks > 0) result = `${weeks} week${weeks > 1 ? 's' : ''}`;
	else if (days > 0) result = `${days} day${days > 1 ? 's' : ''}`;
	else if (hours > 0) result = `${hours} hour${hours > 1 ? 's' : ''}`;
	else if (minutes > 0) result = `${minutes} minute${minutes > 1 ? 's' : ''}`;
	else if (seconds > 0) result = `${seconds} second${seconds > 1 ? 's' : ''}`;
	else result = `${msLeft} millisecond${msLeft !== 1 ? 's' : ''}`;

	return isNegative ? `-${result}` : result;
}

function getAbbreviatedUnitLabel(amountOfUnits: number, unitName: TimeUnitName): string {
	const abbreviations = TIME_UNIT_NAME_TO_ABBREVIATED_LABELS[unitName];
	return amountOfUnits === 1 ? abbreviations.singular : abbreviations.plural;
}

const DESCENDING_UNIT_NAMES_FOR_BREAKDOWN = [
	TimeUnitName.Years,
	TimeUnitName.Months,
	TimeUnitName.Weeks,
	TimeUnitName.Days,
	TimeUnitName.Hours,
	TimeUnitName.Minutes,
	TimeUnitName.Seconds,
] as const;

const MONTHS_PER_YEAR = 12;

const UNIT_NAME_TO_BREAKDOWN_MILLISECONDS: Record<(typeof DESCENDING_UNIT_NAMES_FOR_BREAKDOWN)[number], number> = {
	[TimeUnitName.Years]: MONTHS_PER_YEAR * timeUnits[TimeUnitName.Months].milliseconds,
	[TimeUnitName.Months]: timeUnits[TimeUnitName.Months].milliseconds,
	[TimeUnitName.Weeks]: timeUnits[TimeUnitName.Weeks].milliseconds,
	[TimeUnitName.Days]: timeUnits[TimeUnitName.Days].milliseconds,
	[TimeUnitName.Hours]: timeUnits[TimeUnitName.Hours].milliseconds,
	[TimeUnitName.Minutes]: timeUnits[TimeUnitName.Minutes].milliseconds,
	[TimeUnitName.Seconds]: timeUnits[TimeUnitName.Seconds].milliseconds,
};

type DurationBreakdownPart = { amountOfUnits: number; unitName: TimeUnitName };

function breakDownIntoLargestTwoUnits(ms: number): DurationBreakdownPart[] {
	const largestUnitIndex = DESCENDING_UNIT_NAMES_FOR_BREAKDOWN.findIndex(
		unitName => ms >= UNIT_NAME_TO_BREAKDOWN_MILLISECONDS[unitName],
	);

	if (ms <= 0) return [{ amountOfUnits: 0, unitName: TimeUnitName.Seconds }];
	if (largestUnitIndex === -1) return [{ amountOfUnits: Math.floor(ms), unitName: TimeUnitName.Milliseconds }];

	const largestUnitName = DESCENDING_UNIT_NAMES_FOR_BREAKDOWN[largestUnitIndex];
	const largestUnitMilliseconds = UNIT_NAME_TO_BREAKDOWN_MILLISECONDS[largestUnitName];
	const amountOfLargestUnit = Math.floor(ms / largestUnitMilliseconds);
	const parts = [{ amountOfUnits: amountOfLargestUnit, unitName: largestUnitName }];

	const nextUnitName = DESCENDING_UNIT_NAMES_FOR_BREAKDOWN[largestUnitIndex + 1];
	if (nextUnitName === undefined) return parts;

	const remainingMilliseconds = ms - amountOfLargestUnit * largestUnitMilliseconds;
	const amountOfNextUnit = Math.floor(remainingMilliseconds / UNIT_NAME_TO_BREAKDOWN_MILLISECONDS[nextUnitName]);
	if (amountOfNextUnit > 0) parts.push({ amountOfUnits: amountOfNextUnit, unitName: nextUnitName });

	return parts;
}

function breakDownIntoTopUnitUnlessItIsOne(ms: number): DurationBreakdownPart[] {
	const parts = breakDownIntoLargestTwoUnits(ms);
	const [topPart] = parts;
	if (topPart.amountOfUnits === 1) return parts;
	return [topPart];
}

type DurationBreakdowner = (ms: number) => DurationBreakdownPart[];

type UnitLabelGetter = (amountOfUnits: number, unitName: TimeUnitName) => string;

function formatBreakdownParts({ parts, getTopUnitLabel, getSecondaryUnitLabel }: {
	parts: DurationBreakdownPart[];
	getTopUnitLabel: UnitLabelGetter;
	getSecondaryUnitLabel: UnitLabelGetter;
}): string {
	return parts
		.map(({ amountOfUnits, unitName }, partIndex) => {
			const isTopUnit = partIndex === 0;
			let unitLabel = getSecondaryUnitLabel(amountOfUnits, unitName);
			if (isTopUnit) unitLabel = getTopUnitLabel(amountOfUnits, unitName);
			return `${amountOfUnits} ${unitLabel}`;
		})
		.join(' ');
}

function formatDurationRangeFromBreakdowns({ minimumMilliseconds, maximumMilliseconds, breakDownDuration, getTopUnitLabel, getSecondaryUnitLabel, differentUnitRangeSeparator }: {
	minimumMilliseconds: number;
	maximumMilliseconds: number;
	breakDownDuration: DurationBreakdowner;
	getTopUnitLabel: UnitLabelGetter;
	getSecondaryUnitLabel: UnitLabelGetter;
	differentUnitRangeSeparator: string;
}): string {
	const startParts = breakDownDuration(minimumMilliseconds);
	const endParts = breakDownDuration(maximumMilliseconds);
	const [startPart] = startParts;
	const [endPart] = endParts;
	const isEachEndOneUnit = startParts.length === 1 && endParts.length === 1;

	if (isEachEndOneUnit && startPart.unitName === endPart.unitName) {
		if (startPart.amountOfUnits === endPart.amountOfUnits) return formatBreakdownParts({
			parts: startParts,
			getTopUnitLabel,
			getSecondaryUnitLabel,
		});
		return `${startPart.amountOfUnits}-${endPart.amountOfUnits} ${getTopUnitLabel(endPart.amountOfUnits, endPart.unitName)}`;
	}

	const formattedStart = formatBreakdownParts({
		parts: startParts,
		getTopUnitLabel,
		getSecondaryUnitLabel,
	});
	const formattedEnd = formatBreakdownParts({
		parts: endParts,
		getTopUnitLabel,
		getSecondaryUnitLabel,
	});
	if (formattedStart === formattedEnd) return formattedStart;

	return `${formattedStart}${differentUnitRangeSeparator}${formattedEnd}`;
}

export function formatAbbreviatedDuration(ms: number): string {
	return formatBreakdownParts({
		parts: breakDownIntoLargestTwoUnits(ms),
		getTopUnitLabel: getAbbreviatedUnitLabel,
		getSecondaryUnitLabel: getAbbreviatedUnitLabel,
	});
}

export function formatAbbreviatedDurationRange(minMs: number | null, maxMs: number | null): string {
	if (minMs === null && maxMs === null) return '—';

	return formatDurationRangeFromBreakdowns({
		minimumMilliseconds: minMs ?? 0,
		maximumMilliseconds: maxMs ?? 0,
		breakDownDuration: breakDownIntoLargestTwoUnits,
		getTopUnitLabel: getAbbreviatedUnitLabel,
		getSecondaryUnitLabel: getAbbreviatedUnitLabel,
		differentUnitRangeSeparator: '-',
	});
}

function getReadableUnitLabel(amountOfUnits: number, unitName: TimeUnitName): string {
	const readableLabels = TIME_UNIT_NAME_TO_FULL_LABELS[unitName];
	return amountOfUnits === 1 ? readableLabels.singular : readableLabels.plural;
}

export function formatReadableDuration(milliseconds: number): string {
	return formatBreakdownParts({
		parts: breakDownIntoLargestTwoUnits(milliseconds),
		getTopUnitLabel: getReadableUnitLabel,
		getSecondaryUnitLabel: getAbbreviatedUnitLabel,
	});
}

export function formatReadableDurationRange({ minimumMilliseconds, maximumMilliseconds, shouldOnlyShowTopUnitUnlessItIsOne = false }: {
	minimumMilliseconds: number;
	maximumMilliseconds: number;
	shouldOnlyShowTopUnitUnlessItIsOne?: boolean;
}): string {
	let breakDownDuration: DurationBreakdowner = breakDownIntoLargestTwoUnits;
	if (shouldOnlyShowTopUnitUnlessItIsOne) breakDownDuration = breakDownIntoTopUnitUnlessItIsOne;

	return formatDurationRangeFromBreakdowns({
		minimumMilliseconds,
		maximumMilliseconds,
		breakDownDuration,
		getTopUnitLabel: getReadableUnitLabel,
		getSecondaryUnitLabel: getAbbreviatedUnitLabel,
		differentUnitRangeSeparator: ' to ',
	});
}

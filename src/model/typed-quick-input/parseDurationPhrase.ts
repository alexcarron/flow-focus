import { timeUnits, TimeUnitName } from '../time-management/StandardTimeUnit';

const durationUnitWordToMilliseconds: Record<string, number> = {
	ms: 1, millisecond: 1, milliseconds: 1,
	sec: timeUnits[TimeUnitName.Seconds].milliseconds,
	secs: timeUnits[TimeUnitName.Seconds].milliseconds,
	second: timeUnits[TimeUnitName.Seconds].milliseconds,
	seconds: timeUnits[TimeUnitName.Seconds].milliseconds,
	min: timeUnits[TimeUnitName.Minutes].milliseconds,
	mins: timeUnits[TimeUnitName.Minutes].milliseconds,
	minute: timeUnits[TimeUnitName.Minutes].milliseconds,
	minutes: timeUnits[TimeUnitName.Minutes].milliseconds,
	hr: timeUnits[TimeUnitName.Hours].milliseconds,
	hrs: timeUnits[TimeUnitName.Hours].milliseconds,
	hour: timeUnits[TimeUnitName.Hours].milliseconds,
	hours: timeUnits[TimeUnitName.Hours].milliseconds,
	day: timeUnits[TimeUnitName.Days].milliseconds,
	days: timeUnits[TimeUnitName.Days].milliseconds,
	week: timeUnits[TimeUnitName.Weeks].milliseconds,
	weeks: timeUnits[TimeUnitName.Weeks].milliseconds,
	month: timeUnits[TimeUnitName.Months].milliseconds,
	months: timeUnits[TimeUnitName.Months].milliseconds,
	year: timeUnits[TimeUnitName.Years].milliseconds,
	years: timeUnits[TimeUnitName.Years].milliseconds,
};

const unitAlternation = Object.keys(durationUnitWordToMilliseconds)
	.sort((left, right) => right.length - left.length)
	.join('|');

export type ParsedDuration = {
	milliseconds: number;
	matchedLength: number;
};

export type ParsedDurationRange = {
	minimumMilliseconds: number;
	maximumMilliseconds: number;
	matchedLength: number;
};

export function parseSingleDuration(text: string): ParsedDuration | null {
	const match = new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitAlternation})\\b`, 'i').exec(text);
	if (!match) return null;

	const amount = parseFloat(match[1]);
	const unitMilliseconds = durationUnitWordToMilliseconds[match[2].toLowerCase()];
	return { milliseconds: Math.round(amount * unitMilliseconds), matchedLength: match[0].length };
}

function parseNumericRangeWithSharedUnit(text: string): ParsedDurationRange | null {
	const match = new RegExp(
		`^\\s*(\\d+(?:\\.\\d+)?)\\s*(?:-|to)\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitAlternation})\\b`,
		'i'
	).exec(text);
	if (!match) return null;

	const unitMilliseconds = durationUnitWordToMilliseconds[match[3].toLowerCase()];
	return {
		minimumMilliseconds: Math.round(parseFloat(match[1]) * unitMilliseconds),
		maximumMilliseconds: Math.round(parseFloat(match[2]) * unitMilliseconds),
		matchedLength: match[0].length,
	};
}

function parseTwoDurationsRange(text: string): ParsedDurationRange | null {
	const minimum = parseSingleDuration(text);
	if (!minimum) return null;

	const separatorMatch = /^\s*(?:-|to)\s*/i.exec(text.slice(minimum.matchedLength));
	if (!separatorMatch) return null;

	const remainderStart = minimum.matchedLength + separatorMatch[0].length;
	const maximum = parseSingleDuration(text.slice(remainderStart));
	if (!maximum) return null;

	return {
		minimumMilliseconds: minimum.milliseconds,
		maximumMilliseconds: maximum.milliseconds,
		matchedLength: remainderStart + maximum.matchedLength,
	};
}

export function parseDurationRange(text: string): ParsedDurationRange | null {
	return parseNumericRangeWithSharedUnit(text) ?? parseTwoDurationsRange(text);
}

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

const wordAmountPhraseToMultiplier: Record<string, number> = {
	'half an': 0.5, 'half a': 0.5, half: 0.5,
	'a couple of': 2, 'a couple': 2, 'couple of': 2, couple: 2,
	'a few': 3, few: 3,
	several: 4,
	an: 1, a: 1,
};

const wordAmountAlternation = Object.keys(wordAmountPhraseToMultiplier)
	.sort((left, right) => right.length - left.length)
	.map(phrase => phrase.split(' ').join('\\s+'))
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
	const numericMatch = new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)\\s*(${unitAlternation})\\b`, 'i').exec(text);
	if (numericMatch) {
		const amount = parseFloat(numericMatch[1]);
		const unitMilliseconds = durationUnitWordToMilliseconds[numericMatch[2].toLowerCase()];
		return { milliseconds: Math.round(amount * unitMilliseconds), matchedLength: numericMatch[0].length };
	}

	const wordAmountMatch = new RegExp(`^\\s*(${wordAmountAlternation})\\s+(${unitAlternation})\\b`, 'i').exec(text);
	if (wordAmountMatch) {
		const normalizedPhrase = wordAmountMatch[1].toLowerCase().replace(/\s+/g, ' ');
		const multiplier = wordAmountPhraseToMultiplier[normalizedPhrase];
		const unitMilliseconds = durationUnitWordToMilliseconds[wordAmountMatch[2].toLowerCase()];
		return { milliseconds: Math.round(multiplier * unitMilliseconds), matchedLength: wordAmountMatch[0].length };
	}

	return null;
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

import { timeUnits, TimeUnitName } from '../time-management/StandardTimeUnit';
import { parseWordNumber } from './parseWordNumber';

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
	m: timeUnits[TimeUnitName.Minutes].milliseconds,
	hr: timeUnits[TimeUnitName.Hours].milliseconds,
	hrs: timeUnits[TimeUnitName.Hours].milliseconds,
	hour: timeUnits[TimeUnitName.Hours].milliseconds,
	hours: timeUnits[TimeUnitName.Hours].milliseconds,
	h: timeUnits[TimeUnitName.Hours].milliseconds,
	day: timeUnits[TimeUnitName.Days].milliseconds,
	days: timeUnits[TimeUnitName.Days].milliseconds,
	d: timeUnits[TimeUnitName.Days].milliseconds,
	week: timeUnits[TimeUnitName.Weeks].milliseconds,
	weeks: timeUnits[TimeUnitName.Weeks].milliseconds,
	w: timeUnits[TimeUnitName.Weeks].milliseconds,
	month: timeUnits[TimeUnitName.Months].milliseconds,
	months: timeUnits[TimeUnitName.Months].milliseconds,
	year: timeUnits[TimeUnitName.Years].milliseconds,
	years: timeUnits[TimeUnitName.Years].milliseconds,
	y: timeUnits[TimeUnitName.Years].milliseconds,
};

const naturalDurationUnitWords = new Set([
	'min', 'mins', 'minute', 'minutes', 'm',
	'hr', 'hrs', 'hour', 'hours', 'h',
	'day', 'days', 'd',
	'week', 'weeks', 'w',
	'month', 'months',
	'year', 'years', 'y',
]);

const unitAlternation = Object.keys(durationUnitWordToMilliseconds)
	.sort((left, right) => right.length - left.length)
	.join('|');

const wordAmountPhraseToMultiplier: Record<string, number> = {
	'half an': 0.5, 'half a': 0.5, half: 0.5,
	'half a dozen': 6,
	'a couple of': 2, 'a couple': 2, 'couple of': 2, couple: 2,
	'a few': 3, few: 3,
	several: 4,
	'a dozen': 12, dozen: 12,
	an: 1, a: 1,
};

const wordAmountAlternation = Object.keys(wordAmountPhraseToMultiplier)
	.sort((left, right) => right.length - left.length)
	.map(phrase => phrase.split(' ').join('\\s+'))
	.join('|');

const fractionWordToValue: Record<string, number> = {
	'a half': 0.5,
	'a quarter': 0.25,
	'three quarters': 0.75,
	'three quarter': 0.75,
};

const fractionAlternation = Object.keys(fractionWordToValue)
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

type ParsedAmount = {
	value: number;
	matchedLength: number;
	requiresNaturalUnit: boolean;
};

function matchUnitToken(text: string): { unitWord: string; matchedLength: number } | null {
	const match = new RegExp(`^\\s*(${unitAlternation})(?![a-zA-Z])`, 'i').exec(text);
	if (!match) return null;
	return { unitWord: match[1].toLowerCase(), matchedLength: match[0].length };
}

function normalizePhrase(phrase: string): string {
	return phrase.toLowerCase().replace(/\s+/g, ' ');
}

function parseFractionalAmount(text: string): ParsedAmount | null {
	const numericMatch = new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)\\s+and\\s+(${fractionAlternation})\\b`, 'i').exec(text);
	if (numericMatch) {
		const baseValue = parseFloat(numericMatch[1]);
		const fractionValue = fractionWordToValue[normalizePhrase(numericMatch[2])];
		return { value: baseValue + fractionValue, matchedLength: numericMatch[0].length, requiresNaturalUnit: true };
	}

	const wordNumber = parseWordNumber(text);
	if (!wordNumber) return null;

	const fractionMatch = new RegExp(`^\\s+and\\s+(${fractionAlternation})\\b`, 'i').exec(text.slice(wordNumber.matchedLength));
	if (!fractionMatch) return null;

	const fractionValue = fractionWordToValue[normalizePhrase(fractionMatch[1])];
	return {
		value: wordNumber.value + fractionValue,
		matchedLength: wordNumber.matchedLength + fractionMatch[0].length,
		requiresNaturalUnit: true,
	};
}

function parsePlainAmount(text: string): ParsedAmount | null {
	const numericMatch = /^\s*(\d+(?:\.\d+)?)/.exec(text);
	if (numericMatch) return { value: parseFloat(numericMatch[1]), matchedLength: numericMatch[0].length, requiresNaturalUnit: false };

	const wordNumber = parseWordNumber(text);
	if (wordNumber) return { value: wordNumber.value, matchedLength: wordNumber.matchedLength, requiresNaturalUnit: false };

	return null;
}

function parseWordAmountPhraseDuration(text: string): ParsedDuration | null {
	const match = new RegExp(`^\\s*(${wordAmountAlternation})\\s+(${unitAlternation})\\b`, 'i').exec(text);
	if (!match) return null;

	const multiplier = wordAmountPhraseToMultiplier[normalizePhrase(match[1])];
	const unitMilliseconds = durationUnitWordToMilliseconds[match[2].toLowerCase()];
	return { milliseconds: Math.round(multiplier * unitMilliseconds), matchedLength: match[0].length };
}

function parseUnitAndAHalfPhrase(text: string): ParsedDuration | null {
	const articleMatch = /^\s*(a|an)\s+/i.exec(text);
	if (!articleMatch) return null;

	const unit = matchUnitToken(text.slice(articleMatch[0].length));
	if (!unit || !naturalDurationUnitWords.has(unit.unitWord)) return null;

	const afterUnitIndex = articleMatch[0].length + unit.matchedLength;
	const halfSuffixMatch = /^\s+and\s+a\s+half\b/i.exec(text.slice(afterUnitIndex));
	if (!halfSuffixMatch) return null;

	const unitMilliseconds = durationUnitWordToMilliseconds[unit.unitWord];
	return {
		milliseconds: Math.round(1.5 * unitMilliseconds),
		matchedLength: afterUnitIndex + halfSuffixMatch[0].length,
	};
}

function parseSingleSegment(text: string): ParsedDuration | null {
	const unitAndAHalfPhrase = parseUnitAndAHalfPhrase(text);
	if (unitAndAHalfPhrase) return unitAndAHalfPhrase;

	const amountCandidates = [parseFractionalAmount(text), parsePlainAmount(text)];
	for (const amount of amountCandidates) {
		if (!amount) continue;

		const unit = matchUnitToken(text.slice(amount.matchedLength));
		if (!unit) continue;
		if (amount.requiresNaturalUnit && !naturalDurationUnitWords.has(unit.unitWord)) continue;

		const unitMilliseconds = durationUnitWordToMilliseconds[unit.unitWord];
		return {
			milliseconds: Math.round(amount.value * unitMilliseconds),
			matchedLength: amount.matchedLength + unit.matchedLength,
		};
	}

	return parseWordAmountPhraseDuration(text);
}

const chainSegmentSeparatorPatterns = [/^\s*,\s*and\s+/i, /^\s*,\s*/, /^\s+and\s+/i, /^\s+/, /^/];

export function parseSingleDuration(text: string): ParsedDuration | null {
	const firstSegment = parseSingleSegment(text);
	if (!firstSegment) return null;

	let totalMilliseconds = firstSegment.milliseconds;
	let consumedLength = firstSegment.matchedLength;

	let keepExtending = true;
	while (keepExtending) {
		keepExtending = false;

		for (const separatorPattern of chainSegmentSeparatorPatterns) {
			const remainder = text.slice(consumedLength);
			const separatorMatch = separatorPattern.exec(remainder);
			if (!separatorMatch) continue;

			const nextSegment = parseSingleSegment(remainder.slice(separatorMatch[0].length));
			if (!nextSegment) continue;

			totalMilliseconds += nextSegment.milliseconds;
			consumedLength += separatorMatch[0].length + nextSegment.matchedLength;
			keepExtending = true;
			break;
		}
	}

	return { milliseconds: totalMilliseconds, matchedLength: consumedLength };
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

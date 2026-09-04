import { parseSingleDuration } from './parseDurationPhrase';

export type ParsedRelativeDurationPhrase = {
	date: Date;
	matchedLength: number;
	timeOfDay?: { hour: number; minute: number };
};

const oneMinuteMilliseconds = 60 * 1000;

const dayOrLargerUnitWords = new Set([
	'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
]);

function matchedDurationHasDayOrLargerUnit(matchedDurationText: string): boolean {
	const unitWordMatch = /([a-z]+)\s*$/i.exec(matchedDurationText);
	const unitWord = unitWordMatch?.[1].toLowerCase() ?? '';
	return dayOrLargerUnitWords.has(unitWord);
}

function roundUpToNearestMinute(milliseconds: number): number {
	return Math.ceil(milliseconds / oneMinuteMilliseconds) * oneMinuteMilliseconds;
}

function buildParsedPhrase(config: {
	now: Date;
	milliseconds: number;
	sign: 1 | -1;
	matchedLength: number;
	isDayOrLargerUnit: boolean;
}): ParsedRelativeDurationPhrase {
	const resolvedDate = new Date(config.now.getTime() + config.sign * roundUpToNearestMinute(config.milliseconds));

	if (config.isDayOrLargerUnit) {
		resolvedDate.setHours(0, 0, 0, 0);
		return { date: resolvedDate, matchedLength: config.matchedLength };
	}

	return {
		date: resolvedDate,
		matchedLength: config.matchedLength,
		timeOfDay: { hour: resolvedDate.getHours(), minute: resolvedDate.getMinutes() },
	};
}

function parseFutureRelativeDuration(text: string, now: Date): ParsedRelativeDurationPhrase | null {
	const inMatch = /^in\s+/i.exec(text);
	if (!inMatch) return null;

	const remainder = text.slice(inMatch[0].length);
	const duration = parseSingleDuration(remainder);
	if (!duration) return null;

	return buildParsedPhrase({
		now,
		milliseconds: duration.milliseconds,
		sign: 1,
		matchedLength: inMatch[0].length + duration.matchedLength,
		isDayOrLargerUnit: matchedDurationHasDayOrLargerUnit(remainder.slice(0, duration.matchedLength)),
	});
}

function parsePastRelativeDuration(text: string, now: Date): ParsedRelativeDurationPhrase | null {
	const duration = parseSingleDuration(text);
	if (!duration) return null;

	const agoMatch = /^\s+ago\b/i.exec(text.slice(duration.matchedLength));
	if (!agoMatch) return null;

	return buildParsedPhrase({
		now,
		milliseconds: duration.milliseconds,
		sign: -1,
		matchedLength: duration.matchedLength + agoMatch[0].length,
		isDayOrLargerUnit: matchedDurationHasDayOrLargerUnit(text.slice(0, duration.matchedLength)),
	});
}

export default function parseRelativeDurationPhrase(text: string, now: Date): ParsedRelativeDurationPhrase | null {
	return parseFutureRelativeDuration(text, now) ?? parsePastRelativeDuration(text, now);
}

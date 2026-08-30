import Time from '../time-management/Time';
import { DEFAULT_SETTINGS } from '../AppSettings';
import Weekday from '../time-management/Weekday';

export type ParsedDatePhrase = {
	date: Date;
	matchedLength: number;
	timeOfDay?: { hour: number; minute: number };
};

const defaultNightTime = Time.fromString(DEFAULT_SETTINGS.nightTime);
const defaultMorningTime = Time.fromString(DEFAULT_SETTINGS.morningTime);

const weekdayNameToWeekday: Record<string, Weekday> = {
	monday: Weekday.MONDAY, mon: Weekday.MONDAY,
	tuesday: Weekday.TUESDAY, tues: Weekday.TUESDAY, tue: Weekday.TUESDAY,
	wednesday: Weekday.WEDNESDAY, wed: Weekday.WEDNESDAY,
	thursday: Weekday.THURSDAY, thurs: Weekday.THURSDAY, thur: Weekday.THURSDAY, thu: Weekday.THURSDAY,
	friday: Weekday.FRIDAY, fri: Weekday.FRIDAY,
	saturday: Weekday.SATURDAY, sat: Weekday.SATURDAY,
	sunday: Weekday.SUNDAY, sun: Weekday.SUNDAY,
};

const monthNameToIndex: Record<string, number> = {
	january: 0, jan: 0,
	february: 1, feb: 1,
	march: 2, mar: 2,
	april: 3, apr: 3,
	may: 4,
	june: 5, jun: 5,
	july: 6, jul: 6,
	august: 7, aug: 7,
	september: 8, sept: 8, sep: 8,
	october: 9, oct: 9,
	november: 10, nov: 10,
	december: 11, dec: 11,
};

function toAlternation(words: string[]): string {
	return words
		.sort((left, right) => right.length - left.length)
		.join('|');
}

const weekdayAlternation = toAlternation(Object.keys(weekdayNameToWeekday));
const monthAlternation = toAlternation(Object.keys(monthNameToIndex));

const CLOCK_TIME_REGEX = /^(?:at\s+)?((?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[ap]m)?|(?:0?[1-9]|1[0-2])\s?[ap]m)\b/i;
const NAMED_TIME_OF_DAY_REGEX = /^(?:at\s+)?(noon|afternoon|evening|morning|night|midnight)\b/i;

function weekdayToJavascriptDay(weekday: Weekday): number {
	return weekday % 7;
}

function atStartOfDay(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	return result;
}

export function nextDateForWeekday(weekday: Weekday, includeToday: boolean, now: Date): Date {
	const targetJavascriptDay = weekdayToJavascriptDay(weekday);
	const today = atStartOfDay(now);
	let daysUntilTarget = (targetJavascriptDay - today.getDay() + 7) % 7;
	if (daysUntilTarget === 0 && !includeToday) {
		daysUntilTarget = 7;
	}
	today.setDate(today.getDate() + daysUntilTarget);
	return today;
}

function parseClockTime(text: string): { matchedLength: number; timeOfDay: { hour: number; minute: number } } | null {
	const match = CLOCK_TIME_REGEX.exec(text);
	if (!match) return null;

	const time = Time.fromString(match[1].replace(/\s+/g, ''));
	return { matchedLength: match[0].length, timeOfDay: { hour: time.getHour(), minute: time.getMinute() } };
}

function namedTimeOfDayWordToTimeOfDay(config: { word: string; morningTime: Time; nightTime: Time }): { hour: number; minute: number } {
	switch (config.word) {
		case 'midnight': return { hour: 0, minute: 0 };
		case 'morning': return { hour: config.morningTime.getHour(), minute: config.morningTime.getMinute() };
		case 'noon': return { hour: 12, minute: 0 };
		case 'afternoon': return { hour: 15, minute: 0 };
		case 'evening': return { hour: 18, minute: 0 };
		default: return { hour: config.nightTime.getHour(), minute: config.nightTime.getMinute() };
	}
}

function parseNamedTimeOfDayWord(config: { text: string; morningTime: Time; nightTime: Time }): { matchedLength: number; timeOfDay: { hour: number; minute: number }; dayOffset: number } | null {
	const match = NAMED_TIME_OF_DAY_REGEX.exec(config.text);
	if (!match) return null;

	const word = match[1].toLowerCase();
	return {
		matchedLength: match[0].length,
		timeOfDay: namedTimeOfDayWordToTimeOfDay({ word, morningTime: config.morningTime, nightTime: config.nightTime }),
		dayOffset: word === 'midnight' ? 1 : 0,
	};
}

function parseTimeOfDayPhrase(config: { text: string; morningTime: Time; nightTime: Time }): { matchedLength: number; timeOfDay: { hour: number; minute: number }; dayOffset: number } | null {
	const leadingWhitespace = /^\s*/.exec(config.text)?.[0].length ?? 0;
	const rest = config.text.slice(leadingWhitespace);

	const clockTime = parseClockTime(rest);
	if (clockTime) {
		return { matchedLength: leadingWhitespace + clockTime.matchedLength, timeOfDay: clockTime.timeOfDay, dayOffset: 0 };
	}

	const namedWord = parseNamedTimeOfDayWord({ text: rest, morningTime: config.morningTime, nightTime: config.nightTime });
	if (namedWord) {
		return { matchedLength: leadingWhitespace + namedWord.matchedLength, timeOfDay: namedWord.timeOfDay, dayOffset: namedWord.dayOffset };
	}

	return null;
}

function parseRelativeDay(text: string, now: Date, nightTime: Time): ParsedDatePhrase | null {
	const match = /^(today|tomorrow|tonight)/i.exec(text);
	if (!match) return null;

	const keyword = match[1].toLowerCase();
	const date = atStartOfDay(now);
	if (keyword === 'tomorrow') {
		date.setDate(date.getDate() + 1);
	}
	if (keyword === 'tonight') {
		return { date, matchedLength: match[0].length, timeOfDay: { hour: nightTime.getHour(), minute: nightTime.getMinute() } };
	}
	return { date, matchedLength: match[0].length };
}

function parseNextWeekday(text: string, now: Date, _nightTime: Time): ParsedDatePhrase | null {
	const match = new RegExp(`^next\\s+(${weekdayAlternation})`, 'i').exec(text);
	if (!match) return null;

	const weekday = weekdayNameToWeekday[match[1].toLowerCase()];
	const upcoming = nextDateForWeekday(weekday, false, now);
	upcoming.setDate(upcoming.getDate() + 7);
	return { date: upcoming, matchedLength: match[0].length };
}

function parseWeekday(text: string, now: Date, _nightTime: Time): ParsedDatePhrase | null {
	const match = new RegExp(`^(${weekdayAlternation})`, 'i').exec(text);
	if (!match) return null;

	const weekday = weekdayNameToWeekday[match[1].toLowerCase()];
	return { date: nextDateForWeekday(weekday, true, now), matchedLength: match[0].length };
}

function parseMonthAndDay(text: string, now: Date, _nightTime: Time): ParsedDatePhrase | null {
	const match = new RegExp(
		`^(${monthAlternation})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`,
		'i'
	).exec(text);
	if (!match) return null;

	const monthIndex = monthNameToIndex[match[1].toLowerCase()];
	const dayOfMonth = parseInt(match[2], 10);
	if (dayOfMonth < 1 || dayOfMonth > 31) return null;

	const explicitYear = match[3] ? parseInt(match[3], 10) : null;
	let year = explicitYear ?? now.getFullYear();

	const date = new Date(year, monthIndex, dayOfMonth, 0, 0, 0, 0);

	if (explicitYear === null && date < atStartOfDay(now)) {
		date.setFullYear(year + 1);
	}

	return { date, matchedLength: match[0].length };
}

const dateParsers = [parseRelativeDay, parseNextWeekday, parseWeekday, parseMonthAndDay];

export default function parseDatePhrase(config: {
	text: string;
	now?: Date;
	nightTime?: Time;
	morningTime?: Time;
}): ParsedDatePhrase | null {
	const now = config.now ?? new Date();
	const nightTime = config.nightTime ?? defaultNightTime;
	const morningTime = config.morningTime ?? defaultMorningTime;

	const leadingWhitespace = /^\s*/.exec(config.text)?.[0].length ?? 0;
	const trimmed = config.text.slice(leadingWhitespace);

	for (const parse of dateParsers) {
		const parsed = parse(trimmed, now, nightTime);
		if (parsed) {
			if (parsed.timeOfDay) {
				return { date: parsed.date, matchedLength: leadingWhitespace + parsed.matchedLength, timeOfDay: parsed.timeOfDay };
			}
			const timeOfDaySuffix = parseTimeOfDayPhrase({ text: trimmed.slice(parsed.matchedLength), morningTime, nightTime });
			if (timeOfDaySuffix) {
				const date = new Date(parsed.date);
				date.setDate(date.getDate() + timeOfDaySuffix.dayOffset);
				return {
					date,
					matchedLength: leadingWhitespace + parsed.matchedLength + timeOfDaySuffix.matchedLength,
					timeOfDay: timeOfDaySuffix.timeOfDay,
				};
			}
			return { date: parsed.date, matchedLength: leadingWhitespace + parsed.matchedLength };
		}
	}

	const bareTimeOfDay = parseTimeOfDayPhrase({ text: trimmed, morningTime, nightTime });
	if (bareTimeOfDay) {
		const date = atStartOfDay(now);
		date.setDate(date.getDate() + bareTimeOfDay.dayOffset);
		return { date, matchedLength: leadingWhitespace + bareTimeOfDay.matchedLength, timeOfDay: bareTimeOfDay.timeOfDay };
	}

	return null;
}

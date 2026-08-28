import Time from '../time-management/Time';
import { DEFAULT_SETTINGS } from '../AppSettings';
import Weekday from '../time-management/Weekday';

export type ParsedDatePhrase = {
	date: Date;
	matchedLength: number;
	timeOfDay?: { hour: number; minute: number };
};

const defaultNightTime = Time.fromString(DEFAULT_SETTINGS.nightTime);

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

function parseMidnightKeyword(text: string, now: Date): ParsedDatePhrase | null {
	const match = /^midnight\b/i.exec(text);
	if (!match) return null;

	return { date: atStartOfDay(now), matchedLength: match[0].length, timeOfDay: { hour: 0, minute: 0 } };
}

function parseNightSuffix(text: string, nightTime: Time): { matchedLength: number; timeOfDay: { hour: number; minute: number } } | null {
	const match = /^\s*night\b/i.exec(text);
	if (!match) return null;

	return { matchedLength: match[0].length, timeOfDay: { hour: nightTime.getHour(), minute: nightTime.getMinute() } };
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

export default function parseDatePhrase(text: string, now: Date = new Date(), nightTime: Time = defaultNightTime): ParsedDatePhrase | null {
	const leadingWhitespace = /^\s*/.exec(text)?.[0].length ?? 0;
	const trimmed = text.slice(leadingWhitespace);

	const midnight = parseMidnightKeyword(trimmed, now);
	if (midnight) {
		return { ...midnight, matchedLength: leadingWhitespace + midnight.matchedLength };
	}

	for (const parse of dateParsers) {
		const parsed = parse(trimmed, now, nightTime);
		if (parsed) {
			if (parsed.timeOfDay) {
				return { date: parsed.date, matchedLength: leadingWhitespace + parsed.matchedLength, timeOfDay: parsed.timeOfDay };
			}
			const nightSuffix = parseNightSuffix(trimmed.slice(parsed.matchedLength), nightTime);
			if (nightSuffix) {
				return {
					date: parsed.date,
					matchedLength: leadingWhitespace + parsed.matchedLength + nightSuffix.matchedLength,
					timeOfDay: nightSuffix.timeOfDay,
				};
			}
			return { date: parsed.date, matchedLength: leadingWhitespace + parsed.matchedLength };
		}
	}

	const bareNightSuffix = parseNightSuffix(trimmed, nightTime);
	if (bareNightSuffix) {
		return { date: atStartOfDay(now), matchedLength: leadingWhitespace + bareNightSuffix.matchedLength, timeOfDay: bareNightSuffix.timeOfDay };
	}

	return null;
}

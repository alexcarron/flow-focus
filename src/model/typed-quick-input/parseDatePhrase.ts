import Weekday from '../time-management/Weekday';

export type ParsedDatePhrase = {
	date: Date;
	matchedLength: number;
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

function nextDateForWeekday(weekday: Weekday, includeToday: boolean, now: Date): Date {
	const targetJavascriptDay = weekdayToJavascriptDay(weekday);
	const today = atStartOfDay(now);
	let daysUntilTarget = (targetJavascriptDay - today.getDay() + 7) % 7;
	if (daysUntilTarget === 0 && !includeToday) {
		daysUntilTarget = 7;
	}
	today.setDate(today.getDate() + daysUntilTarget);
	return today;
}

function parseRelativeDay(text: string, now: Date): ParsedDatePhrase | null {
	const match = /^(today|tomorrow|tonight)/i.exec(text);
	if (!match) return null;

	const keyword = match[1].toLowerCase();
	const date = atStartOfDay(now);
	if (keyword === 'tomorrow') {
		date.setDate(date.getDate() + 1);
	}
	return { date, matchedLength: match[0].length };
}

function parseNextWeekday(text: string, now: Date): ParsedDatePhrase | null {
	const match = new RegExp(`^next\\s+(${weekdayAlternation})`, 'i').exec(text);
	if (!match) return null;

	const weekday = weekdayNameToWeekday[match[1].toLowerCase()];
	const upcoming = nextDateForWeekday(weekday, false, now);
	upcoming.setDate(upcoming.getDate() + 7);
	return { date: upcoming, matchedLength: match[0].length };
}

function parseWeekday(text: string, now: Date): ParsedDatePhrase | null {
	const match = new RegExp(`^(${weekdayAlternation})`, 'i').exec(text);
	if (!match) return null;

	const weekday = weekdayNameToWeekday[match[1].toLowerCase()];
	return { date: nextDateForWeekday(weekday, true, now), matchedLength: match[0].length };
}

function parseMonthAndDay(text: string, now: Date): ParsedDatePhrase | null {
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

export default function parseDatePhrase(text: string, now: Date = new Date()): ParsedDatePhrase | null {
	const leadingWhitespace = /^\s*/.exec(text)?.[0].length ?? 0;
	const trimmed = text.slice(leadingWhitespace);

	for (const parse of dateParsers) {
		const parsed = parse(trimmed, now);
		if (parsed) {
			return { date: parsed.date, matchedLength: leadingWhitespace + parsed.matchedLength };
		}
	}

	return null;
}

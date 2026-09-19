const WEEKDAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getStartOfDay(date: Date): Date {
	const startOfDay = new Date(date);
	startOfDay.setHours(0, 0, 0, 0);
	return startOfDay;
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameCalendarYear(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear();
}

export function getStartOfWeek(date: Date): Date {
	const startOfWeek = getStartOfDay(date);
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
	return startOfWeek;
}

export function isDateWithinRange(date: Date, rangeStart: Date, rangeEnd: Date): boolean {
	return date >= rangeStart && date <= rangeEnd;
}

export function formatTimeOfDay(date: Date): string {
	let hours = date.getHours();
	const minutes = date.getMinutes();
	const amOrPm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12 || 12;

	if (minutes === 0) {
		return `${hours}${amOrPm}`;
	}
	return `${hours}:${minutes.toString().padStart(2, '0')}${amOrPm}`;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function formatUpcomingWeekday(date: Date, now: Date): string | null {
	const daysFromToday = Math.round((getStartOfDay(date).getTime() - getStartOfDay(now).getTime()) / MILLISECONDS_PER_DAY);
	const weekdayAbbreviation = WEEKDAY_ABBREVIATIONS[date.getDay()];

	if (daysFromToday >= 1 && daysFromToday <= 6) {
		return weekdayAbbreviation;
	}
	if (daysFromToday === 7) {
		return `Next ${weekdayAbbreviation}`;
	}
	return null;
}

export function formatDate(date: Date | null, fallback = ''): string {
	if (date === null) return fallback;

	const now = new Date();

	if (isSameCalendarDay(date, now)) {
		return formatTimeOfDay(date);
	}

	const startOfYesterday = getStartOfDay(addDays(now, -1));
	const startOfDayAfterTomorrow = getStartOfDay(addDays(now, 2));
	if (date >= startOfYesterday && date < now) {
		return `Yesterday ${formatTimeOfDay(date)}`;
	}
	if (date <= startOfDayAfterTomorrow && date > now) {
		return `Tomorrow ${formatTimeOfDay(date)}`;
	}

	const startOfThisWeek = getStartOfWeek(now);
	const startOfLastWeek = addDays(startOfThisWeek, -7);

	if (isDateWithinRange(date, startOfLastWeek, startOfThisWeek)) {
		return `Last ${WEEKDAY_ABBREVIATIONS[date.getDay()]} ${formatTimeOfDay(date)}`;
	}

	const upcomingWeekdayText = formatUpcomingWeekday(date, now);
	if (upcomingWeekdayText !== null) {
		return `${upcomingWeekdayText} ${formatTimeOfDay(date)}`;
	}

	if (isSameCalendarYear(date, now)) {
		return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()} ${formatTimeOfDay(date)}`;
	}

	return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()} ${date.getFullYear()} ${formatTimeOfDay(date)}`;
}

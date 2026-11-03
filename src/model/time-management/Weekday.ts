enum Weekday {
	MONDAY = 1,
	TUESDAY = 2,
	WEDNESDAY = 3,
	THURSDAY = 4,
	FRIDAY = 5,
	SATURDAY = 6,
	SUNDAY = 7,
}

export const WEEKDAYS_FROM_MONDAY: readonly Weekday[] = [
	Weekday.MONDAY,
	Weekday.TUESDAY,
	Weekday.WEDNESDAY,
	Weekday.THURSDAY,
	Weekday.FRIDAY,
	Weekday.SATURDAY,
	Weekday.SUNDAY,
];

const weekdayToAbbreviatedName: Record<Weekday, string> = {
	[Weekday.MONDAY]: 'Mon',
	[Weekday.TUESDAY]: 'Tue',
	[Weekday.WEDNESDAY]: 'Wed',
	[Weekday.THURSDAY]: 'Thu',
	[Weekday.FRIDAY]: 'Fri',
	[Weekday.SATURDAY]: 'Sat',
	[Weekday.SUNDAY]: 'Sun',
};

const weekdayToFullName: Record<Weekday, string> = {
	[Weekday.MONDAY]: 'Monday',
	[Weekday.TUESDAY]: 'Tuesday',
	[Weekday.WEDNESDAY]: 'Wednesday',
	[Weekday.THURSDAY]: 'Thursday',
	[Weekday.FRIDAY]: 'Friday',
	[Weekday.SATURDAY]: 'Saturday',
	[Weekday.SUNDAY]: 'Sunday',
};

const SUNDAY_JAVASCRIPT_DAY = 0;

export function getWeekdayOfDate(date: Date): Weekday {
	const javascriptDay = date.getDay();
	if (javascriptDay === SUNDAY_JAVASCRIPT_DAY) return Weekday.SUNDAY;
	return javascriptDay as Weekday;
}

export function isWeekday(value: unknown): value is Weekday {
	return typeof value === 'number' && (WEEKDAYS_FROM_MONDAY as readonly number[]).includes(value);
}

export function getAbbreviatedNameOfWeekday(weekday: Weekday): string {
	return weekdayToAbbreviatedName[weekday];
}

export function getFullNameOfWeekday(weekday: Weekday): string {
	return weekdayToFullName[weekday];
}

export default Weekday

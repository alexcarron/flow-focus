enum RecurrenceUnit {
	Hour = 'hour',
	Day = 'day',
	Week = 'week',
	Month = 'month',
	Year = 'year',
}

export const RECURRENCE_UNITS_LARGEST_FIRST: readonly RecurrenceUnit[] = [
	RecurrenceUnit.Year,
	RecurrenceUnit.Month,
	RecurrenceUnit.Week,
	RecurrenceUnit.Day,
	RecurrenceUnit.Hour,
];

export function isRecurrenceUnit(value: unknown): value is RecurrenceUnit {
	return typeof value === 'string' && (RECURRENCE_UNITS_LARGEST_FIRST as readonly string[]).includes(value);
}

export default RecurrenceUnit;

import Weekday, { getAbbreviatedNameOfWeekday, isWeekday, WEEKDAYS_FROM_MONDAY } from '../../time-management/Weekday';
import RecurrenceUnit, { RECURRENCE_UNITS_LARGEST_FIRST, isRecurrenceUnit } from './RecurrenceUnit';

type RecurrenceDuration = {
	amount: number;
	unit: RecurrenceUnit;
	weekdays?: Weekday[];
};

export default RecurrenceDuration;

const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const APPROXIMATE_DAYS_PER_MONTH = 30;
const APPROXIMATE_DAYS_PER_YEAR = 365;

const recurrenceUnitToApproximateMilliseconds: Record<RecurrenceUnit, number> = {
	[RecurrenceUnit.Hour]: MILLISECONDS_PER_HOUR,
	[RecurrenceUnit.Day]: MILLISECONDS_PER_HOUR * HOURS_PER_DAY,
	[RecurrenceUnit.Week]: MILLISECONDS_PER_HOUR * HOURS_PER_DAY * DAYS_PER_WEEK,
	[RecurrenceUnit.Month]: MILLISECONDS_PER_HOUR * HOURS_PER_DAY * APPROXIMATE_DAYS_PER_MONTH,
	[RecurrenceUnit.Year]: MILLISECONDS_PER_HOUR * HOURS_PER_DAY * APPROXIMATE_DAYS_PER_YEAR,
};

export function canRecurrenceDurationHaveWeekdays(recurrenceDuration: Pick<RecurrenceDuration, 'amount' | 'unit'>): boolean {
	return recurrenceDuration.amount === 1 && recurrenceDuration.unit === RecurrenceUnit.Week;
}

function isValidWeekdaysOfRecurrenceDuration(candidate: Record<string, unknown>): boolean {
	if (candidate.weekdays === undefined) return true;
	if (!Array.isArray(candidate.weekdays) || !candidate.weekdays.every(isWeekday)) return false;
	if (candidate.weekdays.length === 0) return true;
	return canRecurrenceDurationHaveWeekdays({
		amount: candidate.amount as number,
		unit: candidate.unit as RecurrenceUnit,
	});
}

export function isRecurrenceDuration(value: unknown): value is RecurrenceDuration {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.amount === 'number' &&
		Number.isInteger(candidate.amount) &&
		candidate.amount >= 1 &&
		isRecurrenceUnit(candidate.unit) &&
		isValidWeekdaysOfRecurrenceDuration(candidate)
	);
}

export function getWeekdaysOfRecurrenceDuration(recurrenceDuration: RecurrenceDuration): Weekday[] {
	const weekdays = recurrenceDuration.weekdays ?? [];
	return WEEKDAYS_FROM_MONDAY.filter(weekday => weekdays.includes(weekday));
}

export function hasRecurrenceWeekdays(recurrenceDuration: RecurrenceDuration): boolean {
	return getWeekdaysOfRecurrenceDuration(recurrenceDuration).length > 0;
}

export function cloneRecurrenceDuration(recurrenceDuration: RecurrenceDuration): RecurrenceDuration {
	if (recurrenceDuration.weekdays === undefined) return { ...recurrenceDuration };
	return { ...recurrenceDuration, weekdays: [...recurrenceDuration.weekdays] };
}

export function areRecurrenceDurationsEqual(left: RecurrenceDuration | null, right: RecurrenceDuration | null): boolean {
	if (left === null || right === null) return left === right;
	const leftWeekdays = getWeekdaysOfRecurrenceDuration(left);
	const rightWeekdays = getWeekdaysOfRecurrenceDuration(right);
	return (
		left.amount === right.amount &&
		left.unit === right.unit &&
		leftWeekdays.length === rightWeekdays.length &&
		leftWeekdays.every((weekday, index) => weekday === rightWeekdays[index])
	);
}

export function getApproximateMillisecondsOfRecurrenceDuration(recurrenceDuration: RecurrenceDuration): number {
	const approximateMillisecondsOfWholeDuration = recurrenceDuration.amount * recurrenceUnitToApproximateMilliseconds[recurrenceDuration.unit];
	const occurrencesPerWholeDuration = Math.max(1, getWeekdaysOfRecurrenceDuration(recurrenceDuration).length);
	return approximateMillisecondsOfWholeDuration / occurrencesPerWholeDuration;
}

export function recurrenceDurationFromApproximateMilliseconds(milliseconds: number): RecurrenceDuration {
	for (const unit of RECURRENCE_UNITS_LARGEST_FIRST) {
		const unitMilliseconds = recurrenceUnitToApproximateMilliseconds[unit];
		if (milliseconds >= unitMilliseconds && milliseconds % unitMilliseconds === 0) {
			return { amount: milliseconds / unitMilliseconds, unit };
		}
	}
	const wholeHours = Math.max(1, Math.round(milliseconds / MILLISECONDS_PER_HOUR));
	return { amount: wholeHours, unit: RecurrenceUnit.Hour };
}

export function formatWeekdaysOfRecurrenceDuration(recurrenceDuration: RecurrenceDuration): string {
	return getWeekdaysOfRecurrenceDuration(recurrenceDuration).map(getAbbreviatedNameOfWeekday).join(', ');
}

export function formatRecurrenceDuration(recurrenceDuration: RecurrenceDuration): string {
	const formattedAmountAndUnit = recurrenceDuration.amount === 1
		? recurrenceDuration.unit
		: `${recurrenceDuration.amount} ${recurrenceDuration.unit}s`;
	if (!hasRecurrenceWeekdays(recurrenceDuration)) return formattedAmountAndUnit;
	return `${formattedAmountAndUnit} on ${formatWeekdaysOfRecurrenceDuration(recurrenceDuration)}`;
}

function getDaysInMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate();
}

function addCalendarMonthsClampingDayOfMonth(date: Date, monthsToAdd: number): Date {
	const result = new Date(date.getTime());
	const targetMonthIndexFromYearStart = date.getMonth() + monthsToAdd;
	const targetYear = date.getFullYear() + Math.floor(targetMonthIndexFromYearStart / 12);
	const targetMonthIndex = ((targetMonthIndexFromYearStart % 12) + 12) % 12;
	const clampedDayOfMonth = Math.min(date.getDate(), getDaysInMonth(targetYear, targetMonthIndex));
	result.setFullYear(targetYear, targetMonthIndex, clampedDayOfMonth);
	return result;
}

function addCalendarDays(date: Date, daysToAdd: number): Date {
	const result = new Date(date.getTime());
	result.setDate(result.getDate() + daysToAdd);
	return result;
}

export function addRecurrenceDurations(date: Date, recurrenceDuration: RecurrenceDuration, timesToAdd: number): Date {
	const totalAmount = recurrenceDuration.amount * timesToAdd;
	switch (recurrenceDuration.unit) {
		case RecurrenceUnit.Hour:
			return new Date(date.getTime() + totalAmount * MILLISECONDS_PER_HOUR);
		case RecurrenceUnit.Day:
			return addCalendarDays(date, totalAmount);
		case RecurrenceUnit.Week:
			return addCalendarDays(date, totalAmount * DAYS_PER_WEEK);
		case RecurrenceUnit.Month:
			return addCalendarMonthsClampingDayOfMonth(date, totalAmount);
		case RecurrenceUnit.Year:
			return addCalendarMonthsClampingDayOfMonth(date, totalAmount * 12);
	}
}

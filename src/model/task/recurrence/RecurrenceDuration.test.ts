import { describe, it, expect } from 'vitest';
import RecurrenceUnit from './RecurrenceUnit';
import {
	addRecurrenceDurations,
	areRecurrenceDurationsEqual,
	formatRecurrenceDuration,
	getApproximateMillisecondsOfRecurrenceDuration,
	isRecurrenceDuration,
	recurrenceDurationFromApproximateMilliseconds,
} from './RecurrenceDuration';

const ONE_HOUR_MILLISECONDS = 60 * 60 * 1000;
const ONE_DAY_MILLISECONDS = 24 * ONE_HOUR_MILLISECONDS;

describe('addRecurrenceDurations', () => {
	it('adds whole hours', () => {
		const result = addRecurrenceDurations(new Date(2026, 0, 1, 9), { amount: 6, unit: RecurrenceUnit.Hour }, 2);
		expect(result).toEqual(new Date(2026, 0, 1, 21));
	});

	it('adds calendar days keeping the same wall-clock time', () => {
		const result = addRecurrenceDurations(new Date(2026, 0, 30, 9, 30), { amount: 1, unit: RecurrenceUnit.Day }, 3);
		expect(result).toEqual(new Date(2026, 1, 2, 9, 30));
	});

	it('adds calendar weeks', () => {
		const result = addRecurrenceDurations(new Date(2026, 8, 7, 9), { amount: 2, unit: RecurrenceUnit.Week }, 3);
		expect(result).toEqual(new Date(2026, 9, 19, 9));
	});

	it('adds months from the anchor and clamps to the last day of shorter months', () => {
		const anchor = new Date(2026, 0, 31, 9);
		const monthly = { amount: 1, unit: RecurrenceUnit.Month };
		expect(addRecurrenceDurations(anchor, monthly, 1)).toEqual(new Date(2026, 1, 28, 9));
		expect(addRecurrenceDurations(anchor, monthly, 2)).toEqual(new Date(2026, 2, 31, 9));
		expect(addRecurrenceDurations(anchor, monthly, 3)).toEqual(new Date(2026, 3, 30, 9));
		expect(addRecurrenceDurations(anchor, monthly, 12)).toEqual(new Date(2027, 0, 31, 9));
	});

	it('adds years and clamps a leap day to the end of February', () => {
		const anchor = new Date(2024, 1, 29, 9);
		const yearly = { amount: 1, unit: RecurrenceUnit.Year };
		expect(addRecurrenceDurations(anchor, yearly, 1)).toEqual(new Date(2025, 1, 28, 9));
		expect(addRecurrenceDurations(anchor, yearly, 4)).toEqual(new Date(2028, 1, 29, 9));
	});

	it('returns the same instant when adding zero times', () => {
		const anchor = new Date(2026, 5, 15, 9);
		expect(addRecurrenceDurations(anchor, { amount: 3, unit: RecurrenceUnit.Week }, 0)).toEqual(anchor);
	});
});

describe('recurrenceDurationFromApproximateMilliseconds', () => {
	it('picks the largest unit that divides the interval evenly', () => {
		expect(recurrenceDurationFromApproximateMilliseconds(7 * ONE_DAY_MILLISECONDS)).toEqual({ amount: 1, unit: RecurrenceUnit.Week });
		expect(recurrenceDurationFromApproximateMilliseconds(14 * ONE_DAY_MILLISECONDS)).toEqual({ amount: 2, unit: RecurrenceUnit.Week });
		expect(recurrenceDurationFromApproximateMilliseconds(30 * ONE_DAY_MILLISECONDS)).toEqual({ amount: 1, unit: RecurrenceUnit.Month });
		expect(recurrenceDurationFromApproximateMilliseconds(365 * ONE_DAY_MILLISECONDS)).toEqual({ amount: 1, unit: RecurrenceUnit.Year });
		expect(recurrenceDurationFromApproximateMilliseconds(3 * ONE_DAY_MILLISECONDS)).toEqual({ amount: 3, unit: RecurrenceUnit.Day });
		expect(recurrenceDurationFromApproximateMilliseconds(6 * ONE_HOUR_MILLISECONDS)).toEqual({ amount: 6, unit: RecurrenceUnit.Hour });
	});

	it('rounds intervals that fit no unit to whole hours, never below one hour', () => {
		expect(recurrenceDurationFromApproximateMilliseconds(90 * 60 * 1000)).toEqual({ amount: 2, unit: RecurrenceUnit.Hour });
		expect(recurrenceDurationFromApproximateMilliseconds(1000)).toEqual({ amount: 1, unit: RecurrenceUnit.Hour });
	});

	it('round-trips through the approximate millisecond length', () => {
		const duration = { amount: 3, unit: RecurrenceUnit.Week };
		expect(recurrenceDurationFromApproximateMilliseconds(getApproximateMillisecondsOfRecurrenceDuration(duration))).toEqual(duration);
	});
});

describe('formatRecurrenceDuration', () => {
	it('uses the singular unit for an amount of one', () => {
		expect(formatRecurrenceDuration({ amount: 1, unit: RecurrenceUnit.Week })).toBe('week');
	});

	it('uses the amount and plural unit otherwise', () => {
		expect(formatRecurrenceDuration({ amount: 3, unit: RecurrenceUnit.Month })).toBe('3 months');
	});
});

describe('areRecurrenceDurationsEqual', () => {
	it('compares amount and unit', () => {
		expect(areRecurrenceDurationsEqual({ amount: 1, unit: RecurrenceUnit.Day }, { amount: 1, unit: RecurrenceUnit.Day })).toBe(true);
		expect(areRecurrenceDurationsEqual({ amount: 1, unit: RecurrenceUnit.Day }, { amount: 2, unit: RecurrenceUnit.Day })).toBe(false);
		expect(areRecurrenceDurationsEqual({ amount: 1, unit: RecurrenceUnit.Day }, null)).toBe(false);
		expect(areRecurrenceDurationsEqual(null, null)).toBe(true);
	});
});

describe('isRecurrenceDuration', () => {
	it('accepts a positive whole amount with a known unit', () => {
		expect(isRecurrenceDuration({ amount: 2, unit: 'week' })).toBe(true);
	});

	it('rejects unknown units and non-positive or fractional amounts', () => {
		expect(isRecurrenceDuration({ amount: 2, unit: 'fortnight' })).toBe(false);
		expect(isRecurrenceDuration({ amount: 0, unit: 'week' })).toBe(false);
		expect(isRecurrenceDuration({ amount: 1.5, unit: 'week' })).toBe(false);
		expect(isRecurrenceDuration(null)).toBe(false);
	});
});

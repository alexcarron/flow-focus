import { describe, it, expect } from 'vitest';
import RecurrenceUnit from './RecurrenceUnit';
import Weekday from '../../time-management/Weekday';
import { computeCurrentTaskOccurrence, computeOccurrenceAtIndex, getCurrentOccurrenceIndex, getLatestStartedOccurrenceIndex, TaskRecurrenceSnapshot } from './computeTaskOccurrence';

const weeklyFromMondayMorning: TaskRecurrenceSnapshot = {
	anchorStartTime: new Date(2026, 8, 7, 9, 0, 0),
	anchorEndTime: null,
	anchorDeadline: new Date(2026, 8, 13, 20, 0, 0),
	recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Week },
	completedOccurrenceIndex: null,
	skippedOccurrenceIndex: null,
	shouldNotSkipMissedOccurrences: false,
};

function atLocalTime(year: number, monthIndex: number, day: number, hour: number, minute: number = 0): Date {
	return new Date(year, monthIndex, day, hour, minute, 0);
}

describe('getLatestStartedOccurrenceIndex', () => {
	it('returns null before the anchor occurrence starts', () => {
		expect(getLatestStartedOccurrenceIndex(weeklyFromMondayMorning, atLocalTime(2026, 8, 7, 8, 59))).toBeNull();
	});

	it('returns 0 at the exact anchor start', () => {
		expect(getLatestStartedOccurrenceIndex(weeklyFromMondayMorning, atLocalTime(2026, 8, 7, 9))).toBe(0);
	});

	it('returns the occurrence whose start is the latest one not after the current time', () => {
		expect(getLatestStartedOccurrenceIndex(weeklyFromMondayMorning, atLocalTime(2026, 8, 13, 23))).toBe(0);
		expect(getLatestStartedOccurrenceIndex(weeklyFromMondayMorning, atLocalTime(2026, 8, 14, 9))).toBe(1);
		expect(getLatestStartedOccurrenceIndex(weeklyFromMondayMorning, atLocalTime(2026, 9, 5, 12))).toBe(4);
	});

	it('handles monthly recurrences whose lengths vary', () => {
		const monthlyFromJanuary31 = {
			anchorStartTime: atLocalTime(2026, 0, 31, 9),
			recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Month },
		};
		expect(getLatestStartedOccurrenceIndex(monthlyFromJanuary31, atLocalTime(2026, 1, 28, 8))).toBe(0);
		expect(getLatestStartedOccurrenceIndex(monthlyFromJanuary31, atLocalTime(2026, 1, 28, 10))).toBe(1);
		expect(getLatestStartedOccurrenceIndex(monthlyFromJanuary31, atLocalTime(2026, 2, 31, 10))).toBe(2);
		expect(getLatestStartedOccurrenceIndex(monthlyFromJanuary31, atLocalTime(2027, 0, 30, 10))).toBe(11);
	});
});

describe('computeCurrentTaskOccurrence', () => {
	describe('normal weekly advance', () => {
		it('stays on the anchor occurrence through its whole week', () => {
			const occurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 13, 23, 59));

			expect(occurrence.index).toBe(0);
			expect(occurrence.startTime).toEqual(atLocalTime(2026, 8, 7, 9));
			expect(occurrence.deadline).toEqual(atLocalTime(2026, 8, 13, 20));
		});

		it('advances by exactly one week once the next occurrence starts', () => {
			const occurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 14, 9));

			expect(occurrence.index).toBe(1);
			expect(occurrence.startTime).toEqual(atLocalTime(2026, 8, 14, 9));
			expect(occurrence.deadline).toEqual(atLocalTime(2026, 8, 20, 20));
		});

		it('never moves the deadline more than one cycle from its start time', () => {
			const occurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 21, 9));

			expect(occurrence.startTime).toEqual(atLocalTime(2026, 8, 21, 9));
			expect(occurrence.deadline).toEqual(atLocalTime(2026, 8, 27, 20));
		});
	});

	describe('opening the app late, after the deadline has passed', () => {
		it('lands on the occurrence containing now, skipping every missed one', () => {
			const occurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 9, 7, 15));

			expect(occurrence.index).toBe(4);
			expect(occurrence.startTime).toEqual(atLocalTime(2026, 9, 5, 9));
			expect(occurrence.deadline).toEqual(atLocalTime(2026, 9, 11, 20));
		});

		it('stays on the first missed occurrence when the task should not skip missed occurrences', () => {
			const occurrence = computeCurrentTaskOccurrence({
				...weeklyFromMondayMorning,
				shouldNotSkipMissedOccurrences: true,
			}, atLocalTime(2026, 9, 7, 15));

			expect(occurrence.index).toBe(0);
			expect(occurrence.deadline).toEqual(atLocalTime(2026, 8, 13, 20));
		});

		it('moves to the very next occurrence after the missed one is completed when not skipping missed occurrences', () => {
			const occurrence = computeCurrentTaskOccurrence({
				...weeklyFromMondayMorning,
				shouldNotSkipMissedOccurrences: true,
				completedOccurrenceIndex: 0,
			}, atLocalTime(2026, 9, 7, 15));

			expect(occurrence.index).toBe(1);
		});

		it('moves to the very next occurrence after the missed one is skipped when not skipping missed occurrences', () => {
			const occurrence = computeCurrentTaskOccurrence({
				...weeklyFromMondayMorning,
				shouldNotSkipMissedOccurrences: true,
				skippedOccurrenceIndex: 0,
			}, atLocalTime(2026, 9, 7, 15));

			expect(occurrence.index).toBe(1);
		});
	});

	describe('opening the app on a second device after time has passed on the first', () => {
		it('derives the same occurrence from the same stored row regardless of which device computes it', () => {
			const firstDeviceOccurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 20, 10));
			const secondDeviceOccurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 20, 10, 3));

			expect(secondDeviceOccurrence).toEqual(firstDeviceOccurrence);
		});

		it('does not depend on how many times or how recently the calculation last ran', () => {
			const afterManyTicks = [
				atLocalTime(2026, 8, 8, 10),
				atLocalTime(2026, 8, 14, 10),
				atLocalTime(2026, 8, 19, 10),
				atLocalTime(2026, 8, 20, 10),
			].map(currentTime => computeCurrentTaskOccurrence(weeklyFromMondayMorning, currentTime)).at(-1);
			const afterOneJump = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 20, 10));

			expect(afterOneJump).toEqual(afterManyTicks);
		});

		it('shows the occurrence completed on the first device as complete on the second device until the next occurrence starts', () => {
			const rowSyncedFromFirstDevice = { ...weeklyFromMondayMorning, completedOccurrenceIndex: 1 };

			expect(getCurrentOccurrenceIndex(rowSyncedFromFirstDevice, atLocalTime(2026, 8, 20, 10))).toBe(1);
			expect(getCurrentOccurrenceIndex(rowSyncedFromFirstDevice, atLocalTime(2026, 8, 21, 10))).toBe(2);
		});

		it('is unaffected by small clock drift between devices away from an occurrence boundary', () => {
			const clockDriftMilliseconds = 5 * 60 * 1000;
			const firstDeviceTime = atLocalTime(2026, 8, 17, 12);
			const secondDeviceTime = new Date(firstDeviceTime.getTime() + clockDriftMilliseconds);

			expect(getCurrentOccurrenceIndex(weeklyFromMondayMorning, secondDeviceTime))
				.toBe(getCurrentOccurrenceIndex(weeklyFromMondayMorning, firstDeviceTime));
		});
	});

	describe('a task completed early or late relative to its window', () => {
		it('counts an early completion (before the deadline) for the occurrence containing now', () => {
			const completedEarly = { ...weeklyFromMondayMorning, completedOccurrenceIndex: 1 };

			expect(getCurrentOccurrenceIndex(completedEarly, atLocalTime(2026, 8, 15, 9))).toBe(1);
			expect(getCurrentOccurrenceIndex(completedEarly, atLocalTime(2026, 8, 20, 21))).toBe(1);
			expect(getCurrentOccurrenceIndex(completedEarly, atLocalTime(2026, 8, 21, 9))).toBe(2);
		});

		it('counts a late completion (after the deadline, before the next start) for the occurrence containing now', () => {
			const lateCompletionTime = atLocalTime(2026, 8, 20, 22);
			const occurrenceContainingLateCompletion = getCurrentOccurrenceIndex(weeklyFromMondayMorning, lateCompletionTime);

			expect(occurrenceContainingLateCompletion).toBe(1);

			const completedLate = { ...weeklyFromMondayMorning, completedOccurrenceIndex: occurrenceContainingLateCompletion };
			expect(getCurrentOccurrenceIndex(completedLate, lateCompletionTime)).toBe(1);
			expect(getCurrentOccurrenceIndex(completedLate, atLocalTime(2026, 8, 21, 9))).toBe(2);
		});

		it('treats a completion of an older occurrence as not completing the current one', () => {
			const completedLastWeek = { ...weeklyFromMondayMorning, completedOccurrenceIndex: 0 };

			expect(getCurrentOccurrenceIndex(completedLastWeek, atLocalTime(2026, 8, 15, 9))).toBe(1);
		});

		it('moves on to the next occurrence when the occurrence containing now was skipped', () => {
			const skippedThisWeek = { ...weeklyFromMondayMorning, skippedOccurrenceIndex: 1 };

			expect(getCurrentOccurrenceIndex(skippedThisWeek, atLocalTime(2026, 8, 15, 9))).toBe(2);
		});

		it('lets a completion win over an older skip', () => {
			const skippedThenCompleted = { ...weeklyFromMondayMorning, skippedOccurrenceIndex: 0, completedOccurrenceIndex: 1 };

			expect(getCurrentOccurrenceIndex(skippedThenCompleted, atLocalTime(2026, 8, 15, 9))).toBe(1);
		});
	});

	it('stays on the anchor occurrence before it starts', () => {
		const occurrence = computeCurrentTaskOccurrence(weeklyFromMondayMorning, atLocalTime(2026, 8, 1, 9));

		expect(occurrence.index).toBe(0);
		expect(occurrence.startTime).toEqual(atLocalTime(2026, 8, 7, 9));
	});

	it('shifts the end time along with the occurrence', () => {
		const occurrence = computeCurrentTaskOccurrence({
			...weeklyFromMondayMorning,
			anchorEndTime: atLocalTime(2026, 8, 13, 22),
		}, atLocalTime(2026, 8, 14, 9));

		expect(occurrence.endTime).toEqual(atLocalTime(2026, 8, 20, 22));
	});
});

describe('weekday repeats', () => {
	const tuesdaysAndThursdaysFromTuesdayMorning: TaskRecurrenceSnapshot = {
		anchorStartTime: atLocalTime(2026, 8, 8, 7),
		anchorEndTime: null,
		anchorDeadline: atLocalTime(2026, 8, 8, 23),
		recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Week, weekdays: [Weekday.TUESDAY, Weekday.THURSDAY] },
		completedOccurrenceIndex: null,
		skippedOccurrenceIndex: null,
		shouldNotSkipMissedOccurrences: false,
	};

	it('places each occurrence on the next chosen weekday, keeping the anchor time of day', () => {
		expect(computeOccurrenceAtIndex(tuesdaysAndThursdaysFromTuesdayMorning, 1).startTime).toEqual(atLocalTime(2026, 8, 10, 7));
		expect(computeOccurrenceAtIndex(tuesdaysAndThursdaysFromTuesdayMorning, 2).startTime).toEqual(atLocalTime(2026, 8, 15, 7));
		expect(computeOccurrenceAtIndex(tuesdaysAndThursdaysFromTuesdayMorning, 5).startTime).toEqual(atLocalTime(2026, 8, 24, 7));
	});

	it('wraps into the next week when the anchor is on the last chosen weekday', () => {
		const fromThursday = { ...tuesdaysAndThursdaysFromTuesdayMorning, anchorStartTime: atLocalTime(2026, 8, 10, 7) };
		expect(computeOccurrenceAtIndex(fromThursday, 1).startTime).toEqual(atLocalTime(2026, 8, 15, 7));
		expect(computeOccurrenceAtIndex(fromThursday, 2).startTime).toEqual(atLocalTime(2026, 8, 17, 7));
	});

	it('gives every occurrence a deadline at the same time on its own day', () => {
		expect(computeOccurrenceAtIndex(tuesdaysAndThursdaysFromTuesdayMorning, 1).deadline).toEqual(atLocalTime(2026, 8, 10, 23));
		expect(computeOccurrenceAtIndex(tuesdaysAndThursdaysFromTuesdayMorning, 2).deadline).toEqual(atLocalTime(2026, 8, 15, 23));
	});

	it('keeps the deadline day offset but clamps it to the next occurrence start', () => {
		const dueThreeDaysAfterStart = { ...tuesdaysAndThursdaysFromTuesdayMorning, anchorDeadline: atLocalTime(2026, 8, 11, 17) };
		expect(computeOccurrenceAtIndex(dueThreeDaysAfterStart, 0).deadline).toEqual(atLocalTime(2026, 8, 10, 7));
		expect(computeOccurrenceAtIndex(dueThreeDaysAfterStart, 1).deadline).toEqual(atLocalTime(2026, 8, 13, 17));
	});

	it('finds the current occurrence between chosen weekdays', () => {
		expect(getLatestStartedOccurrenceIndex(tuesdaysAndThursdaysFromTuesdayMorning, atLocalTime(2026, 8, 12, 12))).toBe(1);
		expect(getLatestStartedOccurrenceIndex(tuesdaysAndThursdaysFromTuesdayMorning, atLocalTime(2026, 8, 15, 6, 59))).toBe(1);
		expect(getLatestStartedOccurrenceIndex(tuesdaysAndThursdaysFromTuesdayMorning, atLocalTime(2026, 9, 1, 7))).toBe(7);
	});
});

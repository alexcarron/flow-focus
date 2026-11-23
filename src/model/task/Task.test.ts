import TimeWindow from '../time-management/TimeWindow';
import TasksManager from "../TasksManager";
import StepStatus from "./step/StepStatus";
import Step from "./step/Step";
import Task from "./Task";
import RecurrenceDuration from "./recurrence/RecurrenceDuration";
import RecurrenceUnit from "./recurrence/RecurrenceUnit";
import Weekday from "../time-management/Weekday";

const oneHour: RecurrenceDuration = { amount: 1, unit: RecurrenceUnit.Hour };
const oneDay: RecurrenceDuration = { amount: 1, unit: RecurrenceUnit.Day };
const oneWeek: RecurrenceDuration = { amount: 1, unit: RecurrenceUnit.Week };

function getStepTexts(task: Task): string[] {
	return task.getSteps().map(step => step.text);
}

function findStepByText(task: Task, text: string): Step {
	const step = task.getSteps().find(step => step.text === text);
	if (!step) throw new Error(`No step with text "${text}" found`);
	return step;
}

describe('Task', () => {
	let tasksManager: TasksManager = new TasksManager();
	let task: Task;

	beforeEach(() => {
			task = tasksManager.addCreatedTask('Sample Task');
	});

	it('should initialize with description', () => {
			expect(task.getDescription()).toEqual('Sample Task');
	});

	it('changeDescription should change description', () => {
			task.setDescription('New Description');
			expect(task.getDescription()).toEqual('New Description');
	});

	describe('isRecurring', () => {
		it('should return true if task is recurring', () => {
			task.makeRecurring(oneDay, new Date());
			expect(task.isRecurring()).toBe(true);
		});

		it('should return false if task is not recurring', () => {
			task.setDueDate(new Date());
			task.setStartDate(new Date());
			task.setMinRequiredTime(1000);
			task.setMaxRequiredTime(2000);
			expect(task.isRecurring()).toBe(false);
		});
	})

	describe('makeRecurring', () => {
		it('moves the anchor occurrence forward to the first chosen weekday, keeping its due date offset', () => {
			const mondayMorning = new Date(2026, 8, 7, 7, 0);
			const tuesdaysAndThursdays: RecurrenceDuration = { amount: 1, unit: RecurrenceUnit.Week, weekdays: [Weekday.TUESDAY, Weekday.THURSDAY] };
			task.setDueDate(new Date(2026, 8, 7, 23, 0));

			task.makeRecurring(tuesdaysAndThursdays, mondayMorning, mondayMorning);

			expect(task.getAnchorStartDate()).toEqual(new Date(2026, 8, 8, 7, 0));
			expect(task.getAnchorDueDate()).toEqual(new Date(2026, 8, 8, 23, 0));
		});

		it('moves the anchor occurrence to a chosen weekday when the timing options change', () => {
			const mondayMorning = new Date(2026, 8, 7, 7, 0);
			task.setFromTaskTimingOptions({
				startDate: mondayMorning,
				targetDate: null,
				dueDate: new Date(2026, 8, 7, 23, 0),
				minDuration: null,
				maxDuration: null,
				recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Week, weekdays: [Weekday.FRIDAY] },
				shouldNotSkipMissedOccurrences: false,
			}, mondayMorning);

			expect(task.getAnchorStartDate()).toEqual(new Date(2026, 8, 11, 7, 0));
			expect(task.getAnchorDueDate()).toEqual(new Date(2026, 8, 11, 23, 0));
		});

		it('should set the recurrence duration and anchor start date', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');

			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);

			expect(task.getRecurrenceDuration()).toEqual(oneDay);
			expect(task.getAnchorStartDate()).toEqual(anchorStartDate);
			expect(task.getStartDate()).toEqual(anchorStartDate);
		});

		it('should set the target date to the next occurrence start if neither a target date nor a due date is set', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.makeRecurring(oneHour, anchorStartDate, anchorStartDate);

			expect(task.getTargetDate()).toEqual(new Date('2023-01-01T09:00:00Z'));
			expect(task.getDueDate()).toBeNull();
		});

		it('should leave the target date empty if only a due date is set', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.setDueDate(new Date('2023-01-01T08:30:00Z'));

			task.makeRecurring(oneHour, anchorStartDate, anchorStartDate);

			expect(task.getTargetDate()).toBeNull();
		});

		it('should clamp the target date to the next occurrence start if the target date is past it', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.setTargetDate(new Date('2023-01-01T11:00:00Z'));

			task.makeRecurring(oneHour, anchorStartDate, anchorStartDate);

			expect(task.getTargetDate()).toEqual(new Date('2023-01-01T09:00:00Z'));
		});

		it('should clamp the due date to the next occurrence start if due date is past it', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.setDueDate(new Date('2023-01-01T11:00:00Z'));

			task.makeRecurring(oneHour, anchorStartDate, anchorStartDate);

			expect(task.getDueDate()).toEqual(new Date('2023-01-01T09:00:00Z'));
		});

		it('should keep the due date if it is within the first occurrence', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			const dueDate = new Date('2023-01-01T08:30:00Z');
			task.setDueDate(dueDate);

			task.makeRecurring(oneHour, anchorStartDate, anchorStartDate);

			expect(task.getDueDate()).toEqual(dueDate);
		});

		it('should start progress on the first occurrence', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);

			expect(task.getProgressOccurrenceIndex()).toBe(0);
			expect(task.getCompletedOccurrenceIndex()).toBeNull();
			expect(task.getSkippedOccurrenceIndex()).toBeNull();
		});
	});

	describe('refreshCurrentOccurrence', () => {
		const anchorStartDate = new Date('2023-01-01T08:00:00Z');

		it('should do nothing for a non-recurring task', () => {
			const dueDate = new Date('2023-01-05T08:00:00Z');
			task.setStartDate(anchorStartDate);
			task.setDueDate(dueDate);
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();

			task.refreshCurrentOccurrence(new Date('2023-01-10T08:00:00Z'));

			expect(task.getCurrentOccurrence()).toBeNull();
			expect(task.getStartDate()).toEqual(anchorStartDate);
			expect(task.getDueDate()).toEqual(dueDate);
			expect(task.getNextStep()?.text).toEqual('Step 2');
		});

		it('should expose the anchor occurrence while the current time is within it', () => {
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);

			task.refreshCurrentOccurrence(new Date('2023-01-01T20:00:00Z'));

			expect(task.getCurrentOccurrence()?.index).toBe(0);
			expect(task.getStartDate()).toEqual(anchorStartDate);
			expect(task.getTargetDate()).toEqual(new Date('2023-01-02T08:00:00Z'));
		});

		it('should advance the start date, target date, and due date to the occurrence containing the current time', () => {
			task.setTargetDate(new Date('2023-01-01T20:00:00Z'));
			task.setDueDate(new Date('2023-01-01T22:00:00Z'));
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);

			task.refreshCurrentOccurrence(new Date('2023-01-03T09:00:00Z'));

			expect(task.getCurrentOccurrence()?.index).toBe(2);
			expect(task.getStartDate()).toEqual(new Date('2023-01-03T08:00:00Z'));
			expect(task.getTargetDate()).toEqual(new Date('2023-01-03T20:00:00Z'));
			expect(task.getDueDate()).toEqual(new Date('2023-01-03T22:00:00Z'));
			expect(task.getAnchorStartDate()).toEqual(anchorStartDate);
		});

		it('should reset progress when the occurrence changes', () => {
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();
			task.skipUntil(new Date('2023-01-01T09:00:00Z'), anchorStartDate);

			task.refreshCurrentOccurrence(new Date('2023-01-02T09:00:00Z'));

			expect(getStepTexts(task)).toEqual(['Step 1', 'Step 2']);
			expect(task.getProgress()).toBe(0);
			expect(task.getIsComplete()).toBe(false);
			expect(task.getNextStep()?.text).toEqual('Step 1');
			expect(task.getSkippedUntil()).toBeNull();
			expect(task.getProgressOccurrenceIndex()).toBe(1);
		});

		it('should keep progress when refreshed again within the same occurrence', () => {
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();

			task.refreshCurrentOccurrence(new Date('2023-01-01T12:00:00Z'));
			task.refreshCurrentOccurrence(new Date('2023-01-01T18:00:00Z'));

			expect(task.getNextStep()?.text).toEqual('Step 2');
		});

		it('should be idempotent no matter how many times or in what order it runs', () => {
			task.setDueDate(new Date('2023-01-01T20:00:00Z'));
			task.makeRecurring(oneWeek, anchorStartDate, anchorStartDate);

			task.refreshCurrentOccurrence(new Date('2023-01-20T09:00:00Z'));
			task.refreshCurrentOccurrence(new Date('2023-01-20T09:00:01Z'));
			task.refreshCurrentOccurrence(new Date('2023-01-20T09:00:02Z'));

			expect(task.getStartDate()).toEqual(new Date('2023-01-15T08:00:00Z'));
			expect(task.getDueDate()).toEqual(new Date('2023-01-15T20:00:00Z'));
		});
	});

	describe('completing a recurring task', () => {
		const anchorStartDate = new Date('2023-01-01T08:00:00Z');

		it('should mark the current occurrence complete until the next occurrence starts', () => {
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);

			task.setComplete(true, new Date('2023-01-01T10:00:00Z'));

			expect(task.getIsComplete()).toBe(true);
			expect(task.getCompletedOccurrenceIndex()).toBe(0);

			task.refreshCurrentOccurrence(new Date('2023-01-01T23:00:00Z'));
			expect(task.getIsComplete()).toBe(true);

			task.refreshCurrentOccurrence(new Date('2023-01-02T08:00:01Z'));
			expect(task.getIsComplete()).toBe(false);
			expect(task.getCompletedOccurrenceIndex()).toBe(0);
		});

		it('should count a late completion for the occurrence containing the current time', () => {
			task.setDueDate(new Date('2023-01-01T12:00:00Z'));
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-01T18:00:00Z'));

			task.setComplete(true, new Date('2023-01-01T18:00:00Z'));

			expect(task.getCompletedOccurrenceIndex()).toBe(0);
			expect(task.getIsComplete()).toBe(true);
		});

		it('should uncomplete the current occurrence without forgetting earlier resolved occurrences', () => {
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-03T09:00:00Z'));
			task.setComplete(true, new Date('2023-01-03T09:00:00Z'));

			task.setComplete(false, new Date('2023-01-03T10:00:00Z'));

			expect(task.getIsComplete()).toBe(false);
			expect(task.getCompletedOccurrenceIndex()).toBe(1);
			expect(task.getCurrentOccurrence()?.index).toBe(2);
		});
	});

	describe('shouldNotSkipMissedOccurrences', () => {
		const anchorStartDate = new Date('2023-01-01T08:00:00Z');

		it('should stay on the missed occurrence until it is completed', () => {
			task.setShouldNotSkipMissedOccurrences(true);
			task.setDueDate(new Date('2023-01-01T20:00:00Z'));
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);

			task.refreshCurrentOccurrence(new Date('2023-01-04T09:00:00Z'));

			expect(task.getCurrentOccurrence()?.index).toBe(0);
			expect(task.getDueDate()).toEqual(new Date('2023-01-01T20:00:00Z'));
		});

		it('should move to the very next occurrence after completing a missed one', () => {
			task.setShouldNotSkipMissedOccurrences(true);
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-04T09:00:00Z'));

			task.setComplete(true, new Date('2023-01-04T09:00:00Z'));

			expect(task.getCompletedOccurrenceIndex()).toBe(0);
			expect(task.getCurrentOccurrence()?.index).toBe(1);
			expect(task.getIsComplete()).toBe(false);
			expect(task.getStartDate()).toEqual(new Date('2023-01-02T08:00:00Z'));
		});

		it('should move to the very next occurrence after skipping a missed one', () => {
			task.setShouldNotSkipMissedOccurrences(true);
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-04T09:00:00Z'));

			task.skipCurrentOccurrence(new Date('2023-01-04T09:00:00Z'));

			expect(task.getSkippedOccurrenceIndex()).toBe(0);
			expect(task.getCurrentOccurrence()?.index).toBe(1);
			expect(task.getIsComplete()).toBe(false);
		});

		it('should wait for the next occurrence after skipping the occurrence containing the current time', () => {
			task.setShouldNotSkipMissedOccurrences(true);
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-01T09:00:00Z'));

			task.skipCurrentOccurrence(new Date('2023-01-01T09:00:00Z'));

			expect(task.getCurrentOccurrence()?.index).toBe(1);
			expect(task.getIsComplete()).toBe(false);
			expect(task.isActive(new Date('2023-01-01T09:00:00Z'))).toBe(false);
		});
	});

	describe('makeNonRecurring', () => {
		it('should keep the current occurrence schedule as the task schedule', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.setDueDate(new Date('2023-01-01T20:00:00Z'));
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-03T09:00:00Z'));

			task.makeNonRecurring();

			expect(task.isRecurring()).toBe(false);
			expect(task.getStartDate()).toEqual(new Date('2023-01-03T08:00:00Z'));
			expect(task.getDueDate()).toEqual(new Date('2023-01-03T20:00:00Z'));
			expect(task.getCompletedOccurrenceIndex()).toBeNull();
			expect(task.getProgressOccurrenceIndex()).toBeNull();
		});

		it('should keep a completed current occurrence as a completed task', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.setComplete(true, new Date('2023-01-01T09:00:00Z'));

			task.makeNonRecurring();

			expect(task.getIsComplete()).toBe(true);
		});
	});

	describe('setFromTaskTimingOptions with recurrence', () => {
		it('should anchor the first occurrence at the start date when recurrence is turned on', () => {
			const startDate = new Date('2023-01-01T08:00:00Z');
			task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				startDate,
				dueDate: null,
				recurrenceDuration: oneHour,
			}, startDate);

			expect(task.isRecurring()).toBe(true);
			expect(task.getAnchorStartDate()).toEqual(startDate);
			expect(task.getTargetDate()).toEqual(new Date('2023-01-01T09:00:00Z'));
		});

		it('should keep the current occurrence values and indices when only unrelated fields change', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(new Date('2023-01-03T09:00:00Z'));
			task.setComplete(true, new Date('2023-01-03T09:00:00Z'));

			task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				minDuration: 1000,
			}, new Date('2023-01-03T09:00:00Z'));

			expect(task.getAnchorStartDate()).toEqual(anchorStartDate);
			expect(task.getCurrentOccurrence()?.index).toBe(2);
			expect(task.getIsComplete()).toBe(true);
		});

		it('should re-anchor to the edited occurrence and re-tag completion when the schedule changes', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			const currentTime = new Date('2023-01-03T09:00:00Z');
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(currentTime);
			task.setComplete(true, currentTime);

			task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				targetDate: null,
				dueDate: new Date('2023-01-03T21:00:00Z'),
			}, currentTime);

			expect(task.getAnchorStartDate()).toEqual(new Date('2023-01-03T08:00:00Z'));
			expect(task.getAnchorDueDate()).toEqual(new Date('2023-01-03T21:00:00Z'));
			expect(task.getCurrentOccurrence()?.index).toBe(0);
			expect(task.getCompletedOccurrenceIndex()).toBe(0);
			expect(task.getIsComplete()).toBe(true);
		});

		it('should bake the current occurrence into the task when recurrence is turned off', () => {
			const anchorStartDate = new Date('2023-01-01T08:00:00Z');
			const currentTime = new Date('2023-01-03T09:00:00Z');
			task.makeRecurring(oneDay, anchorStartDate, anchorStartDate);
			task.refreshCurrentOccurrence(currentTime);

			task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				recurrenceDuration: null,
			}, currentTime);

			expect(task.isRecurring()).toBe(false);
			expect(task.getStartDate()).toEqual(new Date('2023-01-03T08:00:00Z'));
			expect(task.getCurrentOccurrence()).toBeNull();
		});
	});

	describe('start date cannot be after target date', () => {
		it('setFromTaskTimingOptions should throw if the new start date is after the new target date', () => {
			expect(() => task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				startDate: new Date('2023-01-01T13:00:00Z'),
				targetDate: new Date('2023-01-01T12:00:00Z'),
			})).toThrow();
		});

		it('setFromTaskTimingOptions should throw when turning on recurrence would start after the existing target date', () => {
			task.setTargetDate(new Date('2023-01-01T12:00:00Z'));

			expect(() => task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				startDate: new Date('2023-01-01T13:00:00Z'),
				recurrenceDuration: oneHour,
			})).toThrow();
		});

		it('makeRecurring should throw if the anchor start date is after the existing target date', () => {
			task.setTargetDate(new Date('2023-01-01T12:00:00Z'));

			expect(() => task.makeRecurring(oneHour, new Date('2023-01-01T13:00:00Z'))).toThrow();
		});

		it('restoreState should throw if the restored state has a start date after its target date', () => {
			const state = task.getState();

			expect(() => task.restoreState({
				...state,
				startDate: new Date('2023-01-01T13:00:00Z'),
				targetDate: new Date('2023-01-01T12:00:00Z'),
			})).toThrow();
		});
	});

	describe('start date cannot be after due date', () => {
		it('setFromTaskTimingOptions should throw if the new start date is after the new due date', () => {
			expect(() => task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				startDate: new Date('2023-01-01T13:00:00Z'),
				dueDate: new Date('2023-01-01T12:00:00Z'),
			})).toThrow();
		});

		it('setFromTaskTimingOptions should throw when turning on recurrence would start after the existing due date', () => {
			task.setDueDate(new Date('2023-01-01T12:00:00Z'));

			expect(() => task.setFromTaskTimingOptions({
				...task.getTaskTimingOptions(),
				startDate: new Date('2023-01-01T13:00:00Z'),
				recurrenceDuration: oneHour,
			})).toThrow();
		});

		it('makeRecurring should throw if the anchor start date is after the existing due date', () => {
			task.setDueDate(new Date('2023-01-01T12:00:00Z'));

			expect(() => task.makeRecurring(oneHour, new Date('2023-01-01T13:00:00Z'))).toThrow();
		});

		it('makeRecurring should not throw when the existing due date is before the next occurrence but still after the anchor start date', () => {
			task.setDueDate(new Date('2023-01-01T10:30:00Z'));

			expect(() => task.makeRecurring(oneHour, new Date('2023-01-01T10:00:00Z'))).not.toThrow();
			expect(task.getAnchorDueDate()).toEqual(new Date('2023-01-01T10:30:00Z'));
		});

		it('restoreState should throw if the restored state has a start date after its due date', () => {
			const state = task.getState();

			expect(() => task.restoreState({
				...state,
				startDate: new Date('2023-01-01T13:00:00Z'),
				dueDate: new Date('2023-01-01T12:00:00Z'),
			})).toThrow();
		});
	});

	describe('getSteps', () => {
		it('getSteps should return an empty array if there are no steps', () => {
			expect(task.getSteps()).toEqual([]);
		});

		it('getSteps should return an array of the steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');

			expect(getStepTexts(task)).toEqual(['Step 1', 'Step 2', 'Step 3']);
		})
	});

	describe('hasNextStep', () => {
		it('hasNextStep should return true if there are uncompleted steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');

			expect(task.hasNextStep()).toBe(true);
		});

		it('hasNextStep should return false if there are no steps', () => {
			expect(task.hasNextStep()).toBe(false);
		});

		it('hasNextStep should return false if all steps are completed', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.completeNextStep();
			task.completeNextStep();
			task.completeNextStep();

			expect(task.hasNextStep()).toBe(false);
		});

		it('hasNextStep should return true if all steps are skipped', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.skipNextStep();
			task.skipNextStep();
			task.skipNextStep();

			expect(task.hasNextStep()).toBe(true);
		});
	});

	describe('getNextStep', () => {
		it('getNextStep should return null if there are no steps', () => {
			expect(task.getSteps()).toEqual([]);
			expect(task.getNextStep()).toBeNull();
		});

		it('getNextStep should get the first step if all are uncomplete', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');

			expect(task.getNextStep()?.text).toEqual('Step 1');
		});

		it('getNextStep should return null if there are no non-completed steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.completeNextStep();
			task.completeNextStep();
			task.completeNextStep();

			expect(task.getNextStep()).toBeNull();
		});

		it('getNextStep should return the second step if only the first was completed', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 2');
		});

		it('getNextStep should return the next uncomplete step if they just skipped a task', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 3');
		});

		it('getNextStep should return the next uncomplete step even if they just skipped twice in a row', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.skipNextStep();
			task.skipNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 4');
		});

		it('getNextStep should return first skipped step if they just skipped a task but there are no uncomplete tasks', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.skipNextStep();
			task.completeNextStep();
			task.skipNextStep();
			task.completeNextStep();
			task.skipNextStep();
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 1');
		});

		it('getNextStep should return the next skipped step after the last if they just skipped a task that was skipped before', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.skipNextStep();
			task.skipNextStep();
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 2');
		});

		it('getNextStep should return the first skipped step if they didn\'t skip the last step', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.skipNextStep();
			task.skipNextStep();
			task.completeNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 2');
			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(false);
		});

		it('getNextStep should return the only skipped step if they didn\'t skip the last step', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.completeNextStep();
			task.skipNextStep();
			task.completeNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 3');
			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(false);
		});
	})

	describe('replaceNextStep', () => {
		it('replaceNextStep should replace the next step', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.completeNextStep();

			task.replaceNextStep('Step 4');

			expect(getStepTexts(task)).toEqual(['Step 1', 'Step 4', 'Step 3']);
			expect(task.getNextStep()?.text).toEqual('Step 4');
		});

		it('replaceNextStep should do nothing if there are no uncompleted steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.completeNextStep();
			task.completeNextStep();
			task.completeNextStep();

			task.replaceNextStep('Step 4');
			expect(getStepTexts(task)).toEqual(['Step 1', 'Step 2', 'Step 3']);
			expect(task.getNextStep()).toEqual(null);
		});

		it('replaceNextStep should do nothing if there are no steps', () => {
			task.replaceNextStep('Step 4');
			expect(task.getSteps()).toEqual([]);
			expect(task.getNextStep()).toEqual(null);
		});
	})

	describe('completeNextStep', () => {
		it('completeNextStep should complete next step', () => {
				task.addStep('Step 1');
				task.completeNextStep();

				expect(getStepTexts(task)).toEqual(['Step 1']);
				expect(task.getNextStep()).toBeNull();
				expect(task.getIsComplete()).toBe(true);
		});

		it('completeNextStep should complete the task if there are no steps', () => {
			task.completeNextStep();
			expect(task.getSteps()).toEqual([]);
			expect(task.getNextStep()).toBeNull();
			expect(task.getIsComplete()).toBe(true);
		});

		it('completeNextStep should complete the task if there is only one step left and the rest are completed', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();
			task.completeNextStep();

			expect(task.getNextStep()).toBeNull();
			expect(task.getIsComplete()).toBe(true);
			expect(task.getIsSkipped()).toBe(false);
		});

		it('completeNextStep should not skip the task if there are no uncompleted steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.completeNextStep();
			task.skipNextStep();
			task.completeNextStep();

			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(false);
			expect(task.getNextStep()?.text).toEqual('Step 2');
		});
	});

	describe('uncompleteStep', () => {
		it('should clear the task completion state when it was already complete', () => {
			const step1 = task.addStep('Step 1');
			task.completeAllSteps();

			task.uncompleteStep(step1.id);

			expect(task.getIsComplete()).toBe(false);
			expect(task.isStepComplete(step1.id)).toBe(false);
		});
	});

	describe('completeStepAndPrecedingSteps', () => {
		it('should complete the given step and any unfinished steps before it', () => {
			const step1 = task.addStep('Step 1');
			const step2 = task.addStep('Step 2');
			const step3 = task.addStep('Step 3');

			task.completeStepAndPrecedingSteps(step2.id);

			expect(task.isStepComplete(step1.id)).toBe(true);
			expect(task.isStepComplete(step2.id)).toBe(true);
			expect(task.isStepComplete(step3.id)).toBe(false);
			expect(task.getNextStep()?.text).toEqual('Step 3');
		});

		it('should behave like completing just that step when it is the first uncompleted step', () => {
			const step1 = task.addStep('Step 1');
			task.addStep('Step 2');

			task.completeStepAndPrecedingSteps(step1.id);

			expect(task.isStepComplete(step1.id)).toBe(true);
			expect(task.getNextStep()?.text).toEqual('Step 2');
		});

		it('should complete the task when the last step is completed', () => {
			task.addStep('Step 1');
			const step2 = task.addStep('Step 2');

			task.completeStepAndPrecedingSteps(step2.id);

			expect(task.getIsComplete()).toBe(true);
			expect(task.getNextStep()).toBeNull();
		});

		it('should not throw or change anything for a step that does not exist', () => {
			const step1 = task.addStep('Step 1');

			task.completeStepAndPrecedingSteps('missing-step-id');

			expect(task.isStepComplete(step1.id)).toBe(false);
		});
	});

	describe('uncompleteStepAndFollowingSteps', () => {
		it('should uncomplete the given step and any completed steps after it', () => {
			const step1 = task.addStep('Step 1');
			const step2 = task.addStep('Step 2');
			const step3 = task.addStep('Step 3');
			task.completeAllSteps();

			task.uncompleteStepAndFollowingSteps(step2.id);

			expect(task.isStepComplete(step1.id)).toBe(true);
			expect(task.isStepComplete(step2.id)).toBe(false);
			expect(task.isStepComplete(step3.id)).toBe(false);
		});

		it('should clear the task completion state when it was already complete', () => {
			task.addStep('Step 1');
			const step2 = task.addStep('Step 2');
			task.completeAllSteps();

			task.uncompleteStepAndFollowingSteps(step2.id);

			expect(task.getIsComplete()).toBe(false);
		});

		it('should not throw or change anything for a step that does not exist', () => {
			const step1 = task.addStep('Step 1');
			task.completeAllSteps();

			task.uncompleteStepAndFollowingSteps('missing-step-id');

			expect(task.isStepComplete(step1.id)).toBe(true);
		});
	});

	describe('completeAllSteps', () => {

		beforeEach(() => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');

			task.completeAllSteps();
		})

		it('should mark all steps as completed', () => {
			expect(task.getNextStep()).toBeNull();
		})

		it('should complete the task', () => {
			expect(task.getIsComplete()).toBe(true);
		})
	})

	describe('skipNextStep', () => {
		it('skipNextStep should skip the task if there are no steps', () => {
			task.skipNextStep();

			expect(task.getSteps()).toEqual([]);
			expect(task.getNextStep()).toBeNull();
			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(true);
		});

		it('skipNextStep should set the next uncompleted task to skipped', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.skipNextStep();

			expect(task.getNextStep()?.text).toEqual('Step 2');
			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(false);
		});

		it('skipNextStep should skip the task if there is only one step left and the rest are not uncompleted', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.completeNextStep();
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(true);
		});

		it('skipNextStep should not skip the task if they are not skipping the last skipped step', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.skipNextStep();
			task.skipNextStep();
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getIsComplete()).toBe(false);
			expect(task.getIsSkipped()).toBe(false);
		});
	});

	describe('editStepsText', () => {
		it('editStepsText should edit the steps with the given step texts', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.editStepsText(['Step 3', 'Step 4']);
			expect(getStepTexts(task)).toEqual(['Step 3', 'Step 4']);
		});

		it('editStepsText should keep the step status when editing the steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();

			task.editStepsText(['Step 3', 'Step 4']);
			expect(getStepTexts(task)).toEqual(['Step 3', 'Step 4']);
			expect(task.getNextStep()?.text).toEqual('Step 4');
		});

		it('editStepsText should handle an empty array', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.editStepsText([]);
			expect(task.getSteps()).toEqual([]);
		});

		it('editStepsText should handle no steps', () => {
			task.editStepsText(['Step 1', 'Step 2']);
			expect(getStepTexts(task)).toEqual(['Step 1', 'Step 2']);
		});

		it('editStepsText should preserve identity and status of duplicate-text steps by position', () => {
			task.addStep('');
			task.addStep('');
			const [firstBlankStep, secondBlankStep] = task.getSteps();
			task.completeStep(firstBlankStep.id);

			task.editStepsText(['', '']);

			const [firstStepAfterEdit, secondStepAfterEdit] = task.getSteps();
			expect(firstStepAfterEdit.id).toEqual(firstBlankStep.id);
			expect(secondStepAfterEdit.id).toEqual(secondBlankStep.id);
			expect(task.isStepComplete(firstStepAfterEdit.id)).toBe(true);
			expect(task.isStepComplete(secondStepAfterEdit.id)).toBe(false);
		});
	});

	describe('editStepText', () => {
		it('should rename a step in place, preserving its id and status', () => {
			const step1 = task.addStep('Step 1');
			task.completeStep(step1.id);

			task.editStepText(step1.id, 'Renamed Step');

			expect(getStepTexts(task)).toEqual(['Renamed Step']);
			expect(task.isStepComplete(step1.id)).toBe(true);
		});
	});

	describe('createStepLeftOfStep and createStepRightOfStep', () => {
		it('should insert a new blank step before the given step without colliding with another blank step', () => {
			task.addStep('');
			const secondBlankStep = task.addStep('');

			const insertedStep = task.createStepLeftOfStep(secondBlankStep.id);

			expect(task.getSteps().map(step => step.id)).toEqual([
				task.getSteps()[0].id,
				insertedStep.id,
				secondBlankStep.id,
			]);
		});

		it('should insert a new blank step after the given step without colliding with another blank step', () => {
			const firstBlankStep = task.addStep('');
			task.addStep('');

			const insertedStep = task.createStepRightOfStep(firstBlankStep.id);

			expect(task.getSteps().map(step => step.id)[1]).toEqual(insertedStep.id);
		});
	});

	describe('reparentStep', () => {
		it('should reorder steps while preserving their status', () => {
			const step1 = task.addStep('Step 1');
			const step2 = task.addStep('Step 2');
			task.completeStep(step1.id);

			task.reparentStep(step2.id, null, 0);

			expect(getStepTexts(task)).toEqual(['Step 2', 'Step 1']);
			expect(task.isStepComplete(step1.id)).toBe(true);
		});
	});

	describe('deleteStep', () => {
		it('should remove the given step', () => {
			const step1 = task.addStep('Step 1');
			task.addStep('Step 2');

			task.deleteStep(step1.id);

			expect(getStepTexts(task)).toEqual(['Step 2']);
		});
	});

	describe('getTimeToCompleteByDueDate', () => {
		it('getTimeToCompleteByDueDate should return infinity if there is no due date', () => {
			expect(task.getTimeToCompleteByDueDate(new Date())).toEqual(Infinity);
		});

		it('getTimeToCompleteByDueDate should return negative if the due date is in the past', () => {
			const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);
			task.setDueDate(new Date(currentTime.getTime() - 1));
			expect(task.getTimeToCompleteByDueDate(currentTime)).toEqual(-1);
		});

		it('getTimeToCompleteByDueDate should return the number of milliseconds left if the due date is in the future', () => {
			const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);
			const dueDate = new Date(currentTime.getTime() + 1000);
			task.setDueDate(dueDate);
			expect(task.getTimeToCompleteByDueDate(currentTime)).toBe(1000);
		});

		it('getTimeToCompleteByDueDate should return the number of milliseconds between the due date and start date if the start date is in the future', () => {
			const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);
			const startDate = new Date(currentTime.getTime() + 1000);
			const dueDate = new Date(currentTime.getTime() + 2000);
			task.setStartDate(startDate);
			task.setDueDate(dueDate);
			expect(task.getTimeToCompleteByDueDate(currentTime)).toBe(1000);
		});

		it('subtracts time asleep when there is an asleep time window', () => {
			const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);
			tasksManager.setAsleepTimeWindow(new TimeWindow('0:00', '8:00'));
			task.setDueDate(new Date(2024, 0, 2, 12, 0, 0, 0));
			expect(task.getTimeToCompleteByDueDate(currentTime)).toBe(16 * 60 * 60 * 1000);
		});

		it('does not subtract time asleep when there is no asleep time window', () => {
			const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);
			tasksManager.setAsleepTimeWindow(null);
			task.setDueDate(new Date(2024, 0, 2, 12, 0, 0, 0));
			expect(task.getTimeToCompleteByDueDate(currentTime)).toBe(24 * 60 * 60 * 1000);
			tasksManager.setAsleepTimeWindow(new TimeWindow('0:00', '8:00'));
		});
	});

	describe('getTimeUntilDueDate', () => {
		const currentTime = new Date();

		it('should return infinity if there is no due date', () => {
			expect(task.getTimeUntilDueDate(currentTime)).toEqual(Infinity);
		});

		it('should return the number of milliseconds left if the due date is in the future', () => {
			const dueDate = new Date(currentTime.getTime() + 1000);
			task.setDueDate(dueDate);
			expect(task.getTimeUntilDueDate(currentTime)).toBe(1000);
		});

		it('should return negative time if the due date is in the past', () => {
			const dueDate = new Date(currentTime.getTime() - 1000);
			task.setDueDate(dueDate);
			expect(task.getTimeUntilDueDate(currentTime)).toBe(-1000);
		})
	});

	describe('getMaxRequiredTime', () => {
		it('getMaxRequiredTime should return infinity if there is no maxRequiredTime or due date', () => {
			expect(task.getMaxRequiredTime(new Date())).toEqual(Infinity);
		});

		it('getMaxRequiredTime should return the time left to complete the task if there is a due date', () => {
			const currentTime = new Date();

			task.setDueDate(new Date(currentTime.getTime() + 1000));

			expect(task.getMaxRequiredTime(currentTime)).toEqual(task.getTimeToCompleteByDueDate(currentTime));
		});
	});

	describe('getAssumedMaxRequiredTime', () => {
		it('should return 0 if neither duration is set', () => {
			expect(task.getAssumedMaxRequiredTime()).toEqual(0);
		});

		it('should return the minimum duration if only the minimum is set', () => {
			task.setMinRequiredTime(5000);
			expect(task.getAssumedMaxRequiredTime()).toEqual(5000);
		});

		it('should return the maximum duration if it is set', () => {
			task.setMinRequiredTime(5000);
			task.setMaxRequiredTime(9000);
			expect(task.getAssumedMaxRequiredTime()).toEqual(9000);
		});

		it('should leave a task with a due date and no durations with slack equal to its available time and not urgent', () => {
			const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);
			task.setDueDate(new Date(currentTime.getTime() + 1000));

			expect(task.getDueDateSlack(currentTime)).toEqual(task.getTimeToCompleteByDueDate(currentTime));
			expect(task.isUrgent(currentTime)).toBe(false);
		});
	});

	describe('getProgress', () => {
		it('getProgress should return 0 if there are no steps', () => {
			expect(task.getProgress()).toEqual(0);
		});

		it('getProgress should return 1 if there are no steps but the task is complete', () => {
			task.completeNextStep();
			expect(task.getProgress()).toEqual(1);
		});

		it('getProgress should return 0.25 if one step is completed and three steps remain or are skipped', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.skipNextStep();
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getProgress()).toEqual(0.25);
		});
	})

	it('getCurrentState should return internal state of the task', () => {
		const currentTime = new Date();
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.addStep('Step 3');
		const step1 = findStepByText(task, 'Step 1');
		task.completeStep(step1.id);
		const step2 = findStepByText(task, 'Step 2');
		task.skipStep(step2.id);
		task.setDueDate(currentTime);
		task.setMinRequiredTime(1000);
		task.setMaxRequiredTime(2000);
		task.makeRecurring(oneHour, currentTime, currentTime);

		const state = task.getState();

		expect(state.description).toEqual(task.getDescription());
		expect(state.isComplete).toEqual(task.getIsComplete());
		expect(state.isSkipped).toEqual(task.getIsSkipped());
		expect(state.skippedUntil).toEqual(task.getSkippedUntil());

		expect(state.startDate).toEqual(task.getAnchorStartDate());
		expect(state.dueDate).toEqual(task.getAnchorDueDate());
		expect(state.minDuration).toEqual(task.getMinRequiredTime());
		expect(state.maxDuration).toEqual(task.getMaxRequiredTime(currentTime));
		expect(state.recurrenceDuration).toEqual(oneHour);
		expect(state.progressOccurrenceIndex).toBe(0);
		expect(state.steps).toEqual([
			{ id: step1.id, text: 'Step 1', status: StepStatus.COMPLETED, children: [] },
			{ id: step2.id, text: 'Step 2', status: StepStatus.SKIPPED, children: [] },
			{ id: findStepByText(task, 'Step 3').id, text: 'Step 3', status: StepStatus.UNCOMPLETE, children: [] },
		]);
		expect(state.lastActionedStep).toEqual({
			stepID: step2.id,
			status: 'Skipped' as StepStatus,
		});
	});

	it('restoreState should restore internal state of the task', () => {
		const currentTime = new Date();
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.addStep('Step 3');
		task.completeStep(findStepByText(task, 'Step 1').id);
		task.skipStep(findStepByText(task, 'Step 2').id);
		task.setDueDate(currentTime);
		task.setMinRequiredTime(1000);
		task.setMaxRequiredTime(2000);
		task.makeRecurring(oneHour, currentTime, currentTime);
		task.skipUntil(new Date(currentTime.getTime() + 5000), currentTime);

		const state = task.getState();

		task.editStepsText(['Step 4', 'Step 5', 'Step 6']);
		task.setDescription('New Description');
		task.completeNextStep();
		task.setMaxRequiredTime(3000);
		task.setMinRequiredTime(2000);
		task.setDueDate(new Date(currentTime.getTime() + 1000));
		task.setStartDate(new Date(currentTime.getTime() + 2000));
		task.cancelSkip();

		task.restoreState(state, currentTime);

		expect(task.getDescription()).toEqual('Sample Task');
		expect(task.getIsComplete()).toEqual(false);
		expect(task.getIsSkipped()).toEqual(false);
		expect(task.getSkippedUntil()).toEqual(new Date(currentTime.getTime() + 5000));
		expect(task.getDueDate()).toEqual(currentTime);
		expect(task.getStartDate()).toEqual(currentTime);
		expect(task.getMinRequiredTime()).toEqual(1000);
		expect(task.getMaxRequiredTime(currentTime)).toEqual(2000);
		expect(task.getRecurrenceDuration()).toEqual(oneHour);
		expect(getStepTexts(task)).toEqual(['Step 1', 'Step 2', 'Step 3']);
	});

	describe('isActive', () => {
		const currentTime = new Date();

		it('should return true if no dates are set', () => {
			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return false if the start date is after the current time', () => {
			task.setStartDate(new Date(currentTime.getTime() + 1));

			expect(task.isActive(currentTime)).toEqual(false);
		});

		it('should return true even after the target date and due date have passed', () => {
			task.setTargetDate(new Date(currentTime.getTime() - 2));
			task.setDueDate(new Date(currentTime.getTime() - 1));

			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return true if the time is between the start date and target date', () => {
			const startDate = new Date(currentTime.getTime() - 1000);
			const targetDate = new Date(currentTime.getTime() + 1000);

			task.setStartDate(startDate);
			task.setTargetDate(targetDate);

			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return true if the start date is before the current time', () => {
			task.setStartDate(new Date(currentTime.getTime() - 1000));

			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return false if the task is completed', () => {
			task.completeNextStep();
			expect(task.isActive(currentTime)).toEqual(false);
		});

		it('should return false if skippedUntil is after the current time, even past its due date and target date', () => {
			task.setTargetDate(new Date(currentTime.getTime() - 1000));
			task.setDueDate(new Date(currentTime.getTime() + 1000));
			task.skipUntil(new Date(currentTime.getTime() + 500), new Date(currentTime.getTime() - 2000));

			expect(task.isActive(currentTime)).toEqual(false);
		});

		it('should return true once skippedUntil is in the past', () => {
			task.skipUntil(new Date(currentTime.getTime() - 500), new Date(currentTime.getTime() - 2000));

			expect(task.isActive(currentTime)).toEqual(true);
		});
	});

	describe('skipUntil', () => {
		it('should set skippedUntil without changing start date, target date, or due date', () => {
			const currentTime = new Date('2023-01-01T00:00:00Z');
			const startDate = new Date('2023-01-01T01:00:00Z');
			const targetDate = new Date('2023-01-01T02:00:00Z');
			const dueDate = new Date('2023-01-01T03:00:00Z');
			task.setStartDate(startDate);
			task.setTargetDate(targetDate);
			task.setDueDate(dueDate);

			const skipUntilDate = new Date('2023-02-01T00:00:00Z');
			task.skipUntil(skipUntilDate, currentTime);

			expect(task.getSkippedUntil()).toEqual(skipUntilDate);
			expect(task.getStartDate()).toEqual(startDate);
			expect(task.getTargetDate()).toEqual(targetDate);
			expect(task.getDueDate()).toEqual(dueDate);
		});

		it('should allow skipping a task whose due date, target date, and start date have already passed', () => {
			const currentTime = new Date('2023-01-01T04:00:00Z');
			task.setStartDate(new Date('2023-01-01T01:00:00Z'));
			task.setTargetDate(new Date('2023-01-01T02:00:00Z'));
			task.setDueDate(new Date('2023-01-01T03:00:00Z'));

			const skipUntilDate = new Date('2023-02-01T00:00:00Z');

			expect(() => task.skipUntil(skipUntilDate, currentTime)).not.toThrow();
			expect(task.getSkippedUntil()).toEqual(skipUntilDate);
		});

		it('should throw if the skip until date is not after the current time', () => {
			const currentTime = new Date('2023-01-01T00:00:00Z');

			expect(() => task.skipUntil(currentTime, currentTime)).toThrow();
			expect(() => task.skipUntil(new Date(currentTime.getTime() - 1000), currentTime)).toThrow();
			expect(task.getSkippedUntil()).toBeNull();
		});
	});

	describe('cancelSkip', () => {
		it('should clear skippedUntil', () => {
			const currentTime = new Date();
			task.skipUntil(new Date(currentTime.getTime() + 1000), currentTime);

			task.cancelSkip();

			expect(task.getSkippedUntil()).toBeNull();
		});
	});

	describe('setComplete', () => {
		it('should clear skippedUntil when marking the task complete', () => {
			const currentTime = new Date();
			task.skipUntil(new Date(currentTime.getTime() + 1000), currentTime);

			task.setComplete(true);

			expect(task.getSkippedUntil()).toBeNull();
		});

		it('should not clear skippedUntil when marking the task incomplete', () => {
			const currentTime = new Date();
			const skipUntilDate = new Date(currentTime.getTime() + 1000);
			task.skipUntil(skipUntilDate, currentTime);

			task.setComplete(false);

			expect(task.getSkippedUntil()).toEqual(skipUntilDate);
		});
	});
});

import StateObserver from "../../persistence/observer/StateObserver";
import TasksManager from "../TasksManager";
import StepStatus from "./StepStatus";
import Task from "./Task";

describe('Task', () => {
	let tasksManager: TasksManager = new TasksManager( { onStateChange: () => {} } );
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

	describe('isRecurring', () =>  {
		it('should return true if task is recurring', () => {
			task.makeRecurring(1000, new Date());
			expect(task.isRecurring()).toBe(true);
		});

		it('should return false if task is not recurring', () => {
			task.setDeadline(new Date());
			task.setStartTime(new Date());
			task.setMinRequiredTime(1000);
			task.setMaxRequiredTime(2000);
			expect(task.isRecurring()).toBe(false);
		});
	})

	describe('makeReccuring', () => {
		it('should set repeat interval and start time', () => {
			const repeatInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds
			const intervalStartTime = new Date('2023-01-01T08:00:00Z');

			task.makeRecurring(repeatInterval, intervalStartTime);

			expect(task.getRepeatInterval()).toBe(repeatInterval);
			expect(task.getStartTime()).toEqual(intervalStartTime);
		});

		it('should set deadline to start time + repeat interval if deadline is not set', () => {
			task.makeRecurring(1000, new Date());

			const intervalEndTime = new Date(task.getStartTime()!.getTime() + 1000);

			expect(task.getDeadline()).toEqual(intervalEndTime);
		});

		it('should set deadline to start time + repeat interval if deadline is past interval end time', () => {
			task.setDeadline(
				new Date(Date.now() + 2000)
			);

			task.makeRecurring(1000, new Date());

			const intervalEndTime = new Date(task.getStartTime()!.getTime() + 1000);

			expect(task.getDeadline()).toEqual(intervalEndTime);
		});

		it('should not set deadline if deadline is not past interval end time', () => {
			const deadline = new Date(Date.now() + 500);
			task.setDeadline(deadline);

			task.makeRecurring(1000, new Date());

			expect(task.getDeadline()).toEqual(deadline);
		});
	});

	describe('isPastIntervalEndTime', () => {
		it('should return true if current time is past interval end time', () => {
			// 1 day
			const repeatInterval = 24 * 60 * 60 * 1000;

			// Jan 1, 8 AM
			const intervalStartTime = new Date('2023-01-01T08:00:00Z');

			// Jan 2, 9 AM
			const currentTime = new Date('2023-01-02T09:00:00Z');

			task.makeRecurring(repeatInterval, intervalStartTime);

			expect(task.isPastIntervalEndTime(currentTime)).toBe(true);
		})

		it('should return false if current time is not past interval end time', () => {
			// 1 day
			const repeatInterval = 24 * 60 * 60 * 1000;

			// Jan 1, 8 AM
			const intervalStartTime = new Date('2023-01-01T08:00:00Z');

			// Jan 1, 9 AM
			const currentTime = new Date('2023-01-01T09:00:00Z');

			task.makeRecurring(repeatInterval, intervalStartTime);

			expect(task.isPastIntervalEndTime(currentTime)).toBe(false);
		});

		it('should return false if task is not recurring', () => {
			const currentTime = new Date();
			task.setDeadline(currentTime);
			task.setStartTime(new Date());
			task.setMinRequiredTime(1000);
			task.setMaxRequiredTime(2000);
			expect(task.isPastIntervalEndTime(currentTime)).toBe(false);
		});
	});

	describe('onPastIntervalEndTime', () => {
		it('should do nothing if task is not recurring', () => {
			const currentTime = new Date();
			const deadline = currentTime;
			const startTime = currentTime;
			task.setDeadline(deadline);
			task.setStartTime(startTime);
			task.setMinRequiredTime(1000);
			task.setMaxRequiredTime(2000);
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();

			task.onPastIntervalEndTime(currentTime);

			expect(task.getSteps()).toEqual(['Step 1', 'Step 2']);
			expect(task.getIsComplete()).toBe(false);
			expect(task.getNextStep()).toEqual('Step 2');
			expect(task.getDeadline()).toEqual(deadline);
			expect(task.getStartTime()).toEqual(startTime);
		});

		it('should reset progress if task is recurring', () => {
			const repeatInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds
			const intervalStartTime = new Date('2023-01-01T08:00:00Z');
			let currentTime = intervalStartTime;

			task.makeRecurring(repeatInterval, intervalStartTime);
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();

			task.onPastIntervalEndTime(currentTime);

			expect(task.getSteps()).toEqual(['Step 1', 'Step 2']);
			expect(task.getProgress()).toBe(0);
			expect(task.getIsComplete()).toBe(false);
			expect(task.getNextStep()).toEqual('Step 1');
		});

		it('should update start time and deadline when past interval end time', () => {
			// 1 Day
			const repeatInterval = 24 * 60 * 60 * 1000;

			// Jan 1, 8 AM
			const intervalStartTime = new Date('2023-01-01T08:00:00Z');

			// Jan 2, 9 AM (Past interval end time)
			const currentTime = new Date('2023-01-02T09:00:00Z');

			// Jan 2, 8 AM
			const expectedNewStartTime = new Date('2023-01-02T08:00:00Z');

			// Jan 3, 8 AM
			const expectedNewDeadline = new Date('2023-01-03T08:00:00Z');

			// Task repeats every day at 8 AM
			task.makeRecurring(repeatInterval, intervalStartTime);
			task.setStepsToStatusMap([['Step 1', StepStatus.COMPLETED]]);
			task.setComplete(true);

			task.onPastIntervalEndTime(currentTime);

			expect(task.getStartTime()).toEqual(expectedNewStartTime);
			expect(task.getDeadline()).toEqual(expectedNewDeadline);
		});

		it('should update start time, deadline, and end time if they are set to most recent possible values', () => {
			// 1 Day
			const repeatInterval = 24 * 60 * 60 * 1000;

			// Jan 1, 8 AM
			const intervalStartTime = new Date('2023-01-01T08:00:00Z');

			// Jan 3, 9 AM (Past interval end time)
			const currentTime = new Date('2023-01-03T09:00:00Z');

			// Jan 1, 10 AM
			const deadline = new Date('2023-01-01T10:00:00Z');

			// Jan 1, 2 PM
			const endTime = new Date('2023-01-01T14:00:00Z');

			// Jan 3, 8 AM
			const expectedNewStartTime = new Date('2023-01-03T08:00:00Z');

			// Jan 3, 10 AM
			const expectedNewDeadline = new Date('2023-01-03T10:00:00Z');

			// Jan 3, 2 PM
			const expectedNewEndTime = new Date('2023-01-03T14:00:00Z');

			// Task repeats every day at 8 AM
			task.makeRecurring(repeatInterval, intervalStartTime);
			task.setDeadline(deadline);
			task.setEndTime(endTime);

			task.onPastIntervalEndTime(currentTime);

			expect(task.getStartTime()).toEqual(expectedNewStartTime);
			expect(task.getDeadline()).toEqual(expectedNewDeadline);
			expect(task.getEndTime()).toEqual(expectedNewEndTime);
		});
	})

	it('setStepsToStatusMap should set the steps to status map from an array of tuples of steps and statuses', () => {
		task.setStepsToStatusMap([
			['Step 1', 'Completed'],
			['Step 2', 'Skipped'],
			['Step 3', 'Uncomplete'],
		]);

		expect(task.getSteps()).toEqual(['Step 1', 'Step 2', 'Step 3']);
		expect(task.getIsComplete()).toBe(false);
		expect(task.getNextStep()).toEqual('Step 2');
	});

	describe('getSteps', () => {
		it('getSteps should return an empty array if there are no steps', () => {
			expect(task.getSteps()).toEqual([]);
		});

		it('getSteps should return an array of the steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');

			expect(task.getSteps()).toEqual(['Step 1', 'Step 2', 'Step 3']);
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

			expect(task.getNextStep()).toEqual('Step 1');
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

			expect(task.getNextStep()).toEqual('Step 2');
		});

		it('getNextStep should return the next uncomplete step if they just skipped a task', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.skipNextStep();

			expect(task.getNextStep()).toEqual('Step 3');
		});

		it('getNextStep should return the next uncomplete step even if they just skipped twice in a row', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.addStep('Step 4');
			task.completeNextStep();
			task.skipNextStep();
			task.skipNextStep();

			expect(task.getNextStep()).toEqual('Step 4');
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

			expect(task.getNextStep()).toEqual('Step 1');
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

			expect(task.getNextStep()).toEqual('Step 2');
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

			expect(task.getNextStep()).toEqual('Step 2');
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

			expect(task.getNextStep()).toEqual('Step 3');
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

			expect(task.getSteps()).toEqual(['Step 1', 'Step 4', 'Step 3']);
			expect(task.getNextStep()).toEqual('Step 4');
		});

		it('replaceNextStep should do nothing if there are no uncompleted steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.addStep('Step 3');
			task.completeNextStep();
			task.completeNextStep();
			task.completeNextStep();

			task.replaceNextStep('Step 4');
			expect(task.getSteps()).toEqual(['Step 1', 'Step 2', 'Step 3']);
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

				expect(task.getSteps()).toEqual(['Step 1']);
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
			expect(task.getNextStep()).toEqual('Step 2');
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

			expect(task.getNextStep()).toEqual('Step 2');
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

	describe('editSteps', () => {
		it('editSteps should edit the steps with the given steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.editSteps(['Step 3', 'Step 4']);
			expect(task.getSteps()).toEqual(['Step 3', 'Step 4']);
		});

		it('editSteps should keep the step status when editing the steps', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.completeNextStep();

			task.editSteps(['Step 3', 'Step 4']);
			expect(task.getSteps()).toEqual(['Step 3', 'Step 4']);
			expect(task.getNextStep()).toEqual('Step 4');
		});

		it('editSteps should handle an empty array', () => {
			task.addStep('Step 1');
			task.addStep('Step 2');
			task.editSteps([]);
			expect(task.getSteps()).toEqual([]);
		});

		it('editSteps should handle no steps', () => {
			task.editSteps(['Step 1', 'Step 2']);
			expect(task.getSteps()).toEqual(['Step 1', 'Step 2']);
		});
	});

	describe('getTimeToComplete', () => {
		it('getTimeToComplete should return infinity if there is no deadline', () => {
			expect(task.getTimeToComplete(new Date())).toEqual(Infinity);
		});

		it('getTimeToComplete should return negative if the deadline is in the past', () => {
			const currentTime = new Date();
			task.setDeadline(new Date(currentTime.getTime() - 1));
			expect(task.getTimeToComplete(new Date())).toEqual(-1);
		});

		it('getTimeToComplete should return the number of milliseconds left if the deadline is in the future', () => {
			const currentTime = new Date();
			const deadline = new Date(currentTime.getTime() + 1000);
			task.setDeadline(deadline);
			expect(task.getTimeToComplete(currentTime)).toBe(1000);
		});

		it('getTimeToComplete should return the number of milliseconds between the deadline and start time if the start time is in the future', () => {
			const currentTime = new Date();
			const startTime = new Date(currentTime.getTime() + 1000);
			const deadline = new Date(currentTime.getTime() + 2000);
			task.setStartTime(startTime);
			task.setDeadline(deadline);
			expect(task.getTimeToComplete(currentTime)).toBe(1000);
		});
	});

	describe('getTimeUntilDeadline', () => {
		const currentTime = new Date();

		it('should return infinity if there is no deadline', () => {
			expect(task.getTimeUntilDeadline(currentTime)).toEqual(Infinity);
		});

		it('should return the number of milliseconds left if the deadline is in the future', () => {
			const deadline = new Date(currentTime.getTime() + 1000);
			task.setDeadline(deadline);
			expect(task.getTimeUntilDeadline(currentTime)).toBe(1000);
		});

		it('should return negative time if the deadline is in the past', () => {
			const deadline = new Date(currentTime.getTime() - 1000);
			task.setDeadline(deadline);
			expect(task.getTimeUntilDeadline(currentTime)).toBe(-1000);
		})
	});

	describe('getMaxRequiredTime', () => {
		it('getMaxRequiredTime should return infinity if there is no maxRequiredTime or deadline', () => {
			expect(task.getMaxRequiredTime(new Date())).toEqual(Infinity);
		});

		it('getMaxRequiredTime should return the time left to complete the task if there is a deadline', () => {
			const currentTime = new Date();

			task.setDeadline(new Date(currentTime.getTime() + 1000));

			expect(task.getMaxRequiredTime(currentTime)).toEqual(task.getTimeToComplete(currentTime));
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
		task.completeStep('Step 1');
		task.skipStep('Step 2');
		task.setDeadline(currentTime);
		task.setMinRequiredTime(1000);
		task.setMaxRequiredTime(2000);
		task.makeRecurring(1000, currentTime);

		const state = task.getState();

		expect(state.description).toEqual(task.getDescription());
		expect(state.isComplete).toEqual(task.getIsComplete());
		expect(state.isMandatory).toEqual(task.getIsMandatory());
		expect(state.isSkipped).toEqual(task.getIsSkipped());

		expect(state.startTime).toEqual(task.getStartTime());
		expect(state.deadline).toEqual(task.getDeadline());
		expect(state.minDuration).toEqual(task.getMinRequiredTime());
		expect(state.maxDuration).toEqual(task.getMaxRequiredTime(currentTime));
		expect(state.repeatInterval).toEqual(1000);
		expect(state.stepsToStatusMap).toEqual(
			new Map(
				[
					['Step 1', 'Completed'],
					['Step 2', 'Skipped'],
					['Step 3', 'Uncomplete'],
				]
			)
		);
		expect(state.lastActionedStep).toEqual({
			step: 'Step 2',
			status: 'Skipped' as StepStatus,
		});
	});

	it('restoreState should restore internal state of the task', () => {
		const currentTime = new Date();
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.addStep('Step 3');
		task.completeStep('Step 1');
		task.skipStep('Step 2');
		task.setDeadline(currentTime);
		task.setMinRequiredTime(1000);
		task.setMaxRequiredTime(2000);
		task.makeRecurring(1000, currentTime);

		const state = task.getState();

		task.editSteps(['Step 4', 'Step 5', 'Step 6']);
		task.setDescription('New Description');
		task.completeNextStep();
		task.setMaxRequiredTime(3000);
		task.setMinRequiredTime(2000);
		task.setDeadline(new Date(currentTime.getTime() + 1000));
		task.setStartTime(new Date(currentTime.getTime() + 2000));
		task.setMandatory(true);

		task.restoreState(state);

		expect(task.getDescription()).toEqual('Sample Task');
		expect(task.getIsComplete()).toEqual(false);
		expect(task.getIsMandatory()).toEqual(false);
		expect(task.getIsSkipped()).toEqual(false);
		expect(task.getDeadline()).toEqual(currentTime);
		expect(task.getStartTime()).toEqual(currentTime);
		expect(task.getMinRequiredTime()).toEqual(1000);
		expect(task.getMaxRequiredTime(currentTime)).toEqual(2000);
		expect(task.getRepeatInterval()).toEqual(1000);
		expect(task.getSteps()).toEqual(['Step 1', 'Step 2', 'Step 3']);
	});

	describe('isActive', () => {
		const currentTime = new Date();

		it('should return true if the start and end time is not set', () => {
			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return false if the start time is after the current time', () => {
			task.setStartTime(new Date(currentTime.getTime() + 1));

			expect(task.isActive(currentTime)).toEqual(false);
		});

		it('should return false if the end time is before the current time', () => {
			task.setEndTime(new Date(currentTime.getTime() - 1));

			expect(task.isActive(currentTime)).toEqual(false);
		});

		it('should return true if the time is between the start and end time', () => {
			const startTime = new Date(currentTime.getTime() - 1000);
			const endTime = new Date(currentTime.getTime() + 1000);

			task.setStartTime(startTime);
			task.setEndTime(endTime);

			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return true ifthe end time is after the current time', () => {
			task.setEndTime(new Date(currentTime.getTime() + 1000));

			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return true if the start time is before the current time', () => {
			task.setStartTime(new Date(currentTime.getTime() - 1000));

			expect(task.isActive(currentTime)).toEqual(true);
		});

		it('should return false if the task is completed', () => {
			task.completeNextStep();
			expect(task.isActive(currentTime)).toEqual(false);
		});
	});
});

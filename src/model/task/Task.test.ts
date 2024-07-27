import TasksManager from "../TasksManager";
import StepStatus from "./StepStatus";
import Task from "./Task";

describe('Task', () => {
	const tasksManager: TasksManager = new TasksManager();
	let task: Task;

	beforeEach(() => {
			task = tasksManager.addTask('Sample Task');
	});

	it('should initialize with description', () => {
			expect(task.getDescription()).toEqual('Sample Task');
	});

	it('changeDescription should change description', () => {
			task.setDescription('New Description');
			expect(task.getDescription()).toEqual('New Description');
	});

	it('isRecurring should return true if task is recurring', () => {
		task.makeRecurring(1000, new Date());
		expect(task.isRecurring()).toBe(true);
	});

	it('isRecurring should return false if task is not recurring', () => {
		task.setDeadline(new Date());
		task.setEarliestStartTime(new Date());
		task.setMinRequiredTime(1000);
		task.setMaxRequiredTime(2000);
		expect(task.isRecurring()).toBe(false);
	})

	it('makeRecurring should set repeat interval and earliest start time', () => {
		const currentTime = new Date();
		task.makeRecurring(1000, currentTime);

		expect(task.getRepeatInterval()).toEqual(1000);
		expect(task.getEarliestStartTime()).toEqual(currentTime);
	});

	it('makeRecurring should set deadline to earliest start time + repeat interval if deadline is not set', () => {
		task.makeRecurring(1000, new Date());

		const intervalEndTime = new Date(task.getEarliestStartTime()!.getTime() + 1000);

		expect(task.getDeadline()).toEqual(intervalEndTime);
	});

	it('makeRecurring should set deadline to earliest start time + repeat interval if deadline is past interval end time', () => {
		task.setDeadline(
			new Date(Date.now() + 2000)
		);

		task.makeRecurring(1000, new Date());

		const intervalEndTime = new Date(task.getEarliestStartTime()!.getTime() + 1000);

		expect(task.getDeadline()).toEqual(intervalEndTime);
	});

	it('makeReccuring should not set deadline if deadline is not past interval end time', () => {
		const deadline = new Date(Date.now() + 500);
		task.setDeadline(deadline);

		task.makeRecurring(1000, new Date());

		expect(task.getDeadline()).toEqual(deadline);
	});

	it('isPastIntervalEndTime should return true if current time is past interval end time', () => {
		const currentTime = new Date();
		const intervalStartTime = new Date(currentTime.getTime() - 2000);
		task.makeRecurring(1000, intervalStartTime);

		expect(task.isPastIntervalEndTime(currentTime)).toBe(true);
	})

	it('isPastIntervalEndTime should return false if current time is not past interval end time', () => {
		const currentTime = new Date();
		const intervalStartTime = new Date(currentTime.getTime() + 2000);
		task.makeRecurring(1000, intervalStartTime);

		expect(task.isPastIntervalEndTime(currentTime)).toBe(false);
	});

	it('isPastIntervalEndTime should return false if task is not recurring', () => {
		const currentTime = new Date();
		task.setDeadline(currentTime);
		task.setEarliestStartTime(new Date());
		task.setMinRequiredTime(1000);
		task.setMaxRequiredTime(2000);
		expect(task.isPastIntervalEndTime(currentTime)).toBe(false);
	});

	it('onPastIntervalEndTime should do nothing if task is not recurring', () => {
		const currentTime = new Date();
		const deadline = currentTime;
		const earliestStartTime = currentTime;
		task.setDeadline(deadline);
		task.setEarliestStartTime(earliestStartTime);
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
		expect(task.getEarliestStartTime()).toEqual(earliestStartTime);
	});

	it('onPastIntervalEndTime should reset progress if task is recurring', () => {
		const currentTime = new Date();
		task.makeRecurring(1000, currentTime);
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.completeNextStep();

		task.onPastIntervalEndTime(currentTime);

		expect(task.getSteps()).toEqual(['Step 1', 'Step 2']);
		expect(task.getIsComplete()).toBe(false);
		expect(task.getNextStep()).toEqual('Step 1');
	});

	it('onPastIntervalEndTime should set earliest start time and deadline to most recent time not in the future if task is recurring', () => {
		const currentTime = new Date();

		const repeatInterval = 1000;
		const intervalStartTime = new Date(currentTime.getTime() - 2000);
		const deadline = new Date(intervalStartTime.getTime() + 500);

		const expectedEarliestStartTime = new Date(currentTime.getTime());
		const expectedDeadline = new Date(expectedEarliestStartTime.getTime() + 500);

		task.setDeadline(deadline);
		task.makeRecurring(repeatInterval, intervalStartTime);

		task.onPastIntervalEndTime(currentTime);

		expect(task.getEarliestStartTime()).toEqual(expectedEarliestStartTime);
		expect(task.getDeadline()).toEqual(expectedDeadline);
	});

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

	it('getSteps should return an empty array if there are no steps', () => {
		expect(task.getSteps()).toEqual([]);
	});

	it('getSteps should return an array of the steps', () => {
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.addStep('Step 3');

		expect(task.getSteps()).toEqual(['Step 1', 'Step 2', 'Step 3']);
	})

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

	it('hasNextStep should return false if all steps are skipped', () => {
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.addStep('Step 3');
		task.skipNextStep();
		task.skipNextStep();
		task.skipNextStep();

		expect(task.hasNextStep()).toBe(false);
	});

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

	it('getNextStep should return null if there are no uncompleted steps', () => {
		task.addStep('Step 1');
		task.addStep('Step 2');
		task.addStep('Step 3');
		task.completeNextStep();
		task.completeNextStep();
		task.skipNextStep();

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

	it('getNextStep should return nothing if they just skipped a task but there are no uncomplete tasks', () => {
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

		expect(task.getNextStep()).toBeNull();
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

		expect(task.getNextStep()).toBeNull();
		expect(task.getIsComplete()).toBe(false);
		expect(task.getIsSkipped()).toBe(true);
	});

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

	it('getTimeToComplete should return the number of milliseconds between the deadline and earliest start time if the earliest start time is in the future', () => {
		const currentTime = new Date();
		const earliestStartTime = new Date(currentTime.getTime() + 1000);
		const deadline = new Date(currentTime.getTime() + 2000);
		task.setEarliestStartTime(earliestStartTime);
		task.setDeadline(deadline);
		expect(task.getTimeToComplete(currentTime)).toBe(1000);
	});

	it('getMaxRequiredTime should return infinity if there is no maxRequiredTime or deadline', () => {
		expect(task.getMaxRequiredTime(new Date())).toEqual(Infinity);
	});

	it('getMaxRequiredTime should return the time left to complete the task if there is a deadline', () => {
		const currentTime = new Date();

		task.setDeadline(new Date(currentTime.getTime() + 1000));

		expect(task.getMaxRequiredTime(currentTime)).toEqual(task.getTimeToComplete(currentTime));
	});

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

		const state = task.getCurrentState();

		expect(state.description).toEqual(task.getDescription());
		expect(state.isComplete).toEqual(task.getIsComplete());
		expect(state.isMandatory).toEqual(task.getIsMandatory());
		expect(state.isSkipped).toEqual(task.getIsSkipped());

		expect(state.earliestStartTime).toEqual(task.getEarliestStartTime());
		expect(state.deadline).toEqual(task.getDeadline());
		expect(state.minRequiredTime).toEqual(task.getMinRequiredTime());
		expect(state.maxRequiredTime).toEqual(task.getMaxRequiredTime(currentTime));
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
		expect(state.lastAction).toEqual({
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

		const state = task.getCurrentState();

		task.editSteps(['Step 4', 'Step 5', 'Step 6']);
		task.setDescription('New Description');
		task.completeNextStep();
		task.setMaxRequiredTime(3000);
		task.setMinRequiredTime(2000);
		task.setDeadline(new Date(currentTime.getTime() + 1000));
		task.setEarliestStartTime(new Date(currentTime.getTime() + 2000));
		task.setMandatory(true);

		task.restoreState(state);

		expect(task.getDescription()).toEqual('Sample Task');
		expect(task.getIsComplete()).toEqual(false);
		expect(task.getIsMandatory()).toEqual(false);
		expect(task.getIsSkipped()).toEqual(false);
		expect(task.getDeadline()).toEqual(currentTime);
		expect(task.getEarliestStartTime()).toEqual(currentTime);
		expect(task.getMinRequiredTime()).toEqual(1000);
		expect(task.getMaxRequiredTime(currentTime)).toEqual(2000);
		expect(task.getRepeatInterval()).toEqual(1000);
		expect(task.getSteps()).toEqual(['Step 1', 'Step 2', 'Step 3']);
	});
});

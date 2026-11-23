import { describe, it, expect, beforeEach } from 'vitest';
import TasksManager from '../../TasksManager';
import Task from '../Task';
import RecurrenceUnit from '../recurrence/RecurrenceUnit';
import { RecurringTaskInSequenceError } from '../TaskTimingError';
import {
	calculateSequenceDueDateSlack,
	calculateSequenceTargetOrDueDateSlack,
	getTasksThatCanBePrerequisiteTasksOfTask,
	hasIncompletePrerequisiteTask,
} from './taskSequence';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const currentTime = new Date(2024, 0, 1, 12, 0, 0, 0);

let tasksManager: TasksManager;

function addTask(parameters: { description: string, dueDate?: Date, targetDate?: Date, maximumDurationInHours?: number }): Task {
	const task = tasksManager.addCreatedTask(parameters.description);
	task.setDueDate(parameters.dueDate ?? null);
	task.setTargetDate(parameters.targetDate ?? null);
	if (parameters.maximumDurationInHours !== undefined) {
		task.setMaxRequiredTime(parameters.maximumDurationInHours * MILLISECONDS_PER_HOUR);
	}
	return task;
}

beforeEach(() => {
	tasksManager = new TasksManager();
});

describe('a later task', () => {
	it('is not active until its prerequisite task is completed', () => {
		const watchD3 = addTask({ description: 'Watch D3' });
		const callParents = addTask({ description: 'Call parents' });
		callParents.addPrerequisiteTaskID(watchD3.id);

		expect(callParents.isActive(currentTime)).toBe(false);

		watchD3.setComplete(true);

		expect(callParents.isActive(currentTime)).toBe(true);
	});

	it('waits for every one of its prerequisite tasks', () => {
		const buyCake = addTask({ description: 'Buy cake' });
		const wrapPresent = addTask({ description: 'Wrap present' });
		const goToParty = addTask({ description: 'Go to party' });
		goToParty.addPrerequisiteTaskID(buyCake.id);
		goToParty.addPrerequisiteTaskID(wrapPresent.id);

		buyCake.setComplete(true);

		expect(goToParty.isActive(currentTime)).toBe(false);

		wrapPresent.setComplete(true);

		expect(goToParty.isActive(currentTime)).toBe(true);
	});

	it('stays waiting while its prerequisite task is skipped', () => {
		const watchD3 = addTask({ description: 'Watch D3' });
		const callParents = addTask({ description: 'Call parents' });
		callParents.addPrerequisiteTaskID(watchD3.id);

		watchD3.skipUntil(new Date(currentTime.getTime() + MILLISECONDS_PER_HOUR), currentTime);

		expect(callParents.isActive(currentTime)).toBe(false);
	});

	it('ignores a prerequisite task that no longer exists', () => {
		const callParents = addTask({ description: 'Call parents' });
		callParents.addPrerequisiteTaskID('deleted-task-id');

		expect(callParents.isActive(currentTime)).toBe(true);
	});

	it('ignores prerequisite tasks that loop back to it, so a loop never hides its tasks forever', () => {
		const firstTask = addTask({ description: 'First task' });
		const secondTask = addTask({ description: 'Second task' });
		firstTask.addPrerequisiteTaskID(secondTask.id);
		secondTask.addPrerequisiteTaskID(firstTask.id);

		expect(hasIncompletePrerequisiteTask({ task: firstTask, tasks: tasksManager.getTasks() })).toBe(false);
		expect(hasIncompletePrerequisiteTask({ task: secondTask, tasks: tasksManager.getTasks() })).toBe(false);
	});
});

describe('getTasksThatCanBePrerequisiteTasksOfTask', () => {
	it('leaves out the task itself, completed tasks, recurring tasks, existing prerequisite tasks, and tasks that would create a loop', () => {
		const playDeadlock = addTask({ description: 'Play Deadlock' });
		const watchD3 = addTask({ description: 'Watch D3' });
		const callParents = addTask({ description: 'Call parents' });
		const finishedTask = addTask({ description: 'Finished task' });
		const takeOutTrash = addTask({ description: 'Take out trash' });
		const doLaundry = addTask({ description: 'Do laundry' });
		watchD3.addPrerequisiteTaskID(playDeadlock.id);
		callParents.addPrerequisiteTaskID(watchD3.id);
		finishedTask.setComplete(true);
		takeOutTrash.makeRecurring({ amount: 1, unit: RecurrenceUnit.Day }, currentTime, currentTime);

		const tasksThatCanBePrerequisiteTasks = getTasksThatCanBePrerequisiteTasksOfTask({
			dependentTask: watchD3,
			tasks: tasksManager.getTasks(),
		});

		expect(tasksThatCanBePrerequisiteTasks).toEqual([doLaundry]);
	});

	it('offers nothing for a recurring task', () => {
		const takeOutTrash = addTask({ description: 'Take out trash' });
		addTask({ description: 'Do laundry' });
		takeOutTrash.makeRecurring({ amount: 1, unit: RecurrenceUnit.Day }, currentTime, currentTime);

		expect(getTasksThatCanBePrerequisiteTasksOfTask({ dependentTask: takeOutTrash, tasks: tasksManager.getTasks() })).toEqual([]);
	});
});

describe('making a task in a sequence recurring', () => {
	it('fails for a prerequisite task and for a later task', () => {
		const watchD3 = addTask({ description: 'Watch D3' });
		const callParents = addTask({ description: 'Call parents' });
		callParents.addPrerequisiteTaskID(watchD3.id);
		const oneDay = { amount: 1, unit: RecurrenceUnit.Day };

		expect(() => watchD3.makeRecurring(oneDay, currentTime, currentTime)).toThrow(RecurringTaskInSequenceError);
		expect(() => callParents.setFromTaskTimingOptions({
			...callParents.getTaskTimingOptions(),
			recurrenceDuration: oneDay,
		}, currentTime)).toThrow(RecurringTaskInSequenceError);
		expect(callParents.isRecurring()).toBe(false);
	});
});

describe('sequence slack', () => {
	let playDeadlock: Task;
	let watchD3: Task;
	let callParents: Task;

	beforeEach(() => {
		playDeadlock = addTask({ description: 'Play Deadlock', maximumDurationInHours: 1 });
		watchD3 = addTask({ description: 'Watch D3', maximumDurationInHours: 2 });
		callParents = addTask({
			description: 'Call parents',
			dueDate: new Date(2024, 0, 1, 17, 0, 0, 0),
			maximumDurationInHours: 1,
		});
		watchD3.addPrerequisiteTaskID(playDeadlock.id);
		callParents.addPrerequisiteTaskID(watchD3.id);
	});

	it('subtracts the longest each task in the sequence could take from the last task\'s due date slack', () => {
		const tasks = tasksManager.getTasks();

		expect(calculateSequenceDueDateSlack({ task: callParents, tasks, currentTime })).toBe(4 * MILLISECONDS_PER_HOUR);
		expect(calculateSequenceDueDateSlack({ task: watchD3, tasks, currentTime })).toBe(2 * MILLISECONDS_PER_HOUR);
		expect(calculateSequenceDueDateSlack({ task: playDeadlock, tasks, currentTime })).toBe(1 * MILLISECONDS_PER_HOUR);
	});

	it('keeps a task\'s own slack when it is smaller than what its later tasks leave it', () => {
		playDeadlock.setDueDate(new Date(2024, 0, 1, 12, 30, 0, 0));

		const sequenceDueDateSlack = calculateSequenceDueDateSlack({ task: playDeadlock, tasks: tasksManager.getTasks(), currentTime });

		expect(sequenceDueDateSlack).toBe(-0.5 * MILLISECONDS_PER_HOUR);
	});

	it('stops counting a later task once it is completed', () => {
		callParents.setComplete(true);

		const sequenceDueDateSlack = calculateSequenceDueDateSlack({ task: playDeadlock, tasks: tasksManager.getTasks(), currentTime });

		expect(sequenceDueDateSlack).toBe(Number.POSITIVE_INFINITY);
	});

	it('passes a later task\'s target date on the same way', () => {
		callParents.setDueDate(null);
		callParents.setTargetDate(new Date(2024, 0, 1, 17, 0, 0, 0));

		const tasks = tasksManager.getTasks();

		expect(calculateSequenceDueDateSlack({ task: playDeadlock, tasks, currentTime })).toBe(Number.POSITIVE_INFINITY);
		expect(calculateSequenceTargetOrDueDateSlack({ task: playDeadlock, tasks, currentTime })).toBe(1 * MILLISECONDS_PER_HOUR);
	});

	it('makes the first task in the sequence urgent when the last task\'s due date can no longer be met otherwise', () => {
		callParents.setDueDate(new Date(2024, 0, 1, 15, 30, 0, 0));

		expect(callParents.isUrgent(currentTime)).toBe(false);
		expect(playDeadlock.isUrgent(currentTime)).toBe(true);
	});
});

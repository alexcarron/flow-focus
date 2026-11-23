import { describe, it, expect, beforeEach } from 'vitest';
import TasksManager from './TasksManager';
import TaskPrioritizer from './TaskPrioritizer';
import Task from './task/Task';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

let tasksManager: TasksManager;
let taskPrioritizer: TaskPrioritizer;

function addTask(parameters: {
	description: string,
	startDate?: Date,
	targetDate?: Date,
	dueDate?: Date,
	minimumDuration?: number,
	maximumDuration?: number,
}): Task {
	const task = tasksManager.addCreatedTask(parameters.description);
	task.setStartDate(parameters.startDate ?? null);
	task.setTargetDate(parameters.targetDate ?? null);
	task.setDueDate(parameters.dueDate ?? null);
	task.setMinRequiredTime(parameters.minimumDuration ?? null);
	task.setMaxRequiredTime(parameters.maximumDuration ?? null);
	return task;
}

function getFocusableTaskDescriptions(currentTime: Date): string[] {
	return taskPrioritizer
		.getFocusableTasksInPriorityOrder(currentTime)
		.map(task => task.getDescription());
}

beforeEach(() => {
	tasksManager = new TasksManager();
	taskPrioritizer = new TaskPrioritizer(tasksManager);
});

describe('a weekly routine with a Sunday target date and a Monday due date, and batch cooking due Sunday', () => {
	beforeEach(() => {
		addTask({
			description: 'Weekly routine',
			startDate: new Date(2026, 10, 13, 7, 0),
			targetDate: new Date(2026, 10, 15, 23, 0),
			dueDate: new Date(2026, 10, 16, 23, 0),
			minimumDuration: 30 * MILLISECONDS_PER_MINUTE,
			maximumDuration: 6 * MILLISECONDS_PER_HOUR,
		});
		addTask({
			description: 'Cook batch meals',
			startDate: new Date(2026, 10, 14, 0, 0),
			dueDate: new Date(2026, 10, 15, 23, 0),
			minimumDuration: 1 * MILLISECONDS_PER_HOUR,
			maximumDuration: 4 * MILLISECONDS_PER_HOUR,
		});
	});

	it('shows the weekly routine first on Saturday, when neither due date has to be started that day', () => {
		const saturdayMorning = new Date(2026, 10, 14, 10, 0);

		expect(getFocusableTaskDescriptions(saturdayMorning)).toEqual(['Weekly routine', 'Cook batch meals']);
	});

	it('shows batch cooking first on Sunday, when its due date slack runs out that day', () => {
		const sundayMorning = new Date(2026, 10, 15, 10, 0);

		expect(getFocusableTaskDescriptions(sundayMorning)).toEqual(['Cook batch meals', 'Weekly routine']);
	});
});

describe('less due date slack', () => {
	it('does not put a due date weeks away ahead of a target date today', () => {
		const sundayMorning = new Date(2026, 10, 15, 10, 0);
		addTask({
			description: 'Homework',
			dueDate: new Date(2026, 11, 6, 23, 0),
			maximumDuration: 3 * MILLISECONDS_PER_HOUR,
		});
		addTask({
			description: 'Play a game',
			targetDate: new Date(2026, 10, 15, 17, 0),
			maximumDuration: 2 * MILLISECONDS_PER_HOUR,
		});

		expect(getFocusableTaskDescriptions(sundayMorning)).toEqual(['Play a game', 'Homework']);
	});
});

describe('due date over target date only', () => {
	it('puts a due date task first when the target date only tasks before it would leave too little time to finish it', () => {
		const sundayMorning = new Date(2026, 10, 15, 10, 0);
		addTask({
			description: 'Report',
			dueDate: new Date(2026, 10, 17, 20, 0),
			maximumDuration: 20 * MILLISECONDS_PER_HOUR,
		});
		addTask({
			description: 'Organize photos',
			targetDate: new Date(2026, 10, 16, 12, 0),
			maximumDuration: 12 * MILLISECONDS_PER_HOUR,
		});
		addTask({
			description: 'Clean garage',
			targetDate: new Date(2026, 10, 16, 18, 0),
			maximumDuration: 12 * MILLISECONDS_PER_HOUR,
		});

		expect(getFocusableTaskDescriptions(sundayMorning)[0]).toBe('Report');
	});
});

describe('missed dates', () => {
	const sundayEvening = new Date(2026, 10, 15, 20, 0);

	it('keeps a task with a missed target date on the Focus page', () => {
		addTask({
			description: 'Play a game',
			targetDate: new Date(2026, 10, 15, 17, 0),
		});

		expect(getFocusableTaskDescriptions(sundayEvening)).toEqual(['Play a game']);
	});

	it('keeps a skipped task hidden when only its target date was missed', () => {
		const task = addTask({
			description: 'Play a game',
			targetDate: new Date(2026, 10, 15, 17, 0),
		});
		task.skipNextStep();

		expect(getFocusableTaskDescriptions(sundayEvening)).toEqual([]);
	});

	it('brings a skipped task back when its due date has no slack left', () => {
		const task = addTask({
			description: 'Homework',
			targetDate: new Date(2026, 10, 15, 12, 0),
			dueDate: new Date(2026, 10, 15, 21, 0),
			maximumDuration: 2 * MILLISECONDS_PER_HOUR,
		});
		task.skipNextStep();

		expect(getFocusableTaskDescriptions(sundayEvening)).toEqual(['Homework']);
	});
});

describe('a sequence of playing Deadlock, then watching D3, then calling parents, with only the call having a target date', () => {
	const noon = new Date(2026, 10, 23, 12, 0);
	let playDeadlock: Task;
	let watchD3: Task;
	let callParents: Task;

	beforeEach(() => {
		playDeadlock = addTask({
			description: 'Play Deadlock',
			maximumDuration: 1 * MILLISECONDS_PER_HOUR,
		});
		watchD3 = addTask({
			description: 'Watch D3',
			maximumDuration: 2 * MILLISECONDS_PER_HOUR,
		});
		callParents = addTask({
			description: 'Call parents',
			targetDate: new Date(2026, 10, 23, 22, 0),
			maximumDuration: 1 * MILLISECONDS_PER_HOUR,
		});
		addTask({
			description: 'Do laundry',
			targetDate: new Date(2026, 10, 24, 18, 0),
			maximumDuration: 1 * MILLISECONDS_PER_HOUR,
		});
		watchD3.addPrerequisiteTaskID(playDeadlock.id);
		callParents.addPrerequisiteTaskID(watchD3.id);
	});

	it('shows Deadlock first, ahead of a task it would have no date to compete with, and hides the later tasks', () => {
		expect(getFocusableTaskDescriptions(noon)).toEqual(['Play Deadlock', 'Do laundry']);
	});

	it('shows each later task once the task before it is completed', () => {
		playDeadlock.setComplete(true);

		expect(getFocusableTaskDescriptions(noon)).toEqual(['Watch D3', 'Do laundry']);

		watchD3.setComplete(true);

		expect(getFocusableTaskDescriptions(noon)).toEqual(['Call parents', 'Do laundry']);
	});

	it('shows a skipped first task anyway when the sequence can no longer meet a due date otherwise', () => {
		callParents.setTargetDate(null);
		callParents.setDueDate(new Date(2026, 10, 23, 15, 30));
		playDeadlock.skipNextStep();

		expect(getFocusableTaskDescriptions(noon)).toEqual(['Play Deadlock', 'Do laundry']);
	});

	it('puts the sequence ahead of a target date only task when doing that task first would miss the due date passed down the sequence', () => {
		callParents.setTargetDate(null);
		callParents.setDueDate(new Date(2026, 10, 25, 12, 0));
		addTask({
			description: 'Read a long book',
			targetDate: new Date(2026, 10, 24, 20, 0),
			maximumDuration: 30 * MILLISECONDS_PER_HOUR,
		});

		expect(getFocusableTaskDescriptions(noon)).toEqual(['Play Deadlock', 'Read a long book', 'Do laundry']);
	});
});

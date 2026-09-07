import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../persistence/local/flowfocus.db';
import StepStatus from '../model/task/StepStatus';
import { useTasksStore, tasksManager } from './tasksStore';

beforeEach(async () => {
	await db.delete();
	await db.open();
	tasksManager.clearTasks();
	useTasksStore.setState({ tasks: [], isLoading: true, undoStack: [], redoStack: [] });
});

afterEach(() => {
	vi.useRealTimers();
});

async function reload(): Promise<void> {
	tasksManager.clearTasks();
	await useTasksStore.getState().loadTasks();
}

describe('creating a task', () => {
	it('is there after reloading', async () => {
		await useTasksStore.getState().addTask('Water the plants');

		await reload();

		const reloadedTasks = useTasksStore.getState().tasks;
		expect(reloadedTasks).toHaveLength(1);
		expect(reloadedTasks[0].getDescription()).toBe('Water the plants');
	});

	it('keeps the same id after reloading', async () => {
		const createdTask = await useTasksStore.getState().addTask('Water the plants');

		await reload();

		const reloadedTask = useTasksStore.getState().tasks[0];
		expect(reloadedTask.id).toBe(createdTask.id);
	});
});

describe('editing a task', () => {
	it('keeps the edit after reloading', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');

		useTasksStore.getState().setDescription(task, 'Water the plants twice');

		await reload();

		expect(useTasksStore.getState().tasks[0].getDescription()).toBe('Water the plants twice');
	});

	it('keeps the same id after reloading', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');

		useTasksStore.getState().setDescription(task, 'Water the plants twice');

		await reload();

		expect(useTasksStore.getState().tasks[0].id).toBe(task.id);
	});
});

describe('deleting a task', () => {
	it('is gone after reloading', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');

		await useTasksStore.getState().deleteTask(task);
		await reload();

		expect(useTasksStore.getState().tasks).toHaveLength(0);
	});
});

describe('completing a task', () => {
	it('keeps a completed step after reloading', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');
		useTasksStore.getState().setSteps(task, ['Fill watering can']);

		useTasksStore.getState().completeNextStep(task);

		await reload();

		const reloadedTask = useTasksStore.getState().tasks[0];
		expect(reloadedTask.getSteps()[0].status).toBe(StepStatus.COMPLETED);
	});

	it('keeps a fully completed task after reloading', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');

		useTasksStore.getState().setComplete(task, true);

		await reload();

		expect(useTasksStore.getState().tasks[0].getIsComplete()).toBe(true);
	});
});

describe('a recurring task', () => {
	it('advances to its next occurrence once time passes, and only once', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const now = new Date('2026-01-01T00:00:00.000Z');
		vi.setSystemTime(now);

		const oneDay = 1000 * 60 * 60 * 24;
		const task = await useTasksStore.getState().addTask('Take out the trash', {
			startTime: now,
			repeatInterval: oneDay,
		});
		const firstOccurrenceStart = task.getReccurenceStartTime();

		vi.setSystemTime(new Date(now.getTime() + oneDay + 1000));
		tasksManager.update(new Date());
		useTasksStore.getState().refreshTasks();

		const advancedOccurrenceStart = useTasksStore.getState().tasks[0].getReccurenceStartTime();
		expect(advancedOccurrenceStart?.getTime()).toBe((firstOccurrenceStart as Date).getTime() + oneDay);

		tasksManager.update(new Date(now.getTime() + oneDay + 2000));
		useTasksStore.getState().refreshTasks();

		expect(useTasksStore.getState().tasks[0].getReccurenceStartTime()?.getTime())
			.toBe((firstOccurrenceStart as Date).getTime() + oneDay);
	});
});

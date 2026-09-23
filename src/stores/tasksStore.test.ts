import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RecurrenceUnit from '../model/task/recurrence/RecurrenceUnit';
import { db } from '../persistence/local/flowfocus.db';
import StepStatus from '../model/task/step/StepStatus';
import { useTasksStore, tasksManager } from './tasksStore';
import { useTagsStore } from './tagsStore';

beforeEach(async () => {
	await db.delete();
	await db.open();
	tasksManager.clearTasks();
	useTasksStore.setState({ tasks: [], isLoading: true, undoStack: [], redoStack: [] });
	useTagsStore.setState({ tags: [], isLoading: true });
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

describe('skipping a task', () => {
	it('keeps skippedUntil after reloading, without changing start time, end time, or deadline', async () => {
		const startTime = new Date('2020-01-01T00:00:00.000Z');
		const endTime = new Date('2020-01-01T01:00:00.000Z');
		const deadline = new Date('2020-01-01T02:00:00.000Z');
		const task = await useTasksStore.getState().addTask('Water the plants', { startTime, endTime, deadline });

		const skipUntilDate = new Date(Date.now() + 1000 * 60 * 60);
		useTasksStore.getState().skipTaskUntil(task, skipUntilDate);

		await reload();

		const reloadedTask = useTasksStore.getState().tasks[0];
		expect(reloadedTask.getSkippedUntil()).toEqual(skipUntilDate);
		expect(reloadedTask.getStartTime()).toEqual(startTime);
		expect(reloadedTask.getEndTime()).toEqual(endTime);
		expect(reloadedTask.getDeadline()).toEqual(deadline);
	});

	it('is undoable and redoable', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');
		const skipUntilDate = new Date(Date.now() + 1000 * 60 * 60);

		useTasksStore.getState().skipTaskUntil(task, skipUntilDate);
		expect(useTasksStore.getState().tasks[0].getSkippedUntil()).toEqual(skipUntilDate);

		useTasksStore.getState().undo();
		expect(useTasksStore.getState().tasks[0].getSkippedUntil()).toBeNull();

		useTasksStore.getState().redo();
		expect(useTasksStore.getState().tasks[0].getSkippedUntil()).toEqual(skipUntilDate);
	});

	it('clears skippedUntil after cancelling, and that is undoable too', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');
		const skipUntilDate = new Date(Date.now() + 1000 * 60 * 60);
		useTasksStore.getState().skipTaskUntil(task, skipUntilDate);

		useTasksStore.getState().cancelSkip(task);
		expect(useTasksStore.getState().tasks[0].getSkippedUntil()).toBeNull();

		useTasksStore.getState().undo();
		expect(useTasksStore.getState().tasks[0].getSkippedUntil()).toEqual(skipUntilDate);
	});
});

describe('a recurring task', () => {
	it('advances to its next occurrence once time passes, and only once', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const now = new Date('2026-01-01T00:00:00.000Z');
		vi.setSystemTime(now);

		const oneDayMilliseconds = 1000 * 60 * 60 * 24;
		const task = await useTasksStore.getState().addTask('Take out the trash', {
			startTime: now,
			recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Day },
		});
		const firstOccurrenceStart = task.getStartTime() as Date;

		vi.setSystemTime(new Date(now.getTime() + oneDayMilliseconds + 1000));
		tasksManager.update(new Date());
		useTasksStore.getState().refreshTasks();

		const advancedOccurrenceStart = useTasksStore.getState().tasks[0].getStartTime();
		expect(advancedOccurrenceStart?.getTime()).toBe(firstOccurrenceStart.getTime() + oneDayMilliseconds);

		tasksManager.update(new Date(now.getTime() + oneDayMilliseconds + 2000));
		useTasksStore.getState().refreshTasks();

		expect(useTasksStore.getState().tasks[0].getStartTime()?.getTime())
			.toBe(firstOccurrenceStart.getTime() + oneDayMilliseconds);
		expect(useTasksStore.getState().tasks[0].getAnchorStartTime()?.getTime()).toBe(firstOccurrenceStart.getTime());
	});

	it('persists only the anchor occurrence, so reloading after time passes derives the same current occurrence', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const now = new Date('2026-01-01T00:00:00.000Z');
		vi.setSystemTime(now);

		const oneDayMilliseconds = 1000 * 60 * 60 * 24;
		await useTasksStore.getState().addTask('Take out the trash', {
			startTime: now,
			recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Day },
		});

		vi.setSystemTime(new Date(now.getTime() + 3 * oneDayMilliseconds + 1000));
		tasksManager.update(new Date());
		tasksManager.clearTasks();
		await useTasksStore.getState().loadTasks();

		const reloadedTask = useTasksStore.getState().tasks[0];
		expect(reloadedTask.getAnchorStartTime()?.getTime()).toBe(now.getTime());
		expect(reloadedTask.getStartTime()?.getTime()).toBe(now.getTime() + 3 * oneDayMilliseconds);
	});
});

describe('tagging a task', () => {
	it('creates a new tag the first time it is added to a task', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');

		await useTasksStore.getState().addTagToTask(task, 'Home');

		expect(useTagsStore.getState().tags.map(tag => tag.name)).toEqual(['Home']);
		expect(useTasksStore.getState().tasks[0].getTagIDs()).toEqual([useTagsStore.getState().tags[0].id]);
	});

	it('reuses an existing tag with a case-insensitively matching name instead of creating a duplicate', async () => {
		const taskA = await useTasksStore.getState().addTask('Water the plants');
		const taskB = await useTasksStore.getState().addTask('Feed the cat');
		await useTasksStore.getState().addTagToTask(taskA, 'Home');

		await useTasksStore.getState().addTagToTask(taskB, 'home');

		expect(useTagsStore.getState().tags).toHaveLength(1);
		const tagID = useTagsStore.getState().tags[0].id;
		expect(useTasksStore.getState().tasks.find(t => t.id === taskA.id)?.getTagIDs()).toEqual([tagID]);
		expect(useTasksStore.getState().tasks.find(t => t.id === taskB.id)?.getTagIDs()).toEqual([tagID]);
	});

	it('deletes the tag once removed from its only referencing task', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');
		await useTasksStore.getState().addTagToTask(task, 'Home');
		const tagID = useTagsStore.getState().tags[0].id;

		await useTasksStore.getState().removeTagFromTask(task, tagID);

		expect(useTagsStore.getState().tags).toEqual([]);
	});

	it('keeps the tag when it is removed from one task but still referenced by another', async () => {
		const taskA = await useTasksStore.getState().addTask('Water the plants');
		const taskB = await useTasksStore.getState().addTask('Feed the cat');
		await useTasksStore.getState().addTagToTask(taskA, 'Home');
		const tagID = useTagsStore.getState().tags[0].id;
		await useTasksStore.getState().addTagToTask(taskB, 'Home');

		await useTasksStore.getState().removeTagFromTask(taskA, tagID);

		expect(useTagsStore.getState().tags.map(tag => tag.id)).toEqual([tagID]);
	});

	it('deletes a tag that was uniquely referenced by a task that gets deleted', async () => {
		const task = await useTasksStore.getState().addTask('Water the plants');
		await useTasksStore.getState().addTagToTask(task, 'Home');

		await useTasksStore.getState().deleteTask(task);

		expect(useTagsStore.getState().tags).toEqual([]);
	});
});

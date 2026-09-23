import { describe, it, expect } from 'vitest';
import TasksManager from '../model/TasksManager';
import filterTasksByTags from './filterTasksByTags';

function createTaskWithTagIDs(tasksManager: TasksManager, description: string, tagIDs: string[]) {
	const task = tasksManager.addCreatedTask(description);
	for (const tagID of tagIDs) task.addTagID(tagID);
	return task;
}

describe('filterTasksByTags', () => {
	it('returns every task unchanged when no tags and untagged are selected', () => {
		const tasksManager = new TasksManager();
		const taggedTask = createTaskWithTagIDs(tasksManager, 'Tagged', ['work']);
		const untaggedTask = createTaskWithTagIDs(tasksManager, 'Untagged', []);

		const result = filterTasksByTags({ tasks: [taggedTask, untaggedTask], selectedTagIDs: [], isUntaggedSelected: false });

		expect(result).toEqual([taggedTask, untaggedTask]);
	});

	it('returns the union of tasks having any selected tag, not the intersection', () => {
		const tasksManager = new TasksManager();
		const workOnlyTask = createTaskWithTagIDs(tasksManager, 'Work only', ['work']);
		const homeOnlyTask = createTaskWithTagIDs(tasksManager, 'Home only', ['home']);
		const bothTask = createTaskWithTagIDs(tasksManager, 'Both', ['work', 'home']);
		const neitherTask = createTaskWithTagIDs(tasksManager, 'Neither', ['errand']);

		const result = filterTasksByTags({ tasks: [workOnlyTask, homeOnlyTask, bothTask, neitherTask], selectedTagIDs: ['work', 'home'], isUntaggedSelected: false });

		expect(result).toEqual([workOnlyTask, homeOnlyTask, bothTask]);
	});

	it('shows only tasks with no tags when untagged is selected alone', () => {
		const tasksManager = new TasksManager();
		const taggedTask = createTaskWithTagIDs(tasksManager, 'Tagged', ['work']);
		const untaggedTask = createTaskWithTagIDs(tasksManager, 'Untagged', []);

		const result = filterTasksByTags({ tasks: [taggedTask, untaggedTask], selectedTagIDs: [], isUntaggedSelected: true });

		expect(result).toEqual([untaggedTask]);
	});

	it('unions untagged tasks with tag-matching tasks when both are selected', () => {
		const tasksManager = new TasksManager();
		const workTask = createTaskWithTagIDs(tasksManager, 'Work', ['work']);
		const homeTask = createTaskWithTagIDs(tasksManager, 'Home', ['home']);
		const untaggedTask = createTaskWithTagIDs(tasksManager, 'Untagged', []);

		const result = filterTasksByTags({ tasks: [workTask, homeTask, untaggedTask], selectedTagIDs: ['work'], isUntaggedSelected: true });

		expect(result).toEqual([workTask, untaggedTask]);
	});
});

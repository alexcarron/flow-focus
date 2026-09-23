import { describe, it, expect } from 'vitest';
import TasksManager from '../model/TasksManager';
import sortTagsByUsageCount from './sortTagsByUsageCount';

function createTaskWithTagIDs(tasksManager: TasksManager, description: string, tagIDs: string[]) {
	const task = tasksManager.addCreatedTask(description);
	for (const tagID of tagIDs) task.addTagID(tagID);
	return task;
}

describe('sortTagsByUsageCount', () => {
	it('orders tags from most-used to least-used', () => {
		const tasksManager = new TasksManager();
		createTaskWithTagIDs(tasksManager, 'Task 1', ['work']);
		createTaskWithTagIDs(tasksManager, 'Task 2', ['work', 'home']);
		createTaskWithTagIDs(tasksManager, 'Task 3', ['work', 'home']);
		const tags = [{ id: 'home', name: 'Home' }, { id: 'work', name: 'Work' }, { id: 'errand', name: 'Errand' }];

		const result = sortTagsByUsageCount({ tags, tasks: tasksManager.getTasksInPriorityOrder(new Date()) });

		expect(result.map(tag => tag.id)).toEqual(['work', 'home', 'errand']);
	});

	it('breaks ties between equally-used tags alphabetically by name', () => {
		const tasksManager = new TasksManager();
		createTaskWithTagIDs(tasksManager, 'Task 1', ['zebra']);
		createTaskWithTagIDs(tasksManager, 'Task 2', ['apple']);
		const tags = [{ id: 'zebra', name: 'Zebra' }, { id: 'apple', name: 'Apple' }];

		const result = sortTagsByUsageCount({ tags, tasks: tasksManager.getTasksInPriorityOrder(new Date()) });

		expect(result.map(tag => tag.id)).toEqual(['apple', 'zebra']);
	});

	it('treats tags used by no task as zero usage, sorted after used tags', () => {
		const tasksManager = new TasksManager();
		createTaskWithTagIDs(tasksManager, 'Task 1', ['work']);
		const tags = [{ id: 'unused', name: 'Unused' }, { id: 'work', name: 'Work' }];

		const result = sortTagsByUsageCount({ tags, tasks: tasksManager.getTasksInPriorityOrder(new Date()) });

		expect(result.map(tag => tag.id)).toEqual(['work', 'unused']);
	});
});

import { describe, it, expect, beforeEach } from 'vitest';
import TasksManager from '../TasksManager';
import getDetailDistinguishingTaskFromSameNamedTasks from './getDetailDistinguishingTaskFromSameNamedTasks';

let tasksManager: TasksManager;

beforeEach(() => {
	tasksManager = new TasksManager();
});

describe('getDetailDistinguishingTaskFromSameNamedTasks', () => {
	it('gives no detail when no other task has the same name', () => {
		const watchD3 = tasksManager.addCreatedTask('Watch D3');
		tasksManager.addCreatedTask('Watch D3 with friends');

		expect(getDetailDistinguishingTaskFromSameNamedTasks({ task: watchD3, tasks: tasksManager.getTasks() })).toBeNull();
	});

	it('uses the due date when it differs', () => {
		const watchD3 = tasksManager.addCreatedTask('Watch D3');
		watchD3.setDueDate(new Date(2030, 0, 4, 17, 0, 0, 0));
		tasksManager.addCreatedTask('watch  d3');

		const detail = getDetailDistinguishingTaskFromSameNamedTasks({ task: watchD3, tasks: tasksManager.getTasks() });
		expect(detail?.startsWith('Due ')).toBe(true);
	});

	it('says a task has no due date when only the other task has one', () => {
		const watchD3 = tasksManager.addCreatedTask('Watch D3');
		const otherWatchD3 = tasksManager.addCreatedTask('Watch D3');
		otherWatchD3.setDueDate(new Date(2030, 0, 4, 17, 0, 0, 0));

		expect(getDetailDistinguishingTaskFromSameNamedTasks({ task: watchD3, tasks: tasksManager.getTasks() })).toBe('No due date');
	});

	it('falls back to the shortest unique start of the id when every date is the same', () => {
		const watchD3 = tasksManager.addCreatedTask('Watch D3');
		const otherWatchD3 = tasksManager.addCreatedTask('Watch D3');
		Object.assign(otherWatchD3, { createdAt: watchD3.createdAt });

		const detail = getDetailDistinguishingTaskFromSameNamedTasks({ task: watchD3, tasks: tasksManager.getTasks() });
		const shownID = watchD3.id.slice(0, 8);
		expect(detail).toBe(`ID ${shownID}`);
	});
});

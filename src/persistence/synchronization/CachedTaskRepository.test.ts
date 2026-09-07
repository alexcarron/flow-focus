import { describe, it, expect, vi, afterEach } from 'vitest';
import Dexie from 'dexie';
import { CachedTaskRepository } from './CachedTaskRepository';
import { closeActiveUserCacheDatabase } from './perUserCache';
import { TaskWriteInput } from '../TaskRepository';

const USER_A_ID = 'user-a-uuid';
const USER_B_ID = 'user-b-uuid';

function makeTaskWriteInput(overrides: Partial<TaskWriteInput> = {}): TaskWriteInput {
	return {
		id: crypto.randomUUID(),
		description: 'Wash the dishes',
		steps: [],
		startTime: null,
		endTime: null,
		deadline: null,
		minRequiredTime: null,
		maxRequiredTime: null,
		repeatInterval: null,
		reccurenceStartTime: null,
		isMandatory: false,
		isComplete: false,
		isSkipped: false,
		lastActionedStep: null,
		...overrides,
	};
}

afterEach(async () => {
	closeActiveUserCacheDatabase();
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_A_ID}`);
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_B_ID}`);
});

describe('save and getAll', () => {
	it('stamps updatedAt, marks the row unsynced, and notifies the sync trigger', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTaskRepository(USER_A_ID, syncTrigger);
		const input = makeTaskWriteInput({ description: 'Buy groceries' });

		await repository.save(input);

		const rows = await repository.getAll();
		expect(rows).toHaveLength(1);
		expect(rows[0].description).toBe('Buy groceries');
		expect(typeof rows[0].updatedAt).toBe('string');
		expect(rows[0].isSynced).toBe(false);
		expect(syncTrigger.notifyLocalWrite).toHaveBeenCalledTimes(1);
	});

	it('does not reject when the sync trigger throws', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn(() => { throw new Error('offline'); }) };
		const repository = new CachedTaskRepository(USER_A_ID, syncTrigger);

		await expect(repository.save(makeTaskWriteInput())).resolves.not.toThrow();
	});

	it('excludes tasks that have been soft deleted', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTaskRepository(USER_A_ID, syncTrigger);
		const input = makeTaskWriteInput();
		await repository.save(input);

		await repository.softDelete(input.id);

		expect(await repository.getAll()).toEqual([]);
	});
});

describe('softDelete', () => {
	it('does nothing and does not notify when the task does not exist', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTaskRepository(USER_A_ID, syncTrigger);

		await expect(repository.softDelete('missing-id')).resolves.not.toThrow();
		expect(syncTrigger.notifyLocalWrite).not.toHaveBeenCalled();
	});
});

describe('per-user isolation', () => {
	it('writes different users to different databases', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repositoryA = new CachedTaskRepository(USER_A_ID, syncTrigger);
		await repositoryA.save(makeTaskWriteInput({ description: 'User A task' }));

		const repositoryB = new CachedTaskRepository(USER_B_ID, syncTrigger);
		expect(await repositoryB.getAll()).toEqual([]);
	});
});

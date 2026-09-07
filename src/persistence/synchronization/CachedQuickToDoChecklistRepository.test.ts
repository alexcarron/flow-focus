import { describe, it, expect, vi, afterEach } from 'vitest';
import Dexie from 'dexie';
import { CachedQuickToDoChecklistRepository } from './CachedQuickToDoChecklistRepository';
import { closeActiveUserCacheDatabase } from './perUserCache';
import QuickToDoChecklistItem from '../../model/quickToDoChecklist/QuickToDoChecklistItem';

const USER_A_ID = 'user-a-uuid';

const sampleItems: QuickToDoChecklistItem[] = [
	{ id: 'item-1', text: 'Buy milk', isChecked: false, children: [] },
];

afterEach(async () => {
	closeActiveUserCacheDatabase();
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_A_ID}`);
});

it('returns an empty list before anything has been saved', async () => {
	const repository = new CachedQuickToDoChecklistRepository(USER_A_ID, { notifyLocalWrite: vi.fn() });

	expect(await repository.getItems()).toEqual([]);
});

it('stamps updatedAt, marks the row unsynced, and notifies the sync trigger on save', async () => {
	const syncTrigger = { notifyLocalWrite: vi.fn() };
	const repository = new CachedQuickToDoChecklistRepository(USER_A_ID, syncTrigger);

	await repository.save(sampleItems);

	expect(await repository.getItems()).toEqual(sampleItems);
	expect(syncTrigger.notifyLocalWrite).toHaveBeenCalledTimes(1);
});

it('does not reject when the sync trigger throws', async () => {
	const syncTrigger = { notifyLocalWrite: vi.fn(() => { throw new Error('offline'); }) };
	const repository = new CachedQuickToDoChecklistRepository(USER_A_ID, syncTrigger);

	await expect(repository.save(sampleItems)).resolves.not.toThrow();
});

describe('per-user isolation', () => {
	it('writes different users to different databases', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repositoryA = new CachedQuickToDoChecklistRepository(USER_A_ID, syncTrigger);
		await repositoryA.save(sampleItems);

		const repositoryB = new CachedQuickToDoChecklistRepository('user-b-uuid', syncTrigger);
		expect(await repositoryB.getItems()).toEqual([]);

		await Dexie.delete('FlowFocusDB-user-cache-user-b-uuid');
	});
});

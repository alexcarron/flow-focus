import { describe, it, expect, vi, afterEach } from 'vitest';
import Dexie from 'dexie';
import { CachedSettingsRepository } from './CachedSettingsRepository';
import { closeActiveUserCacheDatabase } from './perUserCache';
import { DEFAULT_SETTINGS } from '../../model/AppSettings';

const USER_A_ID = 'user-a-uuid';

afterEach(async () => {
	closeActiveUserCacheDatabase();
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_A_ID}`);
});

it('returns undefined before anything has been saved', async () => {
	const repository = new CachedSettingsRepository(USER_A_ID, { notifyLocalWrite: vi.fn() });

	expect(await repository.get()).toBeUndefined();
});

it('stamps updatedAt, marks the row unsynced, and notifies the sync trigger on save', async () => {
	const syncTrigger = { notifyLocalWrite: vi.fn() };
	const repository = new CachedSettingsRepository(USER_A_ID, syncTrigger);

	await repository.save(DEFAULT_SETTINGS);

	const savedSettings = await repository.get();
	expect(savedSettings).toMatchObject(DEFAULT_SETTINGS);
	expect(syncTrigger.notifyLocalWrite).toHaveBeenCalledTimes(1);
});

it('does not reject when the sync trigger throws', async () => {
	const syncTrigger = { notifyLocalWrite: vi.fn(() => { throw new Error('offline'); }) };
	const repository = new CachedSettingsRepository(USER_A_ID, syncTrigger);

	await expect(repository.save(DEFAULT_SETTINGS)).resolves.not.toThrow();
});

describe('per-user isolation', () => {
	it('writes different users to different databases', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repositoryA = new CachedSettingsRepository(USER_A_ID, syncTrigger);
		await repositoryA.save(DEFAULT_SETTINGS);

		const repositoryB = new CachedSettingsRepository('user-b-uuid', syncTrigger);
		expect(await repositoryB.get()).toBeUndefined();

		await Dexie.delete('FlowFocusDB-user-cache-user-b-uuid');
	});
});

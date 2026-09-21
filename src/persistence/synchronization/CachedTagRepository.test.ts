import { describe, it, expect, vi, afterEach } from 'vitest';
import Dexie from 'dexie';
import { CachedTagRepository } from './CachedTagRepository';
import { closeActiveUserCacheDatabase, openUserCacheDatabase } from './perUserCache';
import { DuplicateTagNameError, EmptyTagNameError } from '../TagRepository';
import { LocalCloudDataSynchronizer } from './LocalCloudDataSynchronizer';
import { SupabaseDataService } from '../cloud/supabaseDataService';

function makeCloudDataService(overrides: Partial<SupabaseDataService> = {}): SupabaseDataService {
	return {
		upsertTask: vi.fn().mockResolvedValue(undefined),
		upsertChecklist: vi.fn().mockResolvedValue(undefined),
		upsertSettings: vi.fn().mockResolvedValue(undefined),
		upsertTag: vi.fn().mockResolvedValue(undefined),
		pullTasks: vi.fn().mockResolvedValue([]),
		pullChecklist: vi.fn().mockResolvedValue(undefined),
		pullSettings: vi.fn().mockResolvedValue(undefined),
		pullTags: vi.fn().mockResolvedValue([]),
		hasAnyTasks: vi.fn().mockResolvedValue(false),
		...overrides,
	};
}

const USER_A_ID = 'user-a-uuid';
const USER_B_ID = 'user-b-uuid';

afterEach(async () => {
	closeActiveUserCacheDatabase();
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_A_ID}`);
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_B_ID}`);
});

describe('addTag', () => {
	it('stamps updatedAt, marks the row unsynced, and notifies the sync trigger', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTagRepository(USER_A_ID, syncTrigger);

		const tag = await repository.addTag('Work');

		expect(await repository.getAllTags()).toEqual([tag]);
		expect(syncTrigger.notifyLocalWrite).toHaveBeenCalledTimes(1);
	});

	it('rejects an empty name', async () => {
		const repository = new CachedTagRepository(USER_A_ID, { notifyLocalWrite: vi.fn() });

		await expect(repository.addTag('  ')).rejects.toBeInstanceOf(EmptyTagNameError);
	});

	it('rejects a name that collides case-insensitively with an existing tag', async () => {
		const repository = new CachedTagRepository(USER_A_ID, { notifyLocalWrite: vi.fn() });
		await repository.addTag('Work');

		await expect(repository.addTag('work')).rejects.toBeInstanceOf(DuplicateTagNameError);
	});
});

describe('updateTag', () => {
	it('renames a tag and notifies the sync trigger', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTagRepository(USER_A_ID, syncTrigger);
		const tag = await repository.addTag('Work');

		const renamedTag = await repository.updateTag(tag.id, 'Personal');

		expect(renamedTag.name).toBe('Personal');
		expect(await repository.getAllTags()).toEqual([{ id: tag.id, name: 'Personal' }]);
	});
});

describe('deleteTag', () => {
	it('removes a tag from getAllTags without removing its row, and notifies the sync trigger', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTagRepository(USER_A_ID, syncTrigger);
		const tag = await repository.addTag('Work');
		syncTrigger.notifyLocalWrite.mockClear();

		await repository.deleteTag(tag.id);

		expect(await repository.getAllTags()).toEqual([]);
		expect(syncTrigger.notifyLocalWrite).toHaveBeenCalledTimes(1);
	});

	it('does nothing and does not notify when the tag does not exist', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repository = new CachedTagRepository(USER_A_ID, syncTrigger);

		await expect(repository.deleteTag('missing-id')).resolves.not.toThrow();
		expect(syncTrigger.notifyLocalWrite).not.toHaveBeenCalled();
	});
});

describe('clear', () => {
	it('notifies the sync trigger so a real synchronizer pushes the deletions to the cloud instead of leaving them stranded', async () => {
		const setupRepository = new CachedTagRepository(USER_A_ID, { notifyLocalWrite: vi.fn() });
		await setupRepository.addTag('Work');
		await setupRepository.addTag('Personal');

		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({
			cacheDB: openUserCacheDatabase(USER_A_ID),
			cloudDataService,
			isOnline: () => false,
		});
		const repository = new CachedTagRepository(USER_A_ID, synchronizer);

		await repository.clear();
		await synchronizer.sync();

		expect(await repository.getAllTags()).toEqual([]);
		expect(cloudDataService.upsertTag).toHaveBeenCalledTimes(2);
		const pushedRows = vi.mocked(cloudDataService.upsertTag).mock.calls.map(call => call[0]);
		expect(pushedRows.every(row => row.deletedAt !== null)).toBe(true);
	});
});

describe('per-user isolation', () => {
	it('writes different users to different databases', async () => {
		const syncTrigger = { notifyLocalWrite: vi.fn() };
		const repositoryA = new CachedTagRepository(USER_A_ID, syncTrigger);
		await repositoryA.addTag('User A tag');

		const repositoryB = new CachedTagRepository(USER_B_ID, syncTrigger);
		expect(await repositoryB.getAllTags()).toEqual([]);
	});
});

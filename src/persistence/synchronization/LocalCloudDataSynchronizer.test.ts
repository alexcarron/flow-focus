import { describe, it, expect, vi, afterEach } from 'vitest';
import { FlowFocusDB, PlainTaskRow, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID } from '../local/flowfocus.db';
import { SupabaseDataService } from '../cloud/supabaseDataService';
import { LocalCloudDataSynchronizer } from './LocalCloudDataSynchronizer';
import { DEFAULT_SETTINGS } from '../../model/AppSettings';

function makeTaskRow(overrides: Partial<PlainTaskRow> = {}): PlainTaskRow {
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
		updatedAt: new Date().toISOString(),
		deletedAt: null,
		isSynced: false,
		...overrides,
	};
}

function makeCloudDataService(overrides: Partial<SupabaseDataService> = {}): SupabaseDataService {
	return {
		upsertTask: vi.fn().mockResolvedValue(undefined),
		upsertChecklist: vi.fn().mockResolvedValue(undefined),
		upsertSettings: vi.fn().mockResolvedValue(undefined),
		pullTasks: vi.fn().mockResolvedValue([]),
		pullChecklist: vi.fn().mockResolvedValue(undefined),
		pullSettings: vi.fn().mockResolvedValue(undefined),
		hasAnyTasks: vi.fn().mockResolvedValue(false),
		...overrides,
	};
}

let openDatabases: FlowFocusDB[] = [];

async function openTestDatabase(): Promise<FlowFocusDB> {
	const database = new FlowFocusDB(`FlowFocusDB-sync-test-${crypto.randomUUID()}`);
	await database.open();
	openDatabases.push(database);
	return database;
}

function setVisibilityState(state: DocumentVisibilityState): void {
	Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

afterEach(async () => {
	for (const database of openDatabases) {
		database.close();
		await database.delete();
	}
	openDatabases = [];
	setVisibilityState('visible');
});

describe('push then pull ordering', () => {
	it('pushes pending changes before pulling remote changes', async () => {
		const cacheDB = await openTestDatabase();
		await cacheDB.tasks.put(makeTaskRow());

		const callOrder: string[] = [];
		const cloudDataService = makeCloudDataService({
			upsertTask: vi.fn().mockImplementation(async () => { callOrder.push('push'); }),
			pullTasks: vi.fn().mockImplementation(async () => { callOrder.push('pull'); return []; }),
		});

		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect(callOrder).toEqual(['push', 'pull']);
	});
});

describe('pushing not-yet-synced rows', () => {
	it('marks a task as synced after a successful push', async () => {
		const cacheDB = await openTestDatabase();
		const row = makeTaskRow();
		await cacheDB.tasks.put(row);

		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect(cloudDataService.upsertTask).toHaveBeenCalledTimes(1);
		expect((await cacheDB.tasks.get(row.id))?.isSynced).toBe(true);
	});

	it('leaves a row unsynced and reports the error when its push fails, without blocking another row', async () => {
		const cacheDB = await openTestDatabase();
		const failingRow = makeTaskRow({ description: 'fails to push' });
		const succeedingRow = makeTaskRow({ description: 'pushes fine' });
		await cacheDB.tasks.bulkPut([failingRow, succeedingRow]);

		const cloudDataService = makeCloudDataService({
			upsertTask: vi.fn().mockImplementation(async (row: PlainTaskRow) => {
				if (row.id === failingRow.id) throw new Error('network blip');
			}),
		});

		const statusUpdates: { isSyncing: boolean; lastSyncError: string | null }[] = [];
		const synchronizer = new LocalCloudDataSynchronizer({
			cacheDB,
			cloudDataService,
			onSyncStatusChange: status => statusUpdates.push(status),
		});
		await synchronizer.sync();

		expect((await cacheDB.tasks.get(failingRow.id))?.isSynced).toBe(false);
		expect((await cacheDB.tasks.get(succeedingRow.id))?.isSynced).toBe(true);
		expect(statusUpdates.at(-1)?.lastSyncError).toBe('network blip');
	});
});

describe('pulling and the high-water mark', () => {
	it('advances the watermark to the newest pulled updatedAt and uses it on the next pull', async () => {
		const cacheDB = await openTestDatabase();
		const olderRow = makeTaskRow({ updatedAt: '2026-01-01T00:00:00.000Z', isSynced: true });
		const newerRow = makeTaskRow({ updatedAt: '2026-01-02T00:00:00.000Z', isSynced: true });

		const pullTasks = vi.fn().mockResolvedValueOnce([olderRow, newerRow]).mockResolvedValueOnce([]);
		const cloudDataService = makeCloudDataService({ pullTasks });

		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect((await cacheDB.syncStatus.get(1))?.timeLastSyncedTasksAt).toBe('2026-01-02T00:00:00.000Z');

		await synchronizer.sync();
		expect(pullTasks).toHaveBeenNthCalledWith(2, '2026-01-02T00:00:00.000Z');
	});

	it('fully replaces a local row when the server version is newer', async () => {
		const cacheDB = await openTestDatabase();
		const localRow = makeTaskRow({ id: 'shared-id', description: 'old local edit', updatedAt: '2026-01-01T00:00:00.000Z', isSynced: true });
		await cacheDB.tasks.put(localRow);

		const serverRow = makeTaskRow({ id: 'shared-id', description: 'newer server edit', updatedAt: '2026-01-02T00:00:00.000Z', isSynced: true });
		const cloudDataService = makeCloudDataService({ pullTasks: vi.fn().mockResolvedValue([serverRow]) });

		const onTasksChanged = vi.fn();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService, onTasksChanged });
		await synchronizer.sync();

		expect(await cacheDB.tasks.get('shared-id')).toEqual(serverRow);
		expect(onTasksChanged).toHaveBeenCalledTimes(1);
	});

	it('keeps a local row that is newer and unsynced instead of the older server version', async () => {
		const cacheDB = await openTestDatabase();
		const localRow = makeTaskRow({ id: 'shared-id', description: 'newer local edit', updatedAt: '2026-01-02T00:00:00.000Z', isSynced: false });
		await cacheDB.tasks.put(localRow);

		const serverRow = makeTaskRow({ id: 'shared-id', description: 'older server value', updatedAt: '2026-01-01T00:00:00.000Z', isSynced: true });
		const cloudDataService = makeCloudDataService({
			pullTasks: vi.fn().mockResolvedValue([serverRow]),
			upsertTask: vi.fn().mockResolvedValue(undefined),
		});

		const onTasksChanged = vi.fn();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService, onTasksChanged });
		await synchronizer.sync();

		expect(await cacheDB.tasks.get('shared-id')).toEqual({ ...localRow, isSynced: true });
		expect(onTasksChanged).not.toHaveBeenCalled();
	});
});

describe('delete-versus-edit resolution', () => {
	it('lets a newer server delete win over an older local edit', async () => {
		const cacheDB = await openTestDatabase();
		const localEditedRow = makeTaskRow({ id: 'shared-id', deletedAt: null, updatedAt: '2026-01-01T00:00:00.000Z', isSynced: true });
		await cacheDB.tasks.put(localEditedRow);

		const serverDeletedRow = makeTaskRow({ id: 'shared-id', deletedAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', isSynced: true });
		const cloudDataService = makeCloudDataService({ pullTasks: vi.fn().mockResolvedValue([serverDeletedRow]) });

		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect((await cacheDB.tasks.get('shared-id'))?.deletedAt).toBe('2026-01-02T00:00:00.000Z');
	});

	it('lets a newer server edit restore a locally deleted row', async () => {
		const cacheDB = await openTestDatabase();
		const localDeletedRow = makeTaskRow({ id: 'shared-id', deletedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', isSynced: true });
		await cacheDB.tasks.put(localDeletedRow);

		const serverRestoredRow = makeTaskRow({ id: 'shared-id', deletedAt: null, updatedAt: '2026-01-02T00:00:00.000Z', isSynced: true });
		const cloudDataService = makeCloudDataService({ pullTasks: vi.fn().mockResolvedValue([serverRestoredRow]) });

		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect((await cacheDB.tasks.get('shared-id'))?.deletedAt).toBeNull();
	});
});

describe('recurring task advancement', () => {
	it('overwrites the local occurrence with the server-advanced occurrence and creates no duplicate row', async () => {
		const cacheDB = await openTestDatabase();
		const occurrenceN = makeTaskRow({ id: 'recurring-id', repeatInterval: 86400000, updatedAt: '2026-01-01T00:00:00.000Z', isSynced: true });
		await cacheDB.tasks.put(occurrenceN);

		const occurrenceNPlusOne = makeTaskRow({ id: 'recurring-id', repeatInterval: 86400000, updatedAt: '2026-01-02T00:00:00.000Z', isSynced: true });
		const cloudDataService = makeCloudDataService({ pullTasks: vi.fn().mockResolvedValue([occurrenceNPlusOne]) });

		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect(await cacheDB.tasks.count()).toBe(1);
		expect(await cacheDB.tasks.get('recurring-id')).toEqual(occurrenceNPlusOne);
	});
});

describe('settings and checklist singletons', () => {
	it('pushes not-yet-synced settings and marks them synced', async () => {
		const cacheDB = await openTestDatabase();
		await cacheDB.settings.put({ id: SETTINGS_ROW_ID, ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString(), isSynced: false });

		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect(cloudDataService.upsertSettings).toHaveBeenCalledTimes(1);
		expect((await cacheDB.settings.get(SETTINGS_ROW_ID))?.isSynced).toBe(true);
	});
});

describe('triggers', () => {
	it('runs one sync pass immediately on start', async () => {
		const cacheDB = await openTestDatabase();
		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });

		synchronizer.start();

		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1));
		synchronizer.stop();
	});

	it('runs a sync pass when the browser comes back online', async () => {
		const cacheDB = await openTestDatabase();
		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });

		synchronizer.start();
		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1));

		window.dispatchEvent(new Event('online'));
		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(2));

		synchronizer.stop();
	});

	it('runs a sync pass when the tab becomes visible, but not when it becomes hidden', async () => {
		const cacheDB = await openTestDatabase();
		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });

		synchronizer.start();
		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1));

		setVisibilityState('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1);

		setVisibilityState('visible');
		document.dispatchEvent(new Event('visibilitychange'));
		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(2));

		synchronizer.stop();
	});

	it('stops reacting to triggers after stop', async () => {
		const cacheDB = await openTestDatabase();
		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });

		synchronizer.start();
		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1));
		synchronizer.stop();

		window.dispatchEvent(new Event('online'));
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1);
	});
});

describe('notifyLocalWrite', () => {
	it('only triggers a sync pass while online', async () => {
		const cacheDB = await openTestDatabase();
		const cloudDataService = makeCloudDataService();

		const offlineSynchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService, isOnline: () => false });
		offlineSynchronizer.notifyLocalWrite();
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(cloudDataService.pullTasks).not.toHaveBeenCalled();

		const onlineSynchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService, isOnline: () => true });
		onlineSynchronizer.notifyLocalWrite();
		await vi.waitFor(() => expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(1));
	});
});

describe('concurrent sync passes', () => {
	it('runs a trailing pass for a sync() call that arrives while a pass is already running', async () => {
		const cacheDB = await openTestDatabase();
		const cloudDataService = makeCloudDataService();
		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });

		await Promise.all([synchronizer.sync(), synchronizer.sync()]);

		expect(cloudDataService.pullTasks).toHaveBeenCalledTimes(2);
	});

	it('clears hasUnsyncedChanges after a checklist write that lands mid-push, without a manual retrigger', async () => {
		const cacheDB = await openTestDatabase();
		const checklistRowA = { id: QUICK_TO_DO_CHECKLIST_ROW_ID, items: [], updatedAt: '2026-01-01T00:00:00.000Z', isSynced: false };
		await cacheDB.quickToDoChecklist.put(checklistRowA);

		const checklistRowB = { id: QUICK_TO_DO_CHECKLIST_ROW_ID, items: [], updatedAt: '2026-01-01T00:00:00.001Z', isSynced: false };

		const upsertChecklist = vi.fn().mockImplementationOnce(async () => {
			await cacheDB.quickToDoChecklist.put(checklistRowB);
			synchronizer.notifyLocalWrite();
		}).mockResolvedValue(undefined);
		const cloudDataService = makeCloudDataService({ upsertChecklist });

		const statusUpdates: { isSyncing: boolean; hasUnsyncedChanges: boolean }[] = [];
		const synchronizer = new LocalCloudDataSynchronizer({
			cacheDB,
			cloudDataService,
			onSyncStatusChange: status => statusUpdates.push(status),
		});

		await synchronizer.sync();

		expect(upsertChecklist).toHaveBeenCalledTimes(2);
		expect(upsertChecklist).toHaveBeenNthCalledWith(2, checklistRowB);
		expect((await cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID))?.isSynced).toBe(true);
		expect(statusUpdates.at(-1)?.hasUnsyncedChanges).toBe(false);
	});

	it('does not mark a checklist row synced if it changed again before the push finishes', async () => {
		const cacheDB = await openTestDatabase();
		const checklistRowAtPushTime = { id: QUICK_TO_DO_CHECKLIST_ROW_ID, items: [], updatedAt: '2026-01-01T00:00:00.000Z', isSynced: false };
		await cacheDB.quickToDoChecklist.put(checklistRowAtPushTime);

		const checklistRowWrittenDuringPush = { id: QUICK_TO_DO_CHECKLIST_ROW_ID, items: [], updatedAt: '2026-01-01T00:00:00.001Z', isSynced: false };

		const upsertChecklist = vi.fn().mockImplementation(async () => {
			await cacheDB.quickToDoChecklist.put(checklistRowWrittenDuringPush);
		});
		const cloudDataService = makeCloudDataService({ upsertChecklist });

		const synchronizer = new LocalCloudDataSynchronizer({ cacheDB, cloudDataService });
		await synchronizer.sync();

		expect((await cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID))?.isSynced).toBe(false);
	});
});

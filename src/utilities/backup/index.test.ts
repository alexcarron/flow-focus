import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { db } from '../../persistence/local/flowfocus.db';
import { DEFAULT_SETTINGS } from '../../model/AppSettings';
import { useTasksStore, tasksManager } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useQuickToDoChecklistStore } from '../../stores/quickToDoChecklistStore';
import { createBackup, readBackupFile, applyBackup, BackupData } from './index';
import { BACKUP_FORMAT } from './versions/backupV5';
import { BACKUP_FORMAT_V1 } from './versions/backupV1';
import { getActiveRepositories, setActiveRepositories } from '../../persistence/activeRepositories';
import { localTaskRepository } from '../../persistence/local/LocalTaskRepository';
import { localSettingsRepository } from '../../persistence/local/LocalSettingsRepository';
import { localQuickToDoChecklistRepository } from '../../persistence/local/LocalQuickToDoChecklistRepository';
import { CachedTaskRepository } from '../../persistence/synchronization/CachedTaskRepository';
import { CachedSettingsRepository } from '../../persistence/synchronization/CachedSettingsRepository';
import { CachedQuickToDoChecklistRepository } from '../../persistence/synchronization/CachedQuickToDoChecklistRepository';
import { closeActiveUserCacheDatabase, openUserCacheDatabase } from '../../persistence/synchronization/perUserCache';

const SIGNED_IN_USER_ID = 'signed-in-user-uuid';

beforeEach(async () => {
	await db.delete();
	await db.open();
	tasksManager.clearTasks();
	useTasksStore.setState({ tasks: [], isLoading: true, undoStack: [], redoStack: [] });
	useSettingsStore.setState({ ...DEFAULT_SETTINGS, isLoaded: false });
	useQuickToDoChecklistStore.setState({ items: [], isLoaded: false });
});

function signInAsCloudUser(): void {
	const syncTrigger = { notifyLocalWrite: () => {} };
	setActiveRepositories({
		taskRepository: new CachedTaskRepository(SIGNED_IN_USER_ID, syncTrigger),
		settingsRepository: new CachedSettingsRepository(SIGNED_IN_USER_ID, syncTrigger),
		quickToDoChecklistRepository: new CachedQuickToDoChecklistRepository(SIGNED_IN_USER_ID, syncTrigger),
	});
}

function signOutToLocalRepositories(): void {
	setActiveRepositories({
		taskRepository: localTaskRepository,
		settingsRepository: localSettingsRepository,
		quickToDoChecklistRepository: localQuickToDoChecklistRepository,
	});
}

afterEach(async () => {
	signOutToLocalRepositories();
	closeActiveUserCacheDatabase();
	await Dexie.delete(`FlowFocusDB-user-cache-${SIGNED_IN_USER_ID}`);
});

function makeBackupFile(data: unknown): File {
	return new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' });
}

describe('createBackup', () => {
	it('captures the current tasks, settings, and checklist', async () => {
		await useTasksStore.getState().addTask('Water the plants');
		await useSettingsStore.getState().loadSettings();
		await useSettingsStore.getState().setBedtime('01:00');
		useQuickToDoChecklistStore.getState().addTopLevelItem('Buy milk');

		const backup = createBackup();

		expect(backup.format).toBe(BACKUP_FORMAT);
		expect(backup.tasks).toHaveLength(1);
		expect(backup.tasks[0].description).toBe('Water the plants');
		expect(backup.settings.bedtime).toBe('01:00');
		expect(backup.quickToDoChecklist).toHaveLength(1);
		expect(backup.quickToDoChecklist[0].text).toBe('Buy milk');
	});
});

describe('readBackupFile', () => {
	it('reads a current-format backup file as is', async () => {
		const original = {
			format: BACKUP_FORMAT,
			exportedAt: new Date().toISOString(),
			settings: DEFAULT_SETTINGS,
			tasks: [],
			quickToDoChecklist: [],
		};

		const parsed = await readBackupFile(makeBackupFile(original));

		expect(parsed).toEqual(original);
	});

	it('migrates an old-format backup file forward to the current format', async () => {
		const oldBackup = {
			format: BACKUP_FORMAT_V1,
			exportedAt: new Date().toISOString(),
			settings: DEFAULT_SETTINGS,
			tasks: [
				{
					description: 'Water the plants',
					steps: {},
					startTime: null,
					endTime: null,
					deadline: null,
					minRequiredTime: null,
					maxRequiredTime: null,
					repeatInterval: null,
					isMandatory: false,
					isComplete: false,
					isSkipped: false,
					lastActionedStep: null,
				},
			],
		};

		const migrated = await readBackupFile(makeBackupFile(oldBackup));

		expect(migrated.format).toBe(BACKUP_FORMAT);
		expect(migrated.tasks).toHaveLength(1);
		expect(migrated.tasks[0].description).toBe('Water the plants');
		expect(migrated.quickToDoChecklist).toEqual([]);
	});

	it('rejects a file that is not a recognized backup', async () => {
		await expect(readBackupFile(makeBackupFile({ not: 'a backup' }))).rejects.toThrow();
	});
});

describe('applyBackup', () => {
	it('replaces existing data, and the restored data survives a reload', async () => {
		await useTasksStore.getState().addTask('Old task');

		const backupToRestore: BackupData = {
			format: BACKUP_FORMAT,
			exportedAt: new Date().toISOString(),
			settings: { ...DEFAULT_SETTINGS, bedtime: '02:00' },
			tasks: [
				{
					description: 'Restored task',
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
				},
			],
			quickToDoChecklist: [{ id: 'item-1', text: 'Restored item', isChecked: false, children: [] }],
		};

		await applyBackup(backupToRestore);

		tasksManager.clearTasks();
		await useTasksStore.getState().loadTasks();
		await useSettingsStore.getState().loadSettings();
		await useQuickToDoChecklistStore.getState().loadQuickToDoChecklist();

		const tasks = useTasksStore.getState().tasks;
		expect(tasks).toHaveLength(1);
		expect(tasks[0].getDescription()).toBe('Restored task');
		expect(useSettingsStore.getState().bedtime).toBe('02:00');
		expect(useQuickToDoChecklistStore.getState().items[0].text).toBe('Restored item');
	});
});

describe('backup and restore while signed in', () => {
	it('exports the signed-in account\'s data, not whatever is sitting in the local device database', async () => {
		await db.tasks.put({
			id: 'local-only-task',
			description: 'Local-only leftover task',
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
		});

		signInAsCloudUser();
		await useTasksStore.getState().loadTasks();
		await useTasksStore.getState().addTask('Account task');

		const backup = createBackup();

		expect(backup.tasks).toHaveLength(1);
		expect(backup.tasks[0].description).toBe('Account task');
	});

	it('replaces the account\'s cached tasks, checklist, and settings, marking the change to sync up', async () => {
		signInAsCloudUser();
		await useTasksStore.getState().loadTasks();
		await useSettingsStore.getState().loadSettings();
		await useQuickToDoChecklistStore.getState().loadQuickToDoChecklist();
		const oldTask = await useTasksStore.getState().addTask('Old account task');

		const backupToRestore: BackupData = {
			format: BACKUP_FORMAT,
			exportedAt: new Date().toISOString(),
			settings: { ...DEFAULT_SETTINGS, bedtime: '03:00' },
			tasks: [
				{
					description: 'Restored account task',
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
				},
			],
			quickToDoChecklist: [{ id: 'item-1', text: 'Restored account item', isChecked: false, children: [] }],
		};

		await applyBackup(backupToRestore);

		expect(getActiveRepositories().taskRepository).toBeInstanceOf(CachedTaskRepository);

		const tasks = useTasksStore.getState().tasks;
		expect(tasks).toHaveLength(1);
		expect(tasks[0].getDescription()).toBe('Restored account task');
		expect(useSettingsStore.getState().bedtime).toBe('03:00');
		expect(useQuickToDoChecklistStore.getState().items[0].text).toBe('Restored account item');

		const cacheDB = openUserCacheDatabase(SIGNED_IN_USER_ID);
		const oldTaskRow = await cacheDB.tasks.get(oldTask.id);
		expect(oldTaskRow?.deletedAt).not.toBeNull();
		expect(oldTaskRow?.isSynced).toBe(false);

		const restoredTaskRow = (await cacheDB.tasks.toArray()).find(row => row.description === 'Restored account task');
		expect(restoredTaskRow?.isSynced).toBe(false);
		expect((await cacheDB.settings.get(1))?.isSynced).toBe(false);
		expect((await cacheDB.quickToDoChecklist.get(1))?.isSynced).toBe(false);
	});
});

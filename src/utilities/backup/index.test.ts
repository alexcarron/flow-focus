import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../persistence/local/flowfocus.db';
import { DEFAULT_SETTINGS } from '../../model/AppSettings';
import { useTasksStore, tasksManager } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useQuickToDoChecklistStore } from '../../stores/quickToDoChecklistStore';
import { createBackup, readBackupFile, applyBackup, BackupData } from './index';
import { BACKUP_FORMAT } from './versions/backupV5';
import { BACKUP_FORMAT_V1 } from './versions/backupV1';

beforeEach(async () => {
	await db.delete();
	await db.open();
	tasksManager.clearTasks();
	useTasksStore.setState({ tasks: [], isLoading: true, undoStack: [], redoStack: [] });
	useSettingsStore.setState({ ...DEFAULT_SETTINGS, isLoaded: false });
	useQuickToDoChecklistStore.setState({ items: [], isLoaded: false });
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

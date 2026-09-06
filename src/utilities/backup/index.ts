import { useTasksStore } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useQuickToDoChecklistStore } from '../../stores/quickToDoChecklistStore';
import { isBackupDataV1 } from './versions/backupV1';
import { isBackupDataV2, migrateV1ToV2 } from './versions/backupV2';
import { isBackupDataV3, migrateV2ToV3 } from './versions/backupV3';
import { isBackupDataV4, migrateV3ToV4 } from './versions/backupV4';
import { BackupData, BackupTask, BackupStep, BACKUP_FORMAT, isBackupData, migrateV4ToV5, taskToBackupTask } from './versions/backupV5';

export type { BackupData, BackupTask, BackupStep };

function formatTimestamp(date: Date): string {
	return date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function createBackup(): BackupData {
	const { morningTime, nightTime, bedtime, wakeTime, shouldKeepTaskDetailsAfterCreating, shouldShowQuickAddTaskBarOnFocusPage } = useSettingsStore.getState();
	return {
		format: BACKUP_FORMAT,
		exportedAt: new Date().toISOString(),
		settings: { morningTime, nightTime, bedtime, wakeTime, shouldKeepTaskDetailsAfterCreating, shouldShowQuickAddTaskBarOnFocusPage },
		tasks: useTasksStore.getState().tasks.map(taskToBackupTask),
		quickToDoChecklist: useQuickToDoChecklistStore.getState().items,
	};
}

export function downloadBackup(data: BackupData, filenamePrefix: string): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${filenamePrefix}-${formatTimestamp(new Date())}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<BackupData> {
	const text = await file.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('File is not valid JSON.');
	}
	if (isBackupData(parsed)) {
		return parsed;
	}
	if (isBackupDataV4(parsed)) {
		return migrateV4ToV5(parsed);
	}
	if (isBackupDataV3(parsed)) {
		return migrateV4ToV5(migrateV3ToV4(parsed));
	}
	if (isBackupDataV2(parsed)) {
		return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(parsed)));
	}
	if (isBackupDataV1(parsed)) {
		return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed))));
	}
	throw new Error('File is not a valid FlowFocus backup.');
}

export async function applyBackup(data: BackupData): Promise<void> {
	await useSettingsStore.getState().importSettings(data.settings);
	await useTasksStore.getState().importTasks(data.tasks);
	await useQuickToDoChecklistStore.getState().importQuickToDoChecklist(data.quickToDoChecklist);
}

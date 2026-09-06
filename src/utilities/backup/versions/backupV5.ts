import Task from '../../../model/task/Task';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep } from './backupV2';
import { BackupTaskV4, isBackupTaskV4, BackupDataV4 } from './backupV4';

export const BACKUP_FORMAT = 'flow-focus-backup-v5';

export type { BackupStep };
export type BackupTask = BackupTaskV4;

export interface BackupData {
	format: typeof BACKUP_FORMAT;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTask[];
	quickToDoChecklist: QuickToDoChecklistItem[];
}

export function taskToBackupTask(task: Task): BackupTask {
	const state = task.getState();
	return {
		description: state.description,
		steps: state.steps.map(step => ({ id: step.id, text: step.text, status: step.status })),
		startTime: state.startTime ? state.startTime.toISOString() : null,
		endTime: state.endTime ? state.endTime.toISOString() : null,
		deadline: state.deadline ? state.deadline.toISOString() : null,
		minRequiredTime: state.minDuration,
		maxRequiredTime: state.maxDuration,
		repeatInterval: state.repeatInterval,
		reccurenceStartTime: state.reccurenceStartTime ? state.reccurenceStartTime.toISOString() : null,
		isMandatory: state.isMandatory,
		isComplete: state.isComplete,
		isSkipped: state.isSkipped,
		lastActionedStep: state.lastActionedStep,
	};
}

export function isBackupData(value: unknown): value is BackupData {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV4) &&
		Array.isArray(v.quickToDoChecklist) &&
		v.quickToDoChecklist.every(isBackupQuickToDoChecklistItem)
	);
}

export function migrateV4ToV5(data: BackupDataV4): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks,
		quickToDoChecklist: data.checklist,
	};
}

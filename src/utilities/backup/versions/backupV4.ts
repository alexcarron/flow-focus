import StepStatus from '../../../model/task/StepStatus';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep, isBackupStep } from './backupV2';
import { BackupDataV3 } from './backupV3';

export const BACKUP_FORMAT_V4 = 'flow-focus-backup-v4';

export interface BackupTaskV4 {
	description: string;
	steps: BackupStep[];
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	reccurenceStartTime: string | null;
	isMandatory: boolean;
	isComplete: boolean;
	isSkipped: boolean;
	lastActionedStep: { stepID: string; status: StepStatus } | null;
}

export interface BackupDataV4 {
	format: typeof BACKUP_FORMAT_V4;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTaskV4[];
	checklist: QuickToDoChecklistItem[];
}

export function isBackupTaskV4(value: unknown): value is BackupTaskV4 {
	if (typeof value !== 'object' || value === null) return false;
	const t = value as Record<string, unknown>;
	return (
		typeof t.description === 'string' &&
		Array.isArray(t.steps) && t.steps.every(isBackupStep) &&
		typeof t.isMandatory === 'boolean' &&
		typeof t.isComplete === 'boolean' &&
		typeof t.isSkipped === 'boolean' &&
		(t.reccurenceStartTime === null || typeof t.reccurenceStartTime === 'string')
	);
}

export function isBackupDataV4(value: unknown): value is BackupDataV4 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT_V4 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV4) &&
		Array.isArray(v.checklist) &&
		v.checklist.every(isBackupQuickToDoChecklistItem)
	);
}

export function migrateV3ToV4(data: BackupDataV3): BackupDataV4 {
	return {
		format: BACKUP_FORMAT_V4,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(task => ({
			...task,
			reccurenceStartTime: task.repeatInterval !== null ? task.startTime : null,
		})),
		checklist: data.checklist,
	};
}

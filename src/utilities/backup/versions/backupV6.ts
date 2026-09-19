import StepStatus from '../../../model/task/StepStatus';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep, isBackupStep } from './backupV2';
import { BackupDataV5 } from './backupV5';

export const BACKUP_FORMAT_V6 = 'flow-focus-backup-v6';

export type { BackupStep };

export interface BackupTaskV6 {
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
	skippedUntil: string | null;
	lastActionedStep: { stepID: string; status: StepStatus } | null;
}

export interface BackupDataV6 {
	format: typeof BACKUP_FORMAT_V6;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTaskV6[];
	quickToDoChecklist: QuickToDoChecklistItem[];
}

export function isBackupTaskV6(value: unknown): value is BackupTaskV6 {
	if (typeof value !== 'object' || value === null) return false;
	const t = value as Record<string, unknown>;
	return (
		typeof t.description === 'string' &&
		Array.isArray(t.steps) && t.steps.every(isBackupStep) &&
		typeof t.isMandatory === 'boolean' &&
		typeof t.isComplete === 'boolean' &&
		typeof t.isSkipped === 'boolean' &&
		(t.skippedUntil === null || typeof t.skippedUntil === 'string') &&
		(t.reccurenceStartTime === null || typeof t.reccurenceStartTime === 'string')
	);
}

export function isBackupDataV6(value: unknown): value is BackupDataV6 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT_V6 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV6) &&
		Array.isArray(v.quickToDoChecklist) &&
		v.quickToDoChecklist.every(isBackupQuickToDoChecklistItem)
	);
}

export function migrateV5ToV6(data: BackupDataV5): BackupDataV6 {
	return {
		format: BACKUP_FORMAT_V6,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(task => ({
			...task,
			skippedUntil: null,
		})),
		quickToDoChecklist: data.quickToDoChecklist,
	};
}

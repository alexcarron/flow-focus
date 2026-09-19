import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep } from './backupV2';
import { BackupTaskV4, isBackupTaskV4, BackupDataV4 } from './backupV4';

export const BACKUP_FORMAT_V5 = 'flow-focus-backup-v5';

export type { BackupStep };
export type BackupTaskV5 = BackupTaskV4;

export interface BackupDataV5 {
	format: typeof BACKUP_FORMAT_V5;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTaskV5[];
	quickToDoChecklist: QuickToDoChecklistItem[];
}

export function isBackupDataV5(value: unknown): value is BackupDataV5 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT_V5 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV4) &&
		Array.isArray(v.quickToDoChecklist) &&
		v.quickToDoChecklist.every(isBackupQuickToDoChecklistItem)
	);
}

export function migrateV4ToV5(data: BackupDataV4): BackupDataV5 {
	return {
		format: BACKUP_FORMAT_V5,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks,
		quickToDoChecklist: data.checklist,
	};
}

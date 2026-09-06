import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupDataV2, BackupTaskV2, isBackupTaskV2 } from './backupV2';

export const BACKUP_FORMAT_V3 = 'flow-focus-backup-v3';

export type BackupTaskV3 = BackupTaskV2;

export interface BackupDataV3 {
	format: typeof BACKUP_FORMAT_V3;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTaskV3[];
	checklist: QuickToDoChecklistItem[];
}

export function isBackupDataV3(value: unknown): value is BackupDataV3 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT_V3 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV2) &&
		Array.isArray(v.checklist) &&
		v.checklist.every(isBackupQuickToDoChecklistItem)
	);
}

export function migrateV2ToV3(data: BackupDataV2): BackupDataV3 {
	return {
		format: BACKUP_FORMAT_V3,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks,
		checklist: [],
	};
}

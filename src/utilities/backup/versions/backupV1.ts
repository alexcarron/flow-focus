import StepStatus from '../../../model/task/StepStatus';
import { AppSettings } from '../../../model/AppSettings';
import { isStepStatus } from '../sharedGuards';

export const BACKUP_FORMAT_V1 = 'flow-focus-backup-v1';

export interface BackupTaskV1 {
	description: string;
	steps: Record<string, StepStatus>;
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	isMandatory: boolean;
	isComplete: boolean;
	isSkipped: boolean;
	lastActionedStep: { step: string; status: StepStatus } | null;
}

export interface BackupDataV1 {
	format: typeof BACKUP_FORMAT_V1;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTaskV1[];
}

function isBackupTaskV1(value: unknown): value is BackupTaskV1 {
	if (typeof value !== 'object' || value === null) return false;
	const t = value as Record<string, unknown>;
	return (
		typeof t.description === 'string' &&
		typeof t.steps === 'object' && t.steps !== null &&
		Object.values(t.steps as Record<string, unknown>).every(isStepStatus) &&
		typeof t.isMandatory === 'boolean' &&
		typeof t.isComplete === 'boolean' &&
		typeof t.isSkipped === 'boolean'
	);
}

export function isBackupDataV1(value: unknown): value is BackupDataV1 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT_V1 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV1)
	);
}

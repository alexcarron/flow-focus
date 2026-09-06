import StepStatus from '../../../model/task/StepStatus';
import { AppSettings } from '../../../model/AppSettings';
import { isStepStatus } from '../sharedGuards';
import { BackupDataV1, BackupTaskV1 } from './backupV1';

export const BACKUP_FORMAT_V2 = 'flow-focus-backup-v2';

export interface BackupStep {
	id: string;
	text: string;
	status: StepStatus;
}

export interface BackupTaskV2 {
	description: string;
	steps: BackupStep[];
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	isMandatory: boolean;
	isComplete: boolean;
	isSkipped: boolean;
	lastActionedStep: { stepID: string; status: StepStatus } | null;
}

export interface BackupDataV2 {
	format: typeof BACKUP_FORMAT_V2;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTaskV2[];
}

export function isBackupStep(value: unknown): value is BackupStep {
	if (typeof value !== 'object' || value === null) return false;
	const s = value as Record<string, unknown>;
	return typeof s.id === 'string' && typeof s.text === 'string' && isStepStatus(s.status);
}

export function isBackupTaskV2(value: unknown): value is BackupTaskV2 {
	if (typeof value !== 'object' || value === null) return false;
	const t = value as Record<string, unknown>;
	return (
		typeof t.description === 'string' &&
		Array.isArray(t.steps) && t.steps.every(isBackupStep) &&
		typeof t.isMandatory === 'boolean' &&
		typeof t.isComplete === 'boolean' &&
		typeof t.isSkipped === 'boolean'
	);
}

export function isBackupDataV2(value: unknown): value is BackupDataV2 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT_V2 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTaskV2)
	);
}

function migrateBackupTaskV1ToV2(task: BackupTaskV1): BackupTaskV2 {
	const stepTextToNewID = new Map<string, string>();
	const steps = Object.entries(task.steps).map(([text, status]) => {
		const id = crypto.randomUUID();
		stepTextToNewID.set(text, id);
		return { id, text, status };
	});

	const legacyLastActionedStep = task.lastActionedStep;
	const lastActionedStepID = legacyLastActionedStep ? stepTextToNewID.get(legacyLastActionedStep.step) : undefined;

	return {
		description: task.description,
		steps,
		startTime: task.startTime,
		endTime: task.endTime,
		deadline: task.deadline,
		minRequiredTime: task.minRequiredTime,
		maxRequiredTime: task.maxRequiredTime,
		repeatInterval: task.repeatInterval,
		isMandatory: task.isMandatory,
		isComplete: task.isComplete,
		isSkipped: task.isSkipped,
		lastActionedStep: lastActionedStepID && legacyLastActionedStep
			? { stepID: lastActionedStepID, status: legacyLastActionedStep.status }
			: null,
	};
}

export function migrateV1ToV2(data: BackupDataV1): BackupDataV2 {
	return {
		format: BACKUP_FORMAT_V2,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(migrateBackupTaskV1ToV2),
	};
}

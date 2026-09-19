import Task from '../../../model/task/Task';
import StepStatus from '../../../model/task/StepStatus';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep, isBackupStep } from './backupV2';
import { BackupDataV5 } from './backupV5';

export const BACKUP_FORMAT = 'flow-focus-backup-v6';

export type { BackupStep };

export interface BackupTask {
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
		skippedUntil: state.skippedUntil ? state.skippedUntil.toISOString() : null,
		lastActionedStep: state.lastActionedStep,
	};
}

export function isBackupTask(value: unknown): value is BackupTask {
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

export function isBackupData(value: unknown): value is BackupData {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTask) &&
		Array.isArray(v.quickToDoChecklist) &&
		v.quickToDoChecklist.every(isBackupQuickToDoChecklistItem)
	);
}

export function migrateV5ToV6(data: BackupDataV5): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(task => ({
			...task,
			skippedUntil: null,
		})),
		quickToDoChecklist: data.quickToDoChecklist,
	};
}

import Task from '../../../model/task/Task';
import StepStatus from '../../../model/task/StepStatus';
import RecurrenceDuration, { isRecurrenceDuration } from '../../../model/task/recurrence/RecurrenceDuration';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { convertRepeatIntervalTaskRowToRecurrenceDuration } from '../../../persistence/local/convertRepeatIntervalTaskRowToRecurrenceDuration';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep, isBackupStep } from './backupV2';
import { BackupDataV6, BackupTaskV6 } from './backupV6';

export const BACKUP_FORMAT = 'flow-focus-backup-v7';

export type { BackupStep };

export interface BackupTask {
	description: string;
	steps: BackupStep[];
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	recurrenceDuration: RecurrenceDuration | null;
	shouldNotSkipMissedOccurrences: boolean;
	completedOccurrenceIndex: number | null;
	skippedOccurrenceIndex: number | null;
	progressOccurrenceIndex: number | null;
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
		recurrenceDuration: state.recurrenceDuration,
		shouldNotSkipMissedOccurrences: state.shouldNotSkipMissedOccurrences,
		completedOccurrenceIndex: state.completedOccurrenceIndex,
		skippedOccurrenceIndex: state.skippedOccurrenceIndex,
		progressOccurrenceIndex: state.progressOccurrenceIndex,
		isMandatory: state.isMandatory,
		isComplete: state.isComplete,
		isSkipped: state.isSkipped,
		skippedUntil: state.skippedUntil ? state.skippedUntil.toISOString() : null,
		lastActionedStep: state.lastActionedStep,
	};
}

function isNullableInteger(value: unknown): boolean {
	return value === null || (typeof value === 'number' && Number.isInteger(value));
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
		(t.recurrenceDuration === null || isRecurrenceDuration(t.recurrenceDuration)) &&
		typeof t.shouldNotSkipMissedOccurrences === 'boolean' &&
		isNullableInteger(t.completedOccurrenceIndex) &&
		isNullableInteger(t.skippedOccurrenceIndex) &&
		isNullableInteger(t.progressOccurrenceIndex)
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

function migrateTaskV6ToV7(task: BackupTaskV6, migrationTime: Date): BackupTask {
	const convertedTask = { ...task } as BackupTaskV6 & Record<string, unknown>;
	convertRepeatIntervalTaskRowToRecurrenceDuration(convertedTask, migrationTime);
	return convertedTask as unknown as BackupTask;
}

export function migrateV6ToV7(data: BackupDataV6): BackupData {
	const migrationTime = new Date();
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(task => migrateTaskV6ToV7(task, migrationTime)),
		quickToDoChecklist: data.quickToDoChecklist,
	};
}

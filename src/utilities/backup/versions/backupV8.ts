import Task from '../../../model/task/Task';
import Step from '../../../model/task/step/Step';
import StepStatus from '../../../model/task/step/StepStatus';
import RecurrenceDuration, { isRecurrenceDuration } from '../../../model/task/recurrence/RecurrenceDuration';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem, isStepStatus } from '../sharedGuards';
import { BackupData as BackupDataV7, BackupTask as BackupTaskV7, BackupStep as BackupStepV7 } from './backupV7';

export const BACKUP_FORMAT = 'flow-focus-backup-v8';

export interface BackupStep {
	id: string;
	text: string;
	status: StepStatus;
	children: BackupStep[];
}

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

function stepToBackupStep(step: Step): BackupStep {
	return { id: step.id, text: step.text, status: step.status, children: step.children.map(stepToBackupStep) };
}

export function taskToBackupTask(task: Task): BackupTask {
	const state = task.getState();
	return {
		description: state.description,
		steps: state.steps.map(stepToBackupStep),
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

export function isBackupStep(value: unknown): value is BackupStep {
	if (typeof value !== 'object' || value === null) return false;
	const step = value as Record<string, unknown>;
	return (
		typeof step.id === 'string' &&
		typeof step.text === 'string' &&
		isStepStatus(step.status) &&
		Array.isArray(step.children) &&
		step.children.every(isBackupStep)
	);
}

function isNullableInteger(value: unknown): boolean {
	return value === null || (typeof value === 'number' && Number.isInteger(value));
}

export function isBackupTask(value: unknown): value is BackupTask {
	if (typeof value !== 'object' || value === null) return false;
	const task = value as Record<string, unknown>;
	return (
		typeof task.description === 'string' &&
		Array.isArray(task.steps) && task.steps.every(isBackupStep) &&
		typeof task.isMandatory === 'boolean' &&
		typeof task.isComplete === 'boolean' &&
		typeof task.isSkipped === 'boolean' &&
		(task.skippedUntil === null || typeof task.skippedUntil === 'string') &&
		(task.recurrenceDuration === null || isRecurrenceDuration(task.recurrenceDuration)) &&
		typeof task.shouldNotSkipMissedOccurrences === 'boolean' &&
		isNullableInteger(task.completedOccurrenceIndex) &&
		isNullableInteger(task.skippedOccurrenceIndex) &&
		isNullableInteger(task.progressOccurrenceIndex)
	);
}

export function isBackupData(value: unknown): value is BackupData {
	if (typeof value !== 'object' || value === null) return false;
	const backup = value as Record<string, unknown>;
	return (
		backup.format === BACKUP_FORMAT &&
		typeof backup.exportedAt === 'string' &&
		typeof backup.settings === 'object' && backup.settings !== null &&
		Array.isArray(backup.tasks) &&
		backup.tasks.every(isBackupTask) &&
		Array.isArray(backup.quickToDoChecklist) &&
		backup.quickToDoChecklist.every(isBackupQuickToDoChecklistItem)
	);
}

function migrateStepV7ToV8(step: BackupStepV7): BackupStep {
	return { id: step.id, text: step.text, status: step.status, children: [] };
}

function migrateTaskV7ToV8(task: BackupTaskV7): BackupTask {
	return { ...task, steps: task.steps.map(migrateStepV7ToV8) };
}

export function migrateV7ToV8(data: BackupDataV7): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(migrateTaskV7ToV8),
		quickToDoChecklist: data.quickToDoChecklist,
	};
}

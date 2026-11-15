import Task from '../../../model/task/Task';
import Step from '../../../model/task/step/Step';
import { isRecurrenceDuration } from '../../../model/task/recurrence/RecurrenceDuration';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import Tag from '../../../model/tag/Tag';
import { AppSettings } from '../../../model/AppSettings';
import { convertMandatoryAndEndTimeToTargetAndDueDates } from '../../../persistence/local/convertMandatoryAndEndTimeToTargetAndDueDates';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupStep, isBackupStep } from './backupV8';
import { isBackupTag } from './backupV9';
import { BackupData as BackupDataV10, BackupTask as BackupTaskV10 } from './backupV10';

export const BACKUP_FORMAT = 'flow-focus-backup-v11';

export type { BackupStep };

export interface BackupTask extends Omit<BackupTaskV10, 'startTime' | 'endTime' | 'deadline' | 'isMandatory'> {
	startDate: string | null;
	targetDate: string | null;
	dueDate: string | null;
}

export interface BackupData {
	format: typeof BACKUP_FORMAT;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTask[];
	quickToDoChecklist: QuickToDoChecklistItem[];
	tags: Tag[];
}

function convertNullableDateToISOString(date: Date | null): string | null {
	if (date === null) return null;
	return date.toISOString();
}

export function taskToBackupTask(task: Task): BackupTask {
	const state = task.getState();
	return {
		description: state.description,
		steps: state.steps.map(stepToBackupStep),
		startDate: convertNullableDateToISOString(state.startDate),
		targetDate: convertNullableDateToISOString(state.targetDate),
		dueDate: convertNullableDateToISOString(state.dueDate),
		minRequiredTime: state.minDuration,
		maxRequiredTime: state.maxDuration,
		recurrenceDuration: state.recurrenceDuration,
		shouldNotSkipMissedOccurrences: state.shouldNotSkipMissedOccurrences,
		completedOccurrenceIndex: state.completedOccurrenceIndex,
		skippedOccurrenceIndex: state.skippedOccurrenceIndex,
		progressOccurrenceIndex: state.progressOccurrenceIndex,
		isComplete: state.isComplete,
		isSkipped: state.isSkipped,
		skippedUntil: convertNullableDateToISOString(state.skippedUntil),
		lastActionedStep: state.lastActionedStep,
		tagIDs: state.tagIDs,
		createdAt: task.createdAt.toISOString(),
	};
}

function stepToBackupStep(step: Step): BackupStep {
	return {
		id: step.id,
		text: step.text,
		status: step.status,
		children: step.children.map(stepToBackupStep),
	};
}

function isNullableInteger(value: unknown): boolean {
	return value === null || (typeof value === 'number' && Number.isInteger(value));
}

function isNullableDateString(value: unknown): boolean {
	return value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
}

export function isBackupTask(value: unknown): value is BackupTask {
	if (typeof value !== 'object' || value === null) return false;
	const task = value as Record<string, unknown>;
	return (
		typeof task.description === 'string' &&
		Array.isArray(task.steps) && task.steps.every(isBackupStep) &&
		isNullableDateString(task.startDate) &&
		isNullableDateString(task.targetDate) &&
		isNullableDateString(task.dueDate) &&
		typeof task.isComplete === 'boolean' &&
		typeof task.isSkipped === 'boolean' &&
		isNullableDateString(task.skippedUntil) &&
		(task.recurrenceDuration === null || isRecurrenceDuration(task.recurrenceDuration)) &&
		typeof task.shouldNotSkipMissedOccurrences === 'boolean' &&
		isNullableInteger(task.completedOccurrenceIndex) &&
		isNullableInteger(task.skippedOccurrenceIndex) &&
		isNullableInteger(task.progressOccurrenceIndex) &&
		Array.isArray(task.tagIDs) && task.tagIDs.every(tagID => typeof tagID === 'string') &&
		typeof task.createdAt === 'string' && !Number.isNaN(Date.parse(task.createdAt))
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
		backup.quickToDoChecklist.every(isBackupQuickToDoChecklistItem) &&
		Array.isArray(backup.tags) &&
		backup.tags.every(isBackupTag)
	);
}

function migrateTaskV10ToV11(task: BackupTaskV10): BackupTask {
	const { startTime, endTime, deadline, isMandatory, ...taskWithoutOldDates } = task;
	const convertedDates = convertMandatoryAndEndTimeToTargetAndDueDates({
		startTime,
		endTime,
		deadline,
		isMandatory,
	});
	return {
		...taskWithoutOldDates,
		...convertedDates,
	};
}

export function migrateV10ToV11(data: BackupDataV10): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(migrateTaskV10ToV11),
		quickToDoChecklist: data.quickToDoChecklist,
		tags: data.tags,
	};
}

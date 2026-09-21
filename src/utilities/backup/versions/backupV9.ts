import Task from '../../../model/task/Task';
import Step from '../../../model/task/step/Step';
import StepStatus from '../../../model/task/step/StepStatus';
import RecurrenceDuration, { isRecurrenceDuration } from '../../../model/task/recurrence/RecurrenceDuration';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import Tag from '../../../model/tag/Tag';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupData as BackupDataV8, BackupTask as BackupTaskV8, BackupStep, isBackupStep } from './backupV8';

export const BACKUP_FORMAT = 'flow-focus-backup-v9';

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
	tagIDs: string[];
}

export interface BackupData {
	format: typeof BACKUP_FORMAT;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTask[];
	quickToDoChecklist: QuickToDoChecklistItem[];
	tags: Tag[];
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
		tagIDs: state.tagIDs,
	};
}

function stepToBackupStep(step: Step): BackupStep {
	return { id: step.id, text: step.text, status: step.status, children: step.children.map(stepToBackupStep) };
}

function isNullableInteger(value: unknown): boolean {
	return value === null || (typeof value === 'number' && Number.isInteger(value));
}

export function isBackupTag(value: unknown): value is Tag {
	if (typeof value !== 'object' || value === null) return false;
	const tag = value as Record<string, unknown>;
	return typeof tag.id === 'string' && typeof tag.name === 'string';
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
		isNullableInteger(task.progressOccurrenceIndex) &&
		Array.isArray(task.tagIDs) && task.tagIDs.every(tagID => typeof tagID === 'string')
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

function migrateTaskV8ToV9(task: BackupTaskV8): BackupTask {
	return { ...task, tagIDs: [] };
}

export function migrateV8ToV9(data: BackupDataV8): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(migrateTaskV8ToV9),
		quickToDoChecklist: data.quickToDoChecklist,
		tags: [],
	};
}

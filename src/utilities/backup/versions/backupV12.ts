import Task from '../../../model/task/Task';
import Step from '../../../model/task/step/Step';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import Tag from '../../../model/tag/Tag';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { isBackupTag } from './backupV9';
import { BackupData as BackupDataV11, BackupTask as BackupTaskV11, BackupStep, isBackupTask as isBackupTaskV11 } from './backupV11';

export const BACKUP_FORMAT = 'flow-focus-backup-v12';

export type { BackupStep };

export interface BackupTask extends BackupTaskV11 {
	id: string;
	prerequisiteTaskIDs: string[];
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

function stepToBackupStep(step: Step): BackupStep {
	return {
		id: step.id,
		text: step.text,
		status: step.status,
		children: step.children.map(stepToBackupStep),
	};
}

export function taskToBackupTask(task: Task): BackupTask {
	const state = task.getState();
	return {
		id: task.id,
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
		prerequisiteTaskIDs: state.prerequisiteTaskIDs,
		createdAt: task.createdAt.toISOString(),
	};
}

export function isBackupTask(value: unknown): value is BackupTask {
	if (!isBackupTaskV11(value)) return false;
	const task = value as unknown as Record<string, unknown>;
	return (
		typeof task.id === 'string' &&
		Array.isArray(task.prerequisiteTaskIDs) &&
		task.prerequisiteTaskIDs.every(prerequisiteTaskID => typeof prerequisiteTaskID === 'string')
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

export function migrateV11ToV12(data: BackupDataV11): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(task => ({
			...task,
			id: crypto.randomUUID(),
			prerequisiteTaskIDs: [],
		})),
		quickToDoChecklist: data.quickToDoChecklist,
		tags: data.tags,
	};
}

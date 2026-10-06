import Task from '../../../model/task/Task';
import Step from '../../../model/task/step/Step';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import Tag from '../../../model/tag/Tag';
import { AppSettings } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { BackupData as BackupDataV9, BackupTask as BackupTaskV9, BackupStep, isBackupTag, isBackupTask as isBackupTaskV9 } from './backupV9';

export const BACKUP_FORMAT = 'flow-focus-backup-v10';

export type { BackupStep };

export interface BackupTask extends BackupTaskV9 {
	createdAt: string;
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
		createdAt: task.createdAt.toISOString(),
	};
}

function stepToBackupStep(step: Step): BackupStep {
	return { id: step.id, text: step.text, status: step.status, children: step.children.map(stepToBackupStep) };
}

export function isBackupTask(value: unknown): value is BackupTask {
	if (!isBackupTaskV9(value)) return false;
	const task = value as unknown as Record<string, unknown>;
	return typeof task.createdAt === 'string' && !Number.isNaN(Date.parse(task.createdAt));
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

export function migrateV9ToV10(data: BackupDataV9): BackupData {
	const bestGuessCreatedAtForTasksWithoutOne = data.exportedAt;
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: data.settings,
		tasks: data.tasks.map(task => ({ ...task, createdAt: bestGuessCreatedAtForTasksWithoutOne })),
		quickToDoChecklist: data.quickToDoChecklist,
		tags: data.tags,
	};
}

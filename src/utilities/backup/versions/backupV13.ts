import Task from '../../../model/task/Task';
import Step from '../../../model/task/step/Step';
import QuickToDoChecklistItem from '../../../model/quickToDoChecklist/QuickToDoChecklistItem';
import Tag from '../../../model/tag/Tag';
import { AppSettings, DEFAULT_SETTINGS } from '../../../model/AppSettings';
import { isBackupQuickToDoChecklistItem } from '../sharedGuards';
import { isBackupTag } from './backupV9';
import { BackupData as BackupDataV12, BackupSettings as BackupSettingsV12, BackupTask, BackupStep, isBackupTask } from './backupV12';

export const BACKUP_FORMAT = 'flow-focus-backup-v13';

export type { BackupTask, BackupStep };

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

function splitCelebrationSoundIntoTaskAndStepCompletionSounds(settings: BackupSettingsV12): AppSettings {
	const { shouldPlayCelebrationSound, ...settingsWithoutCelebrationSound } = settings;
	const shouldPlaySounds = shouldPlayCelebrationSound ?? DEFAULT_SETTINGS.shouldPlayTaskCompletionSound;
	return {
		...DEFAULT_SETTINGS,
		...settingsWithoutCelebrationSound,
		shouldPlayTaskCompletionSound: shouldPlaySounds,
		shouldPlayStepCompletionSound: shouldPlaySounds,
	};
}

export function migrateV12ToV13(data: BackupDataV12): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: data.exportedAt,
		settings: splitCelebrationSoundIntoTaskAndStepCompletionSounds(data.settings),
		tasks: data.tasks,
		quickToDoChecklist: data.quickToDoChecklist,
		tags: data.tags,
	};
}

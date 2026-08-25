import Task from '../model/task/Task';
import StepStatus from '../model/task/StepStatus';
import { AppSettings } from '../model/AppSettings';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';

export const BACKUP_FORMAT = 'flow-focus-backup-v1';

export interface BackupTask {
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

export interface BackupData {
	format: typeof BACKUP_FORMAT;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTask[];
}

function taskToBackupTask(task: Task): BackupTask {
	const state = task.getState();
	return {
		description: state.description,
		steps: Object.fromEntries(state.stepsToStatusMap) as Record<string, StepStatus>,
		startTime: state.startTime ? state.startTime.toISOString() : null,
		endTime: state.endTime ? state.endTime.toISOString() : null,
		deadline: state.deadline ? state.deadline.toISOString() : null,
		minRequiredTime: state.minDuration,
		maxRequiredTime: state.maxDuration,
		repeatInterval: state.repeatInterval,
		isMandatory: state.isMandatory,
		isComplete: state.isComplete,
		isSkipped: state.isSkipped,
		lastActionedStep: state.lastActionedStep,
	};
}

export function createBackup(): BackupData {
	const { morningTime, nightTime, bedtime, wakeTime, shouldKeepTaskDetailsAfterCreating } = useSettingsStore.getState();
	return {
		format: BACKUP_FORMAT,
		exportedAt: new Date().toISOString(),
		settings: { morningTime, nightTime, bedtime, wakeTime, shouldKeepTaskDetailsAfterCreating },
		tasks: useTasksStore.getState().tasks.map(taskToBackupTask),
	};
}

function isStepStatus(value: unknown): value is StepStatus {
	return typeof value === 'string' && (Object.values(StepStatus) as string[]).includes(value);
}

function isBackupTask(value: unknown): value is BackupTask {
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

export function isBackupData(value: unknown): value is BackupData {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === BACKUP_FORMAT &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isBackupTask)
	);
}

function formatTimestamp(date: Date): string {
	return date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function downloadBackup(data: BackupData, filenamePrefix: string): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${filenamePrefix}-${formatTimestamp(new Date())}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<BackupData> {
	const text = await file.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('File is not valid JSON.');
	}
	if (!isBackupData(parsed)) {
		throw new Error('File is not a valid FlowFocus backup.');
	}
	return parsed;
}

export async function applyBackup(data: BackupData): Promise<void> {
	await useSettingsStore.getState().importSettings(data.settings);
	await useTasksStore.getState().importTasks(data.tasks);
}

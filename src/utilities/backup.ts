import Task from '../model/task/Task';
import StepStatus from '../model/task/StepStatus';
import { AppSettings } from '../model/AppSettings';
import ChecklistItem from '../model/checklist/ChecklistItem';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useChecklistStore } from '../stores/checklistStore';

export const BACKUP_FORMAT = 'flow-focus-backup-v4';
const LEGACY_BACKUP_FORMAT_V1 = 'flow-focus-backup-v1';
const LEGACY_BACKUP_FORMAT_V2 = 'flow-focus-backup-v2';
const LEGACY_BACKUP_FORMAT_V3 = 'flow-focus-backup-v3';

export interface BackupStep {
	id: string;
	text: string;
	status: StepStatus;
}

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
	lastActionedStep: { stepID: string; status: StepStatus } | null;
}

export interface BackupData {
	format: typeof BACKUP_FORMAT;
	exportedAt: string;
	settings: AppSettings;
	tasks: BackupTask[];
	checklist: ChecklistItem[];
}

interface LegacyBackupTaskV1 {
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

interface LegacyBackupDataV1 {
	format: typeof LEGACY_BACKUP_FORMAT_V1;
	exportedAt: string;
	settings: AppSettings;
	tasks: LegacyBackupTaskV1[];
}

function taskToBackupTask(task: Task): BackupTask {
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
		lastActionedStep: state.lastActionedStep,
	};
}

export function createBackup(): BackupData {
	const { morningTime, nightTime, bedtime, wakeTime, shouldKeepTaskDetailsAfterCreating, shouldShowQuickAddTaskBarOnFocusPage } = useSettingsStore.getState();
	return {
		format: BACKUP_FORMAT,
		exportedAt: new Date().toISOString(),
		settings: { morningTime, nightTime, bedtime, wakeTime, shouldKeepTaskDetailsAfterCreating, shouldShowQuickAddTaskBarOnFocusPage },
		tasks: useTasksStore.getState().tasks.map(taskToBackupTask),
		checklist: useChecklistStore.getState().items,
	};
}

function isStepStatus(value: unknown): value is StepStatus {
	return typeof value === 'string' && (Object.values(StepStatus) as string[]).includes(value);
}

function isBackupStep(value: unknown): value is BackupStep {
	if (typeof value !== 'object' || value === null) return false;
	const s = value as Record<string, unknown>;
	return typeof s.id === 'string' && typeof s.text === 'string' && isStepStatus(s.status);
}

function isBackupTask(value: unknown): value is BackupTask {
	if (typeof value !== 'object' || value === null) return false;
	const t = value as Record<string, unknown>;
	return (
		typeof t.description === 'string' &&
		Array.isArray(t.steps) && t.steps.every(isBackupStep) &&
		typeof t.isMandatory === 'boolean' &&
		typeof t.isComplete === 'boolean' &&
		typeof t.isSkipped === 'boolean' &&
		(t.reccurenceStartTime === null || typeof t.reccurenceStartTime === 'string')
	);
}

function isBackupChecklistItem(value: unknown): value is ChecklistItem {
	if (typeof value !== 'object' || value === null) return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item.id === 'string' &&
		typeof item.text === 'string' &&
		typeof item.isChecked === 'boolean' &&
		Array.isArray(item.children) && item.children.every(isBackupChecklistItem)
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
		Array.isArray(v.checklist) &&
		v.checklist.every(isBackupChecklistItem)
	);
}

function isLegacyBackupTaskV1(value: unknown): value is LegacyBackupTaskV1 {
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

function isLegacyBackupDataV1(value: unknown): value is LegacyBackupDataV1 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === LEGACY_BACKUP_FORMAT_V1 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isLegacyBackupTaskV1)
	);
}

function migrateLegacyBackupTaskV1(legacyTask: LegacyBackupTaskV1): BackupTask {
	const stepTextToNewID = new Map<string, string>();
	const steps = Object.entries(legacyTask.steps).map(([text, status]) => {
		const id = crypto.randomUUID();
		stepTextToNewID.set(text, id);
		return { id, text, status };
	});

	const legacyLastActionedStep = legacyTask.lastActionedStep;
	const lastActionedStepID = legacyLastActionedStep ? stepTextToNewID.get(legacyLastActionedStep.step) : undefined;

	return {
		description: legacyTask.description,
		steps,
		startTime: legacyTask.startTime,
		endTime: legacyTask.endTime,
		deadline: legacyTask.deadline,
		minRequiredTime: legacyTask.minRequiredTime,
		maxRequiredTime: legacyTask.maxRequiredTime,
		repeatInterval: legacyTask.repeatInterval,
		reccurenceStartTime: legacyTask.repeatInterval !== null ? legacyTask.startTime : null,
		isMandatory: legacyTask.isMandatory,
		isComplete: legacyTask.isComplete,
		isSkipped: legacyTask.isSkipped,
		lastActionedStep: lastActionedStepID && legacyLastActionedStep
			? { stepID: lastActionedStepID, status: legacyLastActionedStep.status }
			: null,
	};
}

function migrateLegacyBackupDataV1(legacyData: LegacyBackupDataV1): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: legacyData.exportedAt,
		settings: legacyData.settings,
		tasks: legacyData.tasks.map(migrateLegacyBackupTaskV1),
		checklist: [],
	};
}

type LegacyBackupTaskV2 = Omit<BackupTask, 'reccurenceStartTime'>;

interface LegacyBackupDataV2 {
	format: typeof LEGACY_BACKUP_FORMAT_V2;
	exportedAt: string;
	settings: AppSettings;
	tasks: LegacyBackupTaskV2[];
}

function isLegacyBackupTaskV2(value: unknown): value is LegacyBackupTaskV2 {
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

function isLegacyBackupDataV2(value: unknown): value is LegacyBackupDataV2 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === LEGACY_BACKUP_FORMAT_V2 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isLegacyBackupTaskV2)
	);
}

function migrateLegacyBackupDataV2(legacyData: LegacyBackupDataV2): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: legacyData.exportedAt,
		settings: legacyData.settings,
		tasks: legacyData.tasks.map(legacyTask => ({
			...legacyTask,
			reccurenceStartTime: legacyTask.repeatInterval !== null ? legacyTask.startTime : null,
		})),
		checklist: [],
	};
}

type LegacyBackupTaskV3 = LegacyBackupTaskV2;

interface LegacyBackupDataV3 {
	format: typeof LEGACY_BACKUP_FORMAT_V3;
	exportedAt: string;
	settings: AppSettings;
	tasks: LegacyBackupTaskV3[];
	checklist: ChecklistItem[];
}

function isLegacyBackupDataV3(value: unknown): value is LegacyBackupDataV3 {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		v.format === LEGACY_BACKUP_FORMAT_V3 &&
		typeof v.exportedAt === 'string' &&
		typeof v.settings === 'object' && v.settings !== null &&
		Array.isArray(v.tasks) &&
		v.tasks.every(isLegacyBackupTaskV2) &&
		Array.isArray(v.checklist) &&
		v.checklist.every(isBackupChecklistItem)
	);
}

function migrateLegacyBackupDataV3(legacyData: LegacyBackupDataV3): BackupData {
	return {
		format: BACKUP_FORMAT,
		exportedAt: legacyData.exportedAt,
		settings: legacyData.settings,
		tasks: legacyData.tasks.map(legacyTask => ({
			...legacyTask,
			reccurenceStartTime: legacyTask.repeatInterval !== null ? legacyTask.startTime : null,
		})),
		checklist: legacyData.checklist,
	};
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
	if (isBackupData(parsed)) {
		return parsed;
	}
	if (isLegacyBackupDataV3(parsed)) {
		return migrateLegacyBackupDataV3(parsed);
	}
	if (isLegacyBackupDataV2(parsed)) {
		return migrateLegacyBackupDataV2(parsed);
	}
	if (isLegacyBackupDataV1(parsed)) {
		return migrateLegacyBackupDataV1(parsed);
	}
	throw new Error('File is not a valid FlowFocus backup.');
}

export async function applyBackup(data: BackupData): Promise<void> {
	await useSettingsStore.getState().importSettings(data.settings);
	await useTasksStore.getState().importTasks(data.tasks);
	await useChecklistStore.getState().importChecklist(data.checklist);
}

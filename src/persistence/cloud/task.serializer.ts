import Task from '../../model/task/Task';
import Step from '../../model/task/step/Step';
import StepStatus from '../../model/task/step/StepStatus';
import { TaskWriteInput } from '../TaskRepository';
import { PlainStepRow, PlainTaskRow } from '../local/flowfocus.db';
import RecurrenceDuration from '../../model/task/recurrence/RecurrenceDuration';
import RecurrenceUnit, { isRecurrenceUnit } from '../../model/task/recurrence/RecurrenceUnit';
import { fromCloudTimestamp, fromNullableCloudTimestamp, toCloudTimestamp, toNullableCloudTimestamp } from './cloudTimestamp';

function stepToStepRow(step: Step): PlainStepRow {
	return { id: step.id, text: step.text, status: step.status, children: step.children.map(stepToStepRow) };
}

function stepRowToStep(row: PlainStepRow): Step {
	return { id: row.id, text: row.text, status: row.status as StepStatus, children: (row.children ?? []).map(stepRowToStep) };
}

export function serializeTask(task: Task): TaskWriteInput {
	const state = task.getState();
	return {
		id: task.id,
		description: state.description,
		steps: state.steps.map(stepToStepRow),
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

export function deserializeRow(row: PlainTaskRow): {
	description: string;
	steps: Step[];
	startTime: Date | null;
	endTime: Date | null;
	deadline: Date | null;
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
	skippedUntil: Date | null;
	lastActionedStep: { stepID: string; status: StepStatus } | null;
	tagIDs: string[];
} {
	return {
		description: row.description,
		steps: row.steps.map(stepRowToStep),
		startTime: row.startTime ? new Date(row.startTime) : null,
		endTime: row.endTime ? new Date(row.endTime) : null,
		deadline: row.deadline ? new Date(row.deadline) : null,
		minRequiredTime: row.minRequiredTime,
		maxRequiredTime: row.maxRequiredTime,
		recurrenceDuration: row.recurrenceDuration,
		shouldNotSkipMissedOccurrences: row.shouldNotSkipMissedOccurrences,
		completedOccurrenceIndex: row.completedOccurrenceIndex,
		skippedOccurrenceIndex: row.skippedOccurrenceIndex,
		progressOccurrenceIndex: row.progressOccurrenceIndex,
		isMandatory: row.isMandatory,
		isComplete: row.isComplete,
		isSkipped: row.isSkipped,
		skippedUntil: row.skippedUntil ? new Date(row.skippedUntil) : null,
		lastActionedStep: row.lastActionedStep
			? { stepID: row.lastActionedStep.stepID, status: row.lastActionedStep.status as StepStatus }
			: null,
		tagIDs: row.tagIDs,
	};
}

export interface CloudTaskRow {
	id: string;
	user_id: string;
	description: string;
	steps: PlainStepRow[];
	start_time: string | null;
	end_time: string | null;
	deadline: string | null;
	min_required_time: number | null;
	max_required_time: number | null;
	recurrence_duration_amount: number | null;
	recurrence_duration_unit: string | null;
	should_not_skip_missed_occurrences: boolean;
	completed_occurrence_index: number | null;
	skipped_occurrence_index: number | null;
	progress_occurrence_index: number | null;
	is_mandatory: boolean;
	is_complete: boolean;
	is_skipped: boolean;
	skipped_until: string | null;
	last_actioned_step: { stepID: string; status: string } | null;
	updated_at: string;
	deleted_at: string | null;
}

function normalizeNullableTimestamp(value: string | null): string | null {
	return toNullableCloudTimestamp(fromNullableCloudTimestamp(value));
}

function normalizeTimestamp(value: string): string {
	return toCloudTimestamp(fromCloudTimestamp(value));
}

function cloudRecurrenceDurationColumnsToRecurrenceDuration(amount: number | null, unit: string | null): RecurrenceDuration | null {
	if (amount === null || !isRecurrenceUnit(unit)) return null;
	return { amount, unit: unit as RecurrenceUnit };
}

export function taskRowToCloudRow(row: PlainTaskRow, userID: string): CloudTaskRow {
	return {
		id: row.id,
		user_id: userID,
		description: row.description,
		steps: row.steps,
		start_time: normalizeNullableTimestamp(row.startTime),
		end_time: normalizeNullableTimestamp(row.endTime),
		deadline: normalizeNullableTimestamp(row.deadline),
		min_required_time: row.minRequiredTime,
		max_required_time: row.maxRequiredTime,
		recurrence_duration_amount: row.recurrenceDuration?.amount ?? null,
		recurrence_duration_unit: row.recurrenceDuration?.unit ?? null,
		should_not_skip_missed_occurrences: row.shouldNotSkipMissedOccurrences,
		completed_occurrence_index: row.completedOccurrenceIndex,
		skipped_occurrence_index: row.skippedOccurrenceIndex,
		progress_occurrence_index: row.progressOccurrenceIndex,
		is_mandatory: row.isMandatory,
		is_complete: row.isComplete,
		is_skipped: row.isSkipped,
		skipped_until: normalizeNullableTimestamp(row.skippedUntil),
		last_actioned_step: row.lastActionedStep,
		updated_at: normalizeTimestamp(row.updatedAt),
		deleted_at: normalizeNullableTimestamp(row.deletedAt),
	};
}

export function cloudRowToTaskRow(row: CloudTaskRow): PlainTaskRow {
	return {
		id: row.id,
		description: row.description,
		steps: row.steps,
		startTime: normalizeNullableTimestamp(row.start_time),
		endTime: normalizeNullableTimestamp(row.end_time),
		deadline: normalizeNullableTimestamp(row.deadline),
		minRequiredTime: row.min_required_time,
		maxRequiredTime: row.max_required_time,
		recurrenceDuration: cloudRecurrenceDurationColumnsToRecurrenceDuration(row.recurrence_duration_amount, row.recurrence_duration_unit),
		shouldNotSkipMissedOccurrences: row.should_not_skip_missed_occurrences,
		completedOccurrenceIndex: row.completed_occurrence_index,
		skippedOccurrenceIndex: row.skipped_occurrence_index,
		progressOccurrenceIndex: row.progress_occurrence_index,
		isMandatory: row.is_mandatory,
		isComplete: row.is_complete,
		isSkipped: row.is_skipped,
		skippedUntil: normalizeNullableTimestamp(row.skipped_until),
		lastActionedStep: row.last_actioned_step,
		tagIDs: [],
		updatedAt: normalizeTimestamp(row.updated_at),
		deletedAt: normalizeNullableTimestamp(row.deleted_at),
		isSynced: true,
	};
}

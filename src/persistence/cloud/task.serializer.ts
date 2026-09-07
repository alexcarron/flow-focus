import Task from '../../model/task/Task';
import Step from '../../model/task/Step';
import StepStatus from '../../model/task/StepStatus';
import { TaskWriteInput } from '../TaskRepository';
import { PlainStepRow, PlainTaskRow } from '../local/flowfocus.db';
import { fromCloudTimestamp, fromNullableCloudTimestamp, toCloudTimestamp, toNullableCloudTimestamp } from './cloudTimestamp';

export function serializeTask(task: Task): TaskWriteInput {
	const state = task.getState();
	return {
		id: task.id,
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

export function deserializeRow(row: PlainTaskRow): {
	description: string;
	steps: Step[];
	startTime: Date | null;
	endTime: Date | null;
	deadline: Date | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	reccurenceStartTime: Date | null;
	isMandatory: boolean;
	isComplete: boolean;
	isSkipped: boolean;
	lastActionedStep: { stepID: string; status: StepStatus } | null;
} {
	return {
		description: row.description,
		steps: row.steps.map(step => ({ id: step.id, text: step.text, status: step.status as StepStatus })),
		startTime: row.startTime ? new Date(row.startTime) : null,
		endTime: row.endTime ? new Date(row.endTime) : null,
		deadline: row.deadline ? new Date(row.deadline) : null,
		minRequiredTime: row.minRequiredTime,
		maxRequiredTime: row.maxRequiredTime,
		repeatInterval: row.repeatInterval,
		reccurenceStartTime: row.reccurenceStartTime ? new Date(row.reccurenceStartTime) : null,
		isMandatory: row.isMandatory,
		isComplete: row.isComplete,
		isSkipped: row.isSkipped,
		lastActionedStep: row.lastActionedStep
			? { stepID: row.lastActionedStep.stepID, status: row.lastActionedStep.status as StepStatus }
			: null,
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
	repeat_interval: number | null;
	recurrence_start_time: string | null;
	is_mandatory: boolean;
	is_complete: boolean;
	is_skipped: boolean;
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
		repeat_interval: row.repeatInterval,
		recurrence_start_time: normalizeNullableTimestamp(row.reccurenceStartTime),
		is_mandatory: row.isMandatory,
		is_complete: row.isComplete,
		is_skipped: row.isSkipped,
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
		repeatInterval: row.repeat_interval,
		reccurenceStartTime: normalizeNullableTimestamp(row.recurrence_start_time),
		isMandatory: row.is_mandatory,
		isComplete: row.is_complete,
		isSkipped: row.is_skipped,
		lastActionedStep: row.last_actioned_step,
		updatedAt: normalizeTimestamp(row.updated_at),
		deletedAt: normalizeNullableTimestamp(row.deleted_at),
		isSynced: true,
	};
}

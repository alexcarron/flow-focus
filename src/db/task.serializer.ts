import Task from '../model/task/Task';
import Step from '../model/task/Step';
import StepStatus from '../model/task/StepStatus';
import { PlainTaskRow } from './flowfocus.db';

export function serializeTask(task: Task, existingId?: number): PlainTaskRow {
	const state = task.getState();
	return {
		...(existingId !== undefined ? { id: existingId } : {}),
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

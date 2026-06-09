import Task from '../model/task/Task';
import StepStatus from '../model/task/StepStatus';
import { PlainTaskRow } from './flowfocus.db';

export function serializeTask(task: Task, existingId?: number): PlainTaskRow {
  const state = task.getState();
  return {
    ...(existingId !== undefined ? { id: existingId } : {}),
    description: state.description,
    stepsToStatusMap: Array.from(state.stepsToStatusMap.entries()) as Array<[string, string]>,
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

export function deserializeRow(row: PlainTaskRow): {
  description: string;
  stepsToStatusMap: Map<string, StepStatus>;
  startTime: Date | null;
  endTime: Date | null;
  deadline: Date | null;
  minRequiredTime: number | null;
  maxRequiredTime: number | null;
  repeatInterval: number | null;
  isMandatory: boolean;
  isComplete: boolean;
  isSkipped: boolean;
  lastActionedStep: { step: string; status: StepStatus } | null;
} {
  return {
    description: row.description,
    stepsToStatusMap: new Map(
      row.stepsToStatusMap.map(([k, v]) => [k, v as StepStatus])
    ),
    startTime: row.startTime ? new Date(row.startTime) : null,
    endTime: row.endTime ? new Date(row.endTime) : null,
    deadline: row.deadline ? new Date(row.deadline) : null,
    minRequiredTime: row.minRequiredTime,
    maxRequiredTime: row.maxRequiredTime,
    repeatInterval: row.repeatInterval,
    isMandatory: row.isMandatory,
    isComplete: row.isComplete,
    isSkipped: row.isSkipped,
    lastActionedStep: row.lastActionedStep
      ? { step: row.lastActionedStep.step, status: row.lastActionedStep.status as StepStatus }
      : null,
  };
}

export class StartDateAfterTargetDateError extends Error {
	constructor(startDate: Date, targetDate: Date) {
		super('Start date cannot be after target date. Start date: ' + startDate.toISOString() + ', Target date: ' + targetDate.toISOString());
		this.name = 'StartDateAfterTargetDateError';
	}
}

export class StartDateAfterDueDateError extends Error {
	constructor(startDate: Date, dueDate: Date) {
		super('Start date cannot be after due date. Start date: ' + startDate.toISOString() + ', Due date: ' + dueDate.toISOString());
		this.name = 'StartDateAfterDueDateError';
	}
}

export class TargetDateAfterDueDateError extends Error {
	constructor(targetDate: Date, dueDate: Date) {
		super('Target date cannot be after due date. Target date: ' + targetDate.toISOString() + ', Due date: ' + dueDate.toISOString());
		this.name = 'TargetDateAfterDueDateError';
	}
}

export class SkipUntilDateInPastError extends Error {
	constructor(skipUntilDate: Date, currentTime: Date) {
		super('Skip until date cannot be in the past. Skip until date: ' + skipUntilDate.toISOString() + ', Current time: ' + currentTime.toISOString());
		this.name = 'SkipUntilDateInPastError';
	}
}

export const WAITING_TASK_CANNOT_REPEAT_FIX_MESSAGE = "Uncheck Repeating and remove this task's do after tasks first.";

export const TASK_OTHER_TASKS_WAIT_FOR_CANNOT_REPEAT_MESSAGE = "Other tasks wait for this one, so it can't repeat.";

export class RecurringTaskInSequenceError extends Error {
	constructor({ doesTaskWaitForOtherTasks }: { doesTaskWaitForOtherTasks: boolean }) {
		super(doesTaskWaitForOtherTasks ? WAITING_TASK_CANNOT_REPEAT_FIX_MESSAGE : TASK_OTHER_TASKS_WAIT_FOR_CANNOT_REPEAT_MESSAGE);
		this.name = 'RecurringTaskInSequenceError';
	}
}

export function getTaskTimingErrorMessage(error: unknown): string | null {
	if (error instanceof StartDateAfterTargetDateError) return "The start date can't be after the target date.";
	if (error instanceof StartDateAfterDueDateError) return "The start date can't be after the due date.";
	if (error instanceof TargetDateAfterDueDateError) return "The target date can't be after the due date.";
	if (error instanceof RecurringTaskInSequenceError) return error.message;
	return null;
}

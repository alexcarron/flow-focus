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

export class RecurringTaskInSequenceError extends Error {
	constructor() {
		super('Remove this task from its sequence before making it repeat.');
		this.name = 'RecurringTaskInSequenceError';
	}
}

export function getDateOrderErrorMessage(error: unknown): string | null {
	if (error instanceof StartDateAfterTargetDateError) return "The start date can't be after the target date.";
	if (error instanceof StartDateAfterDueDateError) return "The start date can't be after the due date.";
	if (error instanceof TargetDateAfterDueDateError) return "The target date can't be after the due date.";
	return null;
}

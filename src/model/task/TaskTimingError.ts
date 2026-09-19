export class StartTimeAfterEndTimeError extends Error {
	constructor(startTime: Date, endTime: Date) {
		super('Start time cannot be after end time. Start time: ' + startTime.toISOString() + ', End time: ' + endTime.toISOString());
		this.name = 'StartTimeAfterEndTimeError';
	}
}

export class StartTimeAfterDeadlineError extends Error {
	constructor(startTime: Date, deadline: Date) {
		super('Start time cannot be after deadline. Start time: ' + startTime.toISOString() + ', Deadline: ' + deadline.toISOString());
		this.name = 'StartTimeAfterDeadlineError';
	}
}

export class SkipUntilDateInPastError extends Error {
	constructor(skipUntilDate: Date, currentTime: Date) {
		super('Skip until date cannot be in the past. Skip until date: ' + skipUntilDate.toISOString() + ', Current time: ' + currentTime.toISOString());
		this.name = 'SkipUntilDateInPastError';
	}
}

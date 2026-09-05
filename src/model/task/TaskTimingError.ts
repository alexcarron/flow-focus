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

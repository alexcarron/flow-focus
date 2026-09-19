import { recurrenceDurationFromApproximateMilliseconds } from '../../model/task/recurrence/RecurrenceDuration';

export interface RepeatIntervalTaskRowFields {
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	repeatInterval?: number | null;
	reccurenceStartTime?: string | null;
	isComplete: boolean;
}

const FIRST_OCCURRENCE_INDEX = 0;

function pullTimestampBackIntoFirstOccurrence(timestamp: string | null, anchorStartTime: Date, repeatInterval: number): string | null {
	if (timestamp === null) return null;
	let time = new Date(timestamp).getTime();
	while (time - anchorStartTime.getTime() > repeatInterval) {
		time -= repeatInterval;
	}
	return new Date(time).toISOString();
}

export function convertRepeatIntervalTaskRowToRecurrenceDuration(row: RepeatIntervalTaskRowFields & Record<string, unknown>, migrationTime: Date): void {
	const repeatInterval = row.repeatInterval;
	const anchorStartTimestamp = row.reccurenceStartTime ?? row.startTime ?? migrationTime.toISOString();
	delete row.repeatInterval;
	delete row.reccurenceStartTime;

	row.shouldNotSkipMissedOccurrences = false;
	row.skippedOccurrenceIndex = null;

	if (repeatInterval === null || repeatInterval === undefined) {
		row.recurrenceDuration = null;
		row.completedOccurrenceIndex = null;
		row.progressOccurrenceIndex = null;
		return;
	}

	const anchorStartTime = new Date(anchorStartTimestamp);
	row.startTime = anchorStartTime.toISOString();
	row.endTime = pullTimestampBackIntoFirstOccurrence(row.endTime, anchorStartTime, repeatInterval);
	row.deadline = pullTimestampBackIntoFirstOccurrence(row.deadline, anchorStartTime, repeatInterval);
	row.recurrenceDuration = recurrenceDurationFromApproximateMilliseconds(repeatInterval);
	row.completedOccurrenceIndex = row.isComplete ? FIRST_OCCURRENCE_INDEX : null;
	row.progressOccurrenceIndex = FIRST_OCCURRENCE_INDEX;
}

import RecurrenceDuration, { addRecurrenceDurations, getApproximateMillisecondsOfRecurrenceDuration } from './RecurrenceDuration';
import TaskOccurrence from './TaskOccurrence';

export type TaskRecurrenceSnapshot = {
	anchorStartTime: Date;
	anchorEndTime: Date | null;
	anchorDeadline: Date | null;
	recurrenceDuration: RecurrenceDuration;
	completedOccurrenceIndex: number | null;
	skippedOccurrenceIndex: number | null;
	shouldNotSkipMissedOccurrences: boolean;
};

const NO_OCCURRENCE_RESOLVED_INDEX = -1;

function getOccurrenceStartTime(snapshot: Pick<TaskRecurrenceSnapshot, 'anchorStartTime' | 'recurrenceDuration'>, index: number): Date {
	return addRecurrenceDurations(snapshot.anchorStartTime, snapshot.recurrenceDuration, index);
}

export function getLatestStartedOccurrenceIndex(
	snapshot: Pick<TaskRecurrenceSnapshot, 'anchorStartTime' | 'recurrenceDuration'>,
	currentTime: Date,
): number | null {
	if (currentTime.getTime() < snapshot.anchorStartTime.getTime()) return null;

	const elapsedMilliseconds = currentTime.getTime() - snapshot.anchorStartTime.getTime();
	const approximateMillisecondsPerOccurrence = getApproximateMillisecondsOfRecurrenceDuration(snapshot.recurrenceDuration);
	let index = Math.max(0, Math.floor(elapsedMilliseconds / approximateMillisecondsPerOccurrence));

	while (getOccurrenceStartTime(snapshot, index).getTime() > currentTime.getTime()) {
		index -= 1;
	}
	while (getOccurrenceStartTime(snapshot, index + 1).getTime() <= currentTime.getTime()) {
		index += 1;
	}
	return index;
}

export function getCurrentOccurrenceIndex(snapshot: TaskRecurrenceSnapshot, currentTime: Date): number {
	const occurrenceIndexContainingNow = getLatestStartedOccurrenceIndex(snapshot, currentTime) ?? 0;
	const completedIndex = snapshot.completedOccurrenceIndex ?? NO_OCCURRENCE_RESOLVED_INDEX;
	const skippedIndex = snapshot.skippedOccurrenceIndex ?? NO_OCCURRENCE_RESOLVED_INDEX;

	const isOccurrenceContainingNowCompleted = completedIndex >= occurrenceIndexContainingNow && completedIndex >= skippedIndex;
	if (isOccurrenceContainingNowCompleted) return completedIndex;

	const isOccurrenceContainingNowSkipped = skippedIndex >= occurrenceIndexContainingNow;
	if (isOccurrenceContainingNowSkipped) return skippedIndex + 1;

	if (snapshot.shouldNotSkipMissedOccurrences) {
		const lastResolvedIndex = Math.max(completedIndex, skippedIndex);
		return lastResolvedIndex + 1;
	}

	return occurrenceIndexContainingNow;
}

export function computeOccurrenceAtIndex(snapshot: TaskRecurrenceSnapshot, index: number): TaskOccurrence {
	return {
		index,
		startTime: getOccurrenceStartTime(snapshot, index),
		endTime: snapshot.anchorEndTime === null ? null : addRecurrenceDurations(snapshot.anchorEndTime, snapshot.recurrenceDuration, index),
		deadline: snapshot.anchorDeadline === null ? null : addRecurrenceDurations(snapshot.anchorDeadline, snapshot.recurrenceDuration, index),
	};
}

export function computeCurrentTaskOccurrence(snapshot: TaskRecurrenceSnapshot, currentTime: Date): TaskOccurrence {
	return computeOccurrenceAtIndex(snapshot, getCurrentOccurrenceIndex(snapshot, currentTime));
}

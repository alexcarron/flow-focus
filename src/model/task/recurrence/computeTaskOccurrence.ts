import RecurrenceDuration, { addRecurrenceDurations, getApproximateMillisecondsOfRecurrenceDuration, getWeekdaysOfRecurrenceDuration } from './RecurrenceDuration';
import { getWeekdayOccurrenceStartTime, getWeekdayOccurrenceTimeMatchingAnchor } from './recurrenceWeekdayOccurrences';
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

export function getOccurrenceStartTime(snapshot: Pick<TaskRecurrenceSnapshot, 'anchorStartTime' | 'recurrenceDuration'>, index: number): Date {
	const weekdaysFromMonday = getWeekdaysOfRecurrenceDuration(snapshot.recurrenceDuration);
	if (weekdaysFromMonday.length === 0) return addRecurrenceDurations(snapshot.anchorStartTime, snapshot.recurrenceDuration, index);
	return getWeekdayOccurrenceStartTime({
		anchorStartTime: snapshot.anchorStartTime,
		weekdaysFromMonday,
		occurrenceIndex: index,
	});
}

function getOccurrenceTimeMatchingAnchor(parameters: {
	snapshot: TaskRecurrenceSnapshot;
	anchorTime: Date;
	occurrenceIndex: number;
	occurrenceStartTime: Date;
}): Date {
	const { snapshot, anchorTime, occurrenceIndex, occurrenceStartTime } = parameters;
	if (getWeekdaysOfRecurrenceDuration(snapshot.recurrenceDuration).length === 0) {
		return addRecurrenceDurations(anchorTime, snapshot.recurrenceDuration, occurrenceIndex);
	}
	return getWeekdayOccurrenceTimeMatchingAnchor({
		anchorStartTime: snapshot.anchorStartTime,
		anchorTime,
		occurrenceStartTime,
		nextOccurrenceStartTime: getOccurrenceStartTime(snapshot, occurrenceIndex + 1),
	});
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
	const startTime = getOccurrenceStartTime(snapshot, index);
	const getTimeMatchingAnchor = (anchorTime: Date | null) => {
		if (anchorTime === null) return null;
		return getOccurrenceTimeMatchingAnchor({
			snapshot,
			anchorTime,
			occurrenceIndex: index,
			occurrenceStartTime: startTime,
		});
	};
	return {
		index,
		startTime,
		endTime: getTimeMatchingAnchor(snapshot.anchorEndTime),
		deadline: getTimeMatchingAnchor(snapshot.anchorDeadline),
	};
}

export function computeCurrentTaskOccurrence(snapshot: TaskRecurrenceSnapshot, currentTime: Date): TaskOccurrence {
	return computeOccurrenceAtIndex(snapshot, getCurrentOccurrenceIndex(snapshot, currentTime));
}

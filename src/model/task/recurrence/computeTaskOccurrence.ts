import RecurrenceDuration, { addRecurrenceDurations, getApproximateMillisecondsOfRecurrenceDuration, getWeekdaysOfRecurrenceDuration } from './RecurrenceDuration';
import { getWeekdayOccurrenceStartDate, getWeekdayOccurrenceTimeMatchingAnchor } from './recurrenceWeekdayOccurrences';
import TaskOccurrence from './TaskOccurrence';

export type TaskRecurrenceSnapshot = {
	anchorStartDate: Date;
	anchorTargetDate: Date | null;
	anchorDueDate: Date | null;
	recurrenceDuration: RecurrenceDuration;
	completedOccurrenceIndex: number | null;
	skippedOccurrenceIndex: number | null;
	shouldNotSkipMissedOccurrences: boolean;
};

const NO_OCCURRENCE_RESOLVED_INDEX = -1;

export function getOccurrenceStartDate(snapshot: Pick<TaskRecurrenceSnapshot, 'anchorStartDate' | 'recurrenceDuration'>, index: number): Date {
	const weekdaysFromMonday = getWeekdaysOfRecurrenceDuration(snapshot.recurrenceDuration);
	if (weekdaysFromMonday.length === 0) return addRecurrenceDurations(snapshot.anchorStartDate, snapshot.recurrenceDuration, index);
	return getWeekdayOccurrenceStartDate({
		anchorStartDate: snapshot.anchorStartDate,
		weekdaysFromMonday,
		occurrenceIndex: index,
	});
}

function getOccurrenceTimeMatchingAnchor(parameters: {
	snapshot: TaskRecurrenceSnapshot;
	anchorTime: Date;
	occurrenceIndex: number;
	occurrenceStartDate: Date;
}): Date {
	const { snapshot, anchorTime, occurrenceIndex, occurrenceStartDate } = parameters;
	if (getWeekdaysOfRecurrenceDuration(snapshot.recurrenceDuration).length === 0) {
		return addRecurrenceDurations(anchorTime, snapshot.recurrenceDuration, occurrenceIndex);
	}
	return getWeekdayOccurrenceTimeMatchingAnchor({
		anchorStartDate: snapshot.anchorStartDate,
		anchorTime,
		occurrenceStartDate,
		nextOccurrenceStartDate: getOccurrenceStartDate(snapshot, occurrenceIndex + 1),
	});
}

export function getLatestStartedOccurrenceIndex(
	snapshot: Pick<TaskRecurrenceSnapshot, 'anchorStartDate' | 'recurrenceDuration'>,
	currentTime: Date,
): number | null {
	if (currentTime.getTime() < snapshot.anchorStartDate.getTime()) return null;

	const elapsedMilliseconds = currentTime.getTime() - snapshot.anchorStartDate.getTime();
	const approximateMillisecondsPerOccurrence = getApproximateMillisecondsOfRecurrenceDuration(snapshot.recurrenceDuration);
	let index = Math.max(0, Math.floor(elapsedMilliseconds / approximateMillisecondsPerOccurrence));

	while (getOccurrenceStartDate(snapshot, index).getTime() > currentTime.getTime()) {
		index -= 1;
	}
	while (getOccurrenceStartDate(snapshot, index + 1).getTime() <= currentTime.getTime()) {
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
	const startDate = getOccurrenceStartDate(snapshot, index);
	const getTimeMatchingAnchor = (anchorTime: Date | null) => {
		if (anchorTime === null) return null;
		return getOccurrenceTimeMatchingAnchor({
			snapshot,
			anchorTime,
			occurrenceIndex: index,
			occurrenceStartDate: startDate,
		});
	};
	return {
		index,
		startDate,
		targetDate: getTimeMatchingAnchor(snapshot.anchorTargetDate),
		dueDate: getTimeMatchingAnchor(snapshot.anchorDueDate),
	};
}

export function computeCurrentTaskOccurrence(snapshot: TaskRecurrenceSnapshot, currentTime: Date): TaskOccurrence {
	return computeOccurrenceAtIndex(snapshot, getCurrentOccurrenceIndex(snapshot, currentTime));
}

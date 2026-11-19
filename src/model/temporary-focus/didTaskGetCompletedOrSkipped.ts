import type TaskState from '../task/TaskState';

export function didTaskGetCompletedOrSkipped({ stateBefore, stateAfter }: {
	stateBefore: TaskState,
	stateAfter: TaskState,
}): boolean {
	const wasJustCompleted = !stateBefore.isComplete && stateAfter.isComplete;
	const wasJustOccurrenceCompleted = stateBefore.completedOccurrenceIndex !== stateAfter.completedOccurrenceIndex;
	const wasJustSkipped = !stateBefore.isSkipped && stateAfter.isSkipped;
	const wasJustOccurrenceSkipped = stateBefore.skippedOccurrenceIndex !== stateAfter.skippedOccurrenceIndex;
	const skippedUntilBefore = stateBefore.skippedUntil?.getTime() ?? null;
	const skippedUntilAfter = stateAfter.skippedUntil?.getTime() ?? null;
	const wasJustSkippedUntilDate = skippedUntilAfter !== null && skippedUntilAfter !== skippedUntilBefore;
	return wasJustCompleted || wasJustOccurrenceCompleted || wasJustSkipped || wasJustOccurrenceSkipped || wasJustSkippedUntilDate;
}

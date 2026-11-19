import type Task from '../task/Task';
import type TemporaryFocus from './TemporaryFocus';

export function isTemporaryFocusStillValid({ temporaryFocus, focusableTasksInPriorityOrder }: {
	temporaryFocus: TemporaryFocus,
	focusableTasksInPriorityOrder: Task[],
}): boolean {
	const currentPriorityTask = focusableTasksInPriorityOrder[0];
	if (!currentPriorityTask) return false;

	const isPriorityTaskTheSame = currentPriorityTask.id === temporaryFocus.priorityTaskIDWhenFocused;
	const isTemporarilyFocusedTaskStillFocusable = focusableTasksInPriorityOrder.some(task => task.id === temporaryFocus.taskID);
	return isPriorityTaskTheSame && isTemporarilyFocusedTaskStillFocusable;
}

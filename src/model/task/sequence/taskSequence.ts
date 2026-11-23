import type Task from '../Task';

export function getPrerequisiteTasksOfTask({ task, tasks }: { task: Task, tasks: Task[] }): Task[] {
	const prerequisiteTaskIDs = task.getPrerequisiteTaskIDs();
	if (prerequisiteTaskIDs.length === 0) return [];
	return tasks.filter(otherTask => prerequisiteTaskIDs.includes(otherTask.id));
}

export function getTasksDependingOnTask({ task, tasks }: { task: Task, tasks: Task[] }): Task[] {
	return tasks.filter(otherTask => otherTask.getPrerequisiteTaskIDs().includes(task.id));
}

export function isTaskInSequence({ task, tasks }: { task: Task, tasks: Task[] }): boolean {
	return (
		getPrerequisiteTasksOfTask({ task, tasks }).length > 0 ||
		getTasksDependingOnTask({ task, tasks }).length > 0
	);
}

export function doesTaskDependOnTask({ task, otherTask, tasks }: { task: Task, otherTask: Task, tasks: Task[] }): boolean {
	const visitedTaskIDs = new Set<string>();
	const tasksToVisit = getPrerequisiteTasksOfTask({ task, tasks });
	while (tasksToVisit.length > 0) {
		const prerequisiteTask = tasksToVisit.pop()!;
		if (prerequisiteTask.id === otherTask.id) return true;
		if (visitedTaskIDs.has(prerequisiteTask.id)) continue;
		visitedTaskIDs.add(prerequisiteTask.id);
		tasksToVisit.push(...getPrerequisiteTasksOfTask({ task: prerequisiteTask, tasks }));
	}
	return false;
}

export function hasIncompletePrerequisiteTask({ task, tasks }: { task: Task, tasks: Task[] }): boolean {
	return getPrerequisiteTasksOfTask({ task, tasks }).some(prerequisiteTask => {
		// A loop can only come from two devices linking the same tasks in opposite directions before syncing, and without this every task in the loop would stay hidden forever
		const isInLoopWithTask = doesTaskDependOnTask({
			task: prerequisiteTask,
			otherTask: task,
			tasks,
		});
		return !prerequisiteTask.getIsComplete() && !isInLoopWithTask;
	});
}

export function canTaskBePrerequisiteTask(task: Task): boolean {
	return !task.getIsComplete() && !task.isRecurring();
}

export function getTasksThatCanBePrerequisiteTasksOfTask({ dependentTask, tasks }: { dependentTask: Task, tasks: Task[] }): Task[] {
	if (dependentTask.isRecurring()) return [];

	const existingPrerequisiteTaskIDs = dependentTask.getPrerequisiteTaskIDs();
	return tasks.filter(candidateTask => {
		const wouldCreateLoop = doesTaskDependOnTask({
			task: candidateTask,
			otherTask: dependentTask,
			tasks,
		});
		return (
			candidateTask.id !== dependentTask.id &&
			canTaskBePrerequisiteTask(candidateTask) &&
			!existingPrerequisiteTaskIDs.includes(candidateTask.id) &&
			!wouldCreateLoop
		);
	});
}

function calculateSequenceSlack(parameters: {
	task: Task,
	tasks: Task[],
	getOwnSlackOfTask: (task: Task) => number,
	visitedTaskIDs: Set<string>,
}): number {
	const { task, tasks, getOwnSlackOfTask } = parameters;
	const visitedTaskIDs = new Set(parameters.visitedTaskIDs).add(task.id);
	const incompleteTasksDependingOnTask = getTasksDependingOnTask({ task, tasks }).filter(dependentTask =>
		!dependentTask.getIsComplete() &&
		!visitedTaskIDs.has(dependentTask.id)
	);

	return incompleteTasksDependingOnTask.reduce((sequenceSlack, dependentTask) => {
		const dependentTaskSequenceSlack = calculateSequenceSlack({
			task: dependentTask,
			tasks,
			getOwnSlackOfTask,
			visitedTaskIDs,
		});
		return Math.min(sequenceSlack, dependentTaskSequenceSlack - task.getAssumedMaxRequiredTime());
	}, getOwnSlackOfTask(task));
}

export function calculateSequenceDueDateSlack({ task, tasks, currentTime }: { task: Task, tasks: Task[], currentTime: Date }): number {
	return calculateSequenceSlack({
		task,
		tasks,
		getOwnSlackOfTask: taskInSequence => taskInSequence.getDueDateSlack(currentTime),
		visitedTaskIDs: new Set(),
	});
}

export function calculateSequenceTargetOrDueDateSlack({ task, tasks, currentTime }: { task: Task, tasks: Task[], currentTime: Date }): number {
	return calculateSequenceSlack({
		task,
		tasks,
		getOwnSlackOfTask: taskInSequence => taskInSequence.getTargetOrDueDateSlack(currentTime),
		visitedTaskIDs: new Set(),
	});
}

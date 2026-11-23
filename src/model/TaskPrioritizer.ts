import SortOrder from './SortOrder';
import Task from './task/Task';
import TasksManager from './TasksManager';
import { calculateSequenceDueDateSlack, calculateSequenceTargetOrDueDateSlack } from './task/sequence/taskSequence';

export default class TaskPrioritizer {
	private static readonly DO_LOG_PRIORITIES = false;

	private taskToSequenceSlacks = new Map<Task, { dueDateSlack: number, targetOrDueDateSlack: number }>();

	constructor(
		private tasksManager: TasksManager
	) {}

	private getTasks(): Task[] {
		return this.tasksManager.getTasks();
	}

	public getPriorityTask(currentTime: Date): Task | null {
		return this.getFocusableTasksInPriorityOrder(currentTime)[0] ?? null;
	}

	public getFocusableTasksInPriorityOrder(currentTime: Date): Task[] {
		const prioritizedTasks = this.getTasksInPriorityOrder(this.getTasks(), currentTime);
		const activeTasks = prioritizedTasks.filter(task => task.isActive(currentTime));
		return this.filterOutNonUrgentSkippedTasks(activeTasks, currentTime);
	}

	private logPrioritizedTask(task1: Task, task2: Task, priorityNumber: number, reason: string) {
		if (TaskPrioritizer.DO_LOG_PRIORITIES) {
			let prioritizedTask, unprioritizedTask;

			if (priorityNumber > 0) {
				prioritizedTask = task2;
				unprioritizedTask = task1;
			}
			else {
				prioritizedTask = task1;
				unprioritizedTask = task2;
			}

			console.table({
				"Prioritized Task": prioritizedTask.getDescription(),
				"Unprioritized Task": unprioritizedTask.getDescription(),
				"Reason": reason
			});
		}
	}

	private getSequenceSlacksOfTask(task: Task, currentTime: Date): { dueDateSlack: number, targetOrDueDateSlack: number } {
		const cachedSequenceSlacks = this.taskToSequenceSlacks.get(task);
		if (cachedSequenceSlacks !== undefined) return cachedSequenceSlacks;

		const tasks = this.getTasks();
		const sequenceSlacks = {
			dueDateSlack: calculateSequenceDueDateSlack({ task, tasks, currentTime }),
			targetOrDueDateSlack: calculateSequenceTargetOrDueDateSlack({ task, tasks, currentTime }),
		};
		this.taskToSequenceSlacks.set(task, sequenceSlacks);
		return sequenceSlacks;
	}

	private hasSequenceDueDate(task: Task, currentTime: Date): boolean {
		return this.getSequenceSlacksOfTask(task, currentTime).dueDateSlack !== Number.POSITIVE_INFINITY;
	}

	public getTasksInPriorityOrder(tasksToPrioritize: Task[], currentTime: Date): Task[] {
		this.taskToSequenceSlacks.clear();
		let priorityTasks: Task[] = tasksToPrioritize;

		priorityTasks = priorityTasks.sort((task1, task2) => {
			return (
				this.compareBy(
					this.compareByActiveStatus.bind(this), task1, task2, currentTime,
					"Is active while other is completed, skipped, or in the future"
				) ||
				this.compareBy(
					this.compareByDueDateOverTargetDateOnly.bind(this), task1, task2, currentTime,
					"Has a due date without enough slack to do the tasks with only a target date first"
				) ||
				this.compareBy(
					this.compareByLessDueDateSlack.bind(this), task1, task2, currentTime,
					"Has due date slack running out today while the other doesn't"
				) ||
				this.compareBy(
					this.compareByTargetOrDueDateSlack.bind(this), task1, task2, currentTime,
					"Had less sequence target or due date slack"
				) ||
				this.compareBy(
					this.compareByTimeToCompleteByTargetOrDueDate.bind(this), task1, task2, currentTime,
					"Had less time to complete task by its target or due date"
				) ||
				this.compareBy(
					this.compareByProgress.bind(this), task1, task2, currentTime,
					"Had more completed steps"
				)
			)
		});

		if (TaskPrioritizer.DO_LOG_PRIORITIES) console.log("Sorted all tasks by priority");

		return priorityTasks;
	}

	public getTasksInTaskManagerOrder(tasksToOrder: Task[], currentTime: Date): Task[] {
		let orderedTasks: Task[] = tasksToOrder;

		orderedTasks = orderedTasks.sort((task1, task2) => {
			return (
				this.compareByTaskManagerGroup(task1, task2, currentTime) ||
				this.compareByTaskManagerGroupOrder(task1, task2, currentTime)
			)
		});

		return orderedTasks;
	}

	private getTaskManagerGroup(task: Task, currentTime: Date): number {
		if (task.getIsComplete()) return 2;
		if (task.isActiveIgnoringSkip(currentTime)) return 0;
		return 1;
	}

	private compareByTaskManagerGroup(task1: Task, task2: Task, currentTime: Date): SortOrder {
		const group1 = this.getTaskManagerGroup(task1, currentTime);
		const group2 = this.getTaskManagerGroup(task2, currentTime);

		if (group1 < group2) return SortOrder.FIRST_BEFORE_SECOND;
		if (group1 > group2) return SortOrder.SECOND_BEFORE_FIRST;
		return SortOrder.UNDETERMINED;
	}

	private compareByTaskManagerGroupOrder(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (this.getTaskManagerGroup(task1, currentTime) === 2) {
			return this.compareByTargetOrDueDate(task1, task2);
		}

		return (
			this.compareByTimeToCompleteByTargetOrDueDate(task1, task2, currentTime) ||
			this.compareByProgress(task1, task2)
		);
	}

	private compareByTargetOrDueDate(task1: Task, task2: Task): SortOrder {
		const targetOrDueDate1 = task1.getTargetOrDueDate();
		const targetOrDueDate2 = task2.getTargetOrDueDate();

		if (targetOrDueDate1 === null && targetOrDueDate2 === null) return SortOrder.UNDETERMINED;
		if (targetOrDueDate1 === null) return SortOrder.SECOND_BEFORE_FIRST;
		if (targetOrDueDate2 === null) return SortOrder.FIRST_BEFORE_SECOND;
		if (targetOrDueDate1.getTime() < targetOrDueDate2.getTime()) return SortOrder.FIRST_BEFORE_SECOND;
		if (targetOrDueDate1.getTime() > targetOrDueDate2.getTime()) return SortOrder.SECOND_BEFORE_FIRST;
		return SortOrder.UNDETERMINED;
	}

	private compareBy(
		compareFunction:
			((task1: Task, task2: Task, currentTime: Date) => SortOrder) |
			((task1: Task, task2: Task) => SortOrder),
		task1: Task, task2: Task, currentTime: Date, comparisonReason: string
	) {
		const comparison = compareFunction(task1, task2, currentTime);
		if (comparison != SortOrder.UNDETERMINED) this.logPrioritizedTask(task1, task2, comparison, comparisonReason);
		return comparison;
	}

	private compareByActiveStatus(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (task1.isActive(currentTime) && !task2.isActive(currentTime)) {
				return SortOrder.FIRST_BEFORE_SECOND;
		} else if (!task1.isActive(currentTime) && task2.isActive(currentTime)) {
				return SortOrder.SECOND_BEFORE_FIRST;
		}
		return SortOrder.UNDETERMINED;
	}

	private compareDuringDowntime(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (this.tasksManager.getDowntime().isInRange(currentTime)) {
			if (
				task1.getDueDate() !== null && task2.getDueDate() === null &&
				!task1.isUrgent(currentTime)
			) {
				return SortOrder.SECOND_BEFORE_FIRST
			}
			else if (
				task1.getDueDate() === null && task2.getDueDate() !== null &&
				!task2.isUrgent(currentTime)
			) {
				return SortOrder.FIRST_BEFORE_SECOND
			}
		}

		return SortOrder.UNDETERMINED
	}

	private compareByDueDateOverTargetDateOnly(task1: Task, task2: Task, currentTime: Date): SortOrder {
		const doesTask1HaveSequenceDueDate = this.hasSequenceDueDate(task1, currentTime);
		const doesTask2HaveSequenceDueDate = this.hasSequenceDueDate(task2, currentTime);

		if (
			doesTask1HaveSequenceDueDate && !doesTask2HaveSequenceDueDate &&
			this.wouldTargetDateOnlyTasksLeaveTooLittleTimeFor(task1, currentTime)
		) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}
		else if (
			!doesTask1HaveSequenceDueDate && doesTask2HaveSequenceDueDate &&
			this.wouldTargetDateOnlyTasksLeaveTooLittleTimeFor(task2, currentTime)
		) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}

		return SortOrder.UNDETERMINED;
	}

	private wouldTargetDateOnlyTasksLeaveTooLittleTimeFor(dueDateTask: Task, currentTime: Date): boolean {
		const dueDateTaskSequenceDueDateSlack = this.getSequenceSlacksOfTask(dueDateTask, currentTime).dueDateSlack;
		if (dueDateTaskSequenceDueDateSlack === Number.POSITIVE_INFINITY) return false;

		const dueDateTaskTimeToCompleteBySequenceDueDate = dueDateTaskSequenceDueDateSlack + dueDateTask.getAssumedMaxRequiredTime();
		let totalTargetDateOnlyTasksDuration = 0;
		for (const task of this.tasksManager.getTasks()) {
			if (!task.isActive(currentTime) || this.hasSequenceDueDate(task, currentTime)) continue;

			const sequenceTargetOrDueDateSlack = this.getSequenceSlacksOfTask(task, currentTime).targetOrDueDateSlack;
			const timeToCompleteBySequenceTargetDate = sequenceTargetOrDueDateSlack + task.getAssumedMaxRequiredTime();
			const isTargetedBeforeDueDate = timeToCompleteBySequenceTargetDate < dueDateTaskTimeToCompleteBySequenceDueDate;
			if (isTargetedBeforeDueDate) {
				totalTargetDateOnlyTasksDuration += task.getAssumedMaxRequiredTime();
			}
		}

		return dueDateTaskSequenceDueDateSlack < totalTargetDateOnlyTasksDuration;
	}

	private compareByLessDueDateSlack(task1: Task, task2: Task, currentTime: Date): SortOrder {
		const isTask1DueDateSlackRunningOutToday = task1.isDueDateSlackRunningOutToday(currentTime);
		const isTask2DueDateSlackRunningOutToday = task2.isDueDateSlackRunningOutToday(currentTime);

		if (isTask1DueDateSlackRunningOutToday && !isTask2DueDateSlackRunningOutToday) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}
		else if (!isTask1DueDateSlackRunningOutToday && isTask2DueDateSlackRunningOutToday) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}

		return SortOrder.UNDETERMINED;
	}

	private compareByTimeToCompleteByTargetOrDueDate(task1: Task, task2: Task, currentTime: Date): SortOrder {
		const timeToComplete1 = task1.getTimeToCompleteByTargetOrDueDate(currentTime);
		const timeToComplete2 = task2.getTimeToCompleteByTargetOrDueDate(currentTime);

		if (timeToComplete1 > timeToComplete2) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}
		else if (timeToComplete1 < timeToComplete2) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}

		return SortOrder.UNDETERMINED;
	}

	private compareByTargetOrDueDateSlack(task1: Task, task2: Task, currentTime: Date): SortOrder {
		const slack1 = this.getSequenceSlacksOfTask(task1, currentTime).targetOrDueDateSlack;
		const slack2 = this.getSequenceSlacksOfTask(task2, currentTime).targetOrDueDateSlack;

		if (slack1 < slack2) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}
		else if (slack2 < slack1) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}

		return SortOrder.UNDETERMINED;
	}

	private compareByProgress(task1: Task, task2: Task): SortOrder {
		if (task1.getProgress() > task2.getProgress()) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}
		else if (task2.getProgress() > task1.getProgress()) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}

		return SortOrder.UNDETERMINED;
	}

	private filterOutNonUrgentSkippedTasks(tasks: Task[], currentTime: Date): Task[] {
		return tasks.filter(task => {
			return (
				!task.getIsSkipped() ||
				task.isUrgent(currentTime)
			)
		});
	}
}

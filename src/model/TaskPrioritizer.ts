import SortOrder from './SortOrder';
import Task from './task/Task'; // Assume this is your task model
import TasksManager from './TasksManager';

export default class TaskPrioritizer {
	private static readonly DO_LOG_PRIORITIES = false;

	constructor(
		private tasksManager: TasksManager
	) {}

	private getTasks(): Task[] {
		return this.tasksManager.getTasks();
	}

	public getMostImportantTask(currentTime: Date): Task | null {
		let prioritizedTasks = this.getTasksInPriorityOrder(this.getTasks(), currentTime);

		prioritizedTasks = prioritizedTasks.filter(task => task.isActive(currentTime));
		prioritizedTasks = this.filterOutNonUrgentSkippedTasks(prioritizedTasks, currentTime);

		if (prioritizedTasks.length === 0) {
				return null;
		}

		// Return the first task from the sorted prioritized tasks list
		return prioritizedTasks[0];
	}

	private logPriotizedTask(task1: Task, task2: Task, priorityNumber: number, reason: string) {
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

	/**
	 *
	 */
	public getTasksInPriorityOrder(tasksToPrioritize: Task[], currentTime: Date): Task[] {
		let priorityTasks: Task[] = tasksToPrioritize;

		priorityTasks = priorityTasks.sort((task1, task2) => {
			return (
				this.compareBy(
					this.compareByActiveStatus.bind(this), task1, task2, currentTime,
					"Is active while other is completed, skipped, or in the future"
				) ||
				/* this.compareBy(
					this.compareDuringDowntime, task1, task2, currentTime,
					"Is mandatory with not downtime to skip it"
				) || */
				this.compareBy(
					this.compareByMandatoryStatus.bind(this), task1, task2, currentTime,
					"Is mandatory with not enough slack time to complete optional tasks first"
				) ||
				this.compareBy(
					this.compareBySlackTime.bind(this), task1, task2, currentTime,
					`Had less minimum slack time: ${task1.getMinSlackTime(currentTime)} VS ${task2.getMinSlackTime(currentTime)}`
				) ||
				this.compareBy(
					this.compareByTimeToComplete.bind(this), task1, task2, currentTime,
					"Had less time to complete task"
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

	private compareBy(
		compareFunction:
			((task1: Task, task2: Task, currentTime: Date) => SortOrder) |
			((task1: Task, task2: Task) => SortOrder),
		task1: Task, task2: Task, currentTime: Date, comparisonReason: string
	) {
		const comparison = compareFunction(task1, task2, currentTime);
		if (comparison != SortOrder.UNDETERMINED) this.logPriotizedTask(task1, task2, comparison, comparisonReason);
		return comparison;
	}

	private compareByActiveStatus(task1: Task, task2: Task, currentTime: Date): SortOrder {
    if (task1.isActive(currentTime) && !task2.isActive(currentTime)) {
        return SortOrder.FIRST_BEFORE_SECOND;  // task1 is active, task2 is not, so task1 comes first
    } else if (!task1.isActive(currentTime) && task2.isActive(currentTime)) {
        return SortOrder.SECOND_BEFORE_FIRST;   // task2 is active, task1 is not, so task2 comes first
    }
    return SortOrder.UNDETERMINED; // both tasks are either active or inactive
	}

	private compareDuringDowntime(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (this.tasksManager.getDowntime().isInRange(currentTime)) {
			if (
				task1.getIsMandatory() && !task2.getIsMandatory() &&
				!task1.isUrgent(currentTime)
			) {
				return SortOrder.SECOND_BEFORE_FIRST
			}
			else if (
				!task1.getIsMandatory() && task2.getIsMandatory() &&
				!task2.isUrgent(currentTime)
			) {
				return SortOrder.FIRST_BEFORE_SECOND
			}
		}

		return SortOrder.UNDETERMINED
	}

	private compareByMandatoryStatus(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (
			task1.getIsMandatory() && !task2.getIsMandatory() &&
			this.shouldPrioritizeMandatoryTask(task1, currentTime)
		) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}
		else if (
			!task1.getIsMandatory() && task2.getIsMandatory() &&
			this.shouldPrioritizeMandatoryTask(task2, currentTime)
		) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}

		return SortOrder.UNDETERMINED;
	}

	/**
	 * Decides whether a mandatory task should be priortized over an optional one or if we should continue. If the first task is the optional task, you should reverse the return value.
	 *
	 * @param mandatoryTask - The mandatory task.
	 * @return - Whether the mandatory task should be priortized over the optional task.
	 */
	private shouldPrioritizeMandatoryTask(mandatoryTask: Task, currentTime: Date): boolean {
    let totalOptionalTasksDuration = 0;

    for (const optionalTask of this.tasksManager.getTasks()) {
			if (
				!optionalTask.getIsMandatory() &&
				optionalTask.isActive(currentTime) &&
				optionalTask.getDeadline() !== null &&
				mandatoryTask.getDeadline() !== null &&
				optionalTask.getDeadline()! < mandatoryTask.getDeadline()!
			) {
					totalOptionalTasksDuration += optionalTask.getMaxRequiredTime(currentTime);
			}
    }

		return (
			mandatoryTask.getMinSlackTime(currentTime) <
			totalOptionalTasksDuration
		);
	}

	private compareByTimeToComplete(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (task1.getTimeToComplete(currentTime) > task2.getTimeToComplete(currentTime)) {
			return SortOrder.SECOND_BEFORE_FIRST;
		}
		else if (task1.getTimeToComplete(currentTime) < task2.getTimeToComplete(currentTime)) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}

		return SortOrder.UNDETERMINED;
	}

	private compareBySlackTime(task1: Task, task2: Task, currentTime: Date): SortOrder {
		if (task1.getMinSlackTime(currentTime) < task2.getMinSlackTime(currentTime)) {
			return SortOrder.FIRST_BEFORE_SECOND;
		}
		else if (task2.getMinSlackTime(currentTime) < task1.getMinSlackTime(currentTime)) {
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

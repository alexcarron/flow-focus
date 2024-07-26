import Task from './task/Task'; // Assume this is your task model

export default class TaskPrioritizer {
	private tasks: Task[] = [];
	private nonTaskableTimePerDay: number = 0;

	constructor(tasks: Task[], nonTaskableTimePerDay: number = 0) {
		this.tasks = tasks;
		this.nonTaskableTimePerDay = nonTaskableTimePerDay;
	}

	public getMostImportantTask(currentTime: Date): Task | null {
		const prioritizedTasks = this.prioritizeTasks(this.tasks, currentTime);

		if (prioritizedTasks.length === 0) {
				return null;
		}

		// Return the first task from the sorted prioritized tasks list
		return prioritizedTasks[0];
	}

	private logPriotizedTask(task1: Task, task2: Task, priorityNumber: number, reason: string) {
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

	private prioritizeTasks(tasksToPrioritize: Task[], currentTime: Date): Task[] {
		let priorityTasks: Task[] = tasksToPrioritize;

		priorityTasks = this.filterOutUnstartableTasks(priorityTasks, currentTime);
		priorityTasks = this.filterOutCompletedTasks(priorityTasks);

		priorityTasks = priorityTasks.sort((task1, task2) => {

			// Prioritize mandatory tasks
			if (
				task1.getIsMandatory() && !task2.getIsMandatory() &&
				this.shouldPrioritizeMandatoryTask(task1, task2, currentTime)
			) {
				this.logPriotizedTask(task1, task2, -1, "Had less slack time than optional task's required time");
				return -1
			}
			else if (
				!task1.getIsMandatory() && task2.getIsMandatory() &&
				this.shouldPrioritizeMandatoryTask(task2, task1, currentTime)
			) {
				this.logPriotizedTask(task1, task2, 1, "Had less slack time than optional task's required time");
				return 1
			}

			// Prioritize task with less time to complete
			const timeToCompleteDifference =
				task1.getTimeToComplete(currentTime, this.nonTaskableTimePerDay) -
				task2.getTimeToComplete(currentTime, this.nonTaskableTimePerDay);

			if (timeToCompleteDifference !== 0 && !isNaN(timeToCompleteDifference)) {
				this.logPriotizedTask(task1, task2, timeToCompleteDifference, "Had less time to complete");
				return timeToCompleteDifference;
			}

			// Priotize task with less minimum slack time
			const minSlackTimeDifference =
				task1.getMinSlackTime(currentTime, this.nonTaskableTimePerDay) -
				task2.getMinSlackTime(currentTime, this.nonTaskableTimePerDay);


			if (minSlackTimeDifference !== 0 && !isNaN(timeToCompleteDifference)) {
				this.logPriotizedTask(task1, task2, minSlackTimeDifference, "Had less minimum slack time");
				return minSlackTimeDifference;
			}


			// Priotize task with less maximum slack time
			const maxBufferTimeDifference =
				task1.getMaxSlackTime(currentTime, this.nonTaskableTimePerDay) -
				task2.getMaxSlackTime(currentTime, this.nonTaskableTimePerDay);

			if (maxBufferTimeDifference !== 0 && !isNaN(timeToCompleteDifference)) {
				this.logPriotizedTask(task1, task2, maxBufferTimeDifference, "Had less maximum slack time");
				return maxBufferTimeDifference;
			}

			// Priortize tasks that are closer to being complete since we're closer to getting them done
			const progressDifference =
				task1.getProgress() - task2.getProgress();

			if (progressDifference !== 0 && !isNaN(timeToCompleteDifference)) {
				this.logPriotizedTask(task1, task2, progressDifference, "Had more progress");
				return -progressDifference; // Higher progress should be prioritized first
			}

			return 0;
		});

		return priorityTasks;
	}

	/**
	 * Decides whether a mandatory task should be priortized over an optional one or if we should continue. If the first task is the optional task, you should reverse the return value.
	 *
	 * @param mandatoryTask - The mandatory task.
	 * @param optionalTask - The optional task.
	 * @return - Whether the mandatory task should be priortized over the optional task.
	 */
	private shouldPrioritizeMandatoryTask(mandatoryTask: Task, optionalTask: Task, currentTime: Date): boolean {
		return (
			mandatoryTask.getMinSlackTime(currentTime, this.nonTaskableTimePerDay) <
			optionalTask.getMaxRequiredTime(currentTime, this.nonTaskableTimePerDay)
		);
	}

	private filterOutUnstartableTasks(tasks: Task[], currentTime: Date): Task[] {
		return tasks.filter(task => {
			if (task.getEarliestStartTime() === null) {
				return true;
			}

			return task.getEarliestStartTime()!.getTime() <= currentTime.getTime();
		});
	}

	private filterOutCompletedTasks(tasks: Task[]): Task[] {
		return tasks.filter(task => !task.getIsComplete());
	}
}

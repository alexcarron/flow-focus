import RoutineTask from './RoutineTask';
import Task from './Task'; // Assume this is your task model

export default class TaskPrioritizer {
	private static readonly URGENT_MILLISECONDS_LEFT = 1000 * 60 * 60 * 5;
	private tasks: Task[] = [];

	constructor(tasks: Task[]) {
		this.tasks = tasks;
	}

	public getMostImportantTask(currentTime: Date): Task | null {
		const prioritizedTasks = this.prioritizeTasks(this.tasks, currentTime);

		if (prioritizedTasks.length === 0) {
				return null;
		}

		// Return the first task from the sorted prioritized tasks list
		return prioritizedTasks[0];
	}

	private prioritizeTasks(tasksToPrioritize: Task[], currentTime: Date): Task[] {
		let priorityTasks = tasksToPrioritize;

		priorityTasks = this.filterOnlyStartableTasks(priorityTasks, currentTime);
		priorityTasks = this.filterOutCompletedTasks(priorityTasks);

		priorityTasks = priorityTasks.sort((task1, task2) => {
			// Prioritize routine task unless task has a minimum buffer time less than 5 hours
			if (
				task1 instanceof RoutineTask &&
				!(task2 instanceof RoutineTask) &&
				task2.getMinBufferTime(currentTime) > TaskPrioritizer.URGENT_MILLISECONDS_LEFT
			) {
				return -1;
			}

			if (
				task2 instanceof RoutineTask &&
				!(task1 instanceof RoutineTask) &&
				task1.getMinBufferTime(currentTime) > TaskPrioritizer.URGENT_MILLISECONDS_LEFT
			) {
				return 1;
			}

			// Prioritize mandatory tasks
			if (task1.getIsMandatory() && !task2.getIsMandatory()) {
				return -1;
			}
			else if (!task1.getIsMandatory() && task2.getIsMandatory()) {
				return 1;
			}

			// Tasks with closer deadlines should be prioritized first so we can get them done quicker
			const timeToCompleteDifference =
				task1.getTimeToComplete(currentTime) -
				task2.getTimeToComplete(currentTime);

			if (timeToCompleteDifference !== 0) {
				return timeToCompleteDifference;
			}

			// Tasks with less minimum buffer time should be prioritized first since we have less time to procrastinate them
			const minBufferTimeDifference =
				task1.getMinBufferTime(currentTime) -
				task2.getMinBufferTime(currentTime);


			if (minBufferTimeDifference !== 0) {
				return minBufferTimeDifference;
			}


			// Tasks with less maximum buffer time should be prioritized first  since we have less time to procrastinate them
			const maxBufferTimeDifference =
				task1.getMaxBufferTime(currentTime) -
				task2.getMaxBufferTime(currentTime);

			if (maxBufferTimeDifference !== 0) {
				return maxBufferTimeDifference;
			}

			// Priortize tasks that are closer to being complete since we're closer to getting them done
			const progressDifference =
				task1.getProgress() - task2.getProgress();

			if (progressDifference !== 0) {
				return -progressDifference; // Higher progress should be prioritized first
			}

			return 0;
		});

		return priorityTasks;
	}

	private filterOnlyStartableTasks(tasks: Task[], currentTime: Date): Task[] {
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

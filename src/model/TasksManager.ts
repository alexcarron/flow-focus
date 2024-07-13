import Task from "./Task";
import TaskPrioritizer from "./TaskPrioritizer";

export default class TasksManager {
	protected tasks: Task[] = [];

	protected createNewTask(taskDescription: string): Task {
		return new Task(taskDescription);
	}

	public addTask(taskDescription: string): Task {
		const task = this.createNewTask(taskDescription);
		this.tasks.push(task);
		return task;
	}

	public getPriorityTask(currentTime: Date): Task | null {
		const taskPrioritizer: TaskPrioritizer = new TaskPrioritizer(this.tasks);
		return taskPrioritizer.getMostImportantTask(currentTime);
	}

	private getRecurringTasks(): Task[] {
		return this.tasks.filter(task => task.isRecurring());
	}

	/**
	 *  Checks if the end of any reccuring task's interval has passed and if so, resets the task and interval
	 *
	 * @param {Date} currentTime - The current time to compare against task intervals.
	 */
	private checkRecurringTasks(currentTime: Date): void {
		const recurringTasks = this.getRecurringTasks();
		recurringTasks.forEach(recurringTask => {
			if (recurringTask.isPastIntervalEndTime()) {
				recurringTask.onPastIntervalEndTime();
			}
		});
	}

		/**
		 * Updates the tasks to have the correct state based on the current time.
		 *
		 * @param {Date} currentTime - The current time to compare against task intervals.
		 */
	public update(currentTime: Date): void {
		this.checkRecurringTasks(currentTime);
	}
}
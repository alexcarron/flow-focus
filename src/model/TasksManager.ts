import Task from "./task/Task";
import TaskPrioritizer from './TaskPrioritizer';
import TimeWindow from "./time-management/TimeWindow";

export default class TasksManager {
	protected tasks: Task[] = [];
	private asleepTimeWindow: TimeWindow = new TimeWindow("00:00", "8:00");

	/**
	 * Dynamically creates a new task
	 * @param taskDescription - The description of the task
	 * @returns The new task
	 */
	protected createNewTask(taskDescription: string): Task {
		return new Task(this, taskDescription);
	}

	/**
	 * Adds a newly created task based on the description
	 * @param taskDescription - The description of the task
	 * @returns The new task
	 */
	public addTask(taskDescription: string): Task {
		const task = this.createNewTask(taskDescription);
		this.tasks.push(task);
		return task;
	}

	public getAsleepTimeWindow(): TimeWindow {
		return this.asleepTimeWindow;
	}

	/**
	 * Returns the task with the highest priority
	 * @param currentTime - The current time
	 * @returns The task with the highest priority
	 */
	public getPriorityTask(currentTime: Date): Task | null {
		const taskPrioritizer: TaskPrioritizer = new TaskPrioritizer(this);
		return taskPrioritizer.getMostImportantTask(currentTime);
	}

	/**
	 * Returns all recurring tasks
	 * @returns All recurring tasks
	 */
	private getRecurringTasks(): Task[] {
		return this.tasks.filter(task => task.isRecurring());
	}

	getTasks(): Task[] {
		return this.tasks;
	}

	/**
	 * Checks if the end of any reccuring task's interval has passed and if so, resets the task and interval
	 * @param {Date} currentTime - The current time to compare against task intervals.
	 */
	private checkRecurringTasks(currentTime: Date): void {
		const recurringTasks = this.getRecurringTasks();
		recurringTasks.forEach(recurringTask => {
			if (recurringTask.isPastIntervalEndTime(currentTime)) {
				recurringTask.onPastIntervalEndTime(currentTime);
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


// 14
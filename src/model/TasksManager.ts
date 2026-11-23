import Task from "./task/Task";
import TaskPrioritizer from './TaskPrioritizer';
import RecurringDateRange from "./time-management/RecurringDateRange";
import Time from "./time-management/Time";
import TimeWindow from "./time-management/TimeWindow";
import Weekday from "./time-management/Weekday";
import WeeklyDateRange from "./time-management/WeeklyDateRange";

export default class TasksManager {
	protected tasks: Task[] = [];
	private asleepTimeWindow: TimeWindow | null = new TimeWindow("0:00", "8:00");
	private downtimeTime: RecurringDateRange = new WeeklyDateRange(
		Weekday.SATURDAY, new Time(0),
		Weekday.SUNDAY, new Time(23, 59)
	)

	private addTask(task: Task) {
		this.tasks.push(task);
	}

	protected createNewTask(taskDescription: string, { taskID, createdAt }: { taskID?: string; createdAt?: Date } = {}): Task {
		const noInitialTagIDs: string[] = [];
		return new Task(this, taskDescription, taskID, noInitialTagIDs, createdAt);
	}

	public addCreatedTask(taskDescription: string, { taskID, createdAt }: { taskID?: string; createdAt?: Date } = {}): Task {
		const task = this.createNewTask(taskDescription, { taskID, createdAt });
		this.addTask(task);
		return task;
	}

	public clearTasks(): void {
		this.tasks = [];
	}

	public unSkipSkippedTasks() {
		const skippedTasks = this.tasks.filter(task => task.getIsSkipped());
		skippedTasks.forEach(task => task.unSkip());
	}

	public getAsleepTimeWindow(): TimeWindow | null {
		return this.asleepTimeWindow;
	}

	public setAsleepTimeWindow(timeWindow: TimeWindow | null): void {
		this.asleepTimeWindow = timeWindow;
	}

	public getDowntime(): RecurringDateRange {
		return this.downtimeTime;
	}

	public getPriorityTask(currentTime: Date): Task | null {
		const taskPrioritizer: TaskPrioritizer = new TaskPrioritizer(this);
		return taskPrioritizer.getPriorityTask(currentTime);
	}

	getTasksInPriorityOrder(currentTime: Date): Task[] {
		const taskPrioritizer: TaskPrioritizer = new TaskPrioritizer(this);
		return taskPrioritizer.getTasksInPriorityOrder(this.tasks, currentTime);
	}

	private getRecurringTasks(): Task[] {
		return this.tasks.filter(task => task.isRecurring());
	}

	getTasks(): Task[] {
		return this.tasks;
	}

	private refreshRecurringTaskOccurrences(currentTime: Date): void {
		this.getRecurringTasks().forEach(recurringTask => {
			recurringTask.refreshCurrentOccurrence(currentTime);
		});
	}

	public update(currentTime: Date): void {
		this.refreshRecurringTaskOccurrences(currentTime);
	}

	public deleteTask(taskDeleting: Task): boolean {
		const currentNumTasks = this.tasks.length;
		this.tasks = this.tasks.filter((task) => {
			return task.id !== taskDeleting.id;
		});
		const newNumTasks = this.tasks.length;

		return newNumTasks < currentNumTasks;
	}
}

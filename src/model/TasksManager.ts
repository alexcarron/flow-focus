import Task from "./task/Task";
import TaskPrioritizer from './TaskPrioritizer';
import RecurringDateRange from "./time-management/RecurringDateRange";
import Time from "./time-management/Time";
import TimeWindow from "./time-management/TimeWindow";
import Weekday from "./time-management/Weekday";
import WeeklyDateRange from "./time-management/WeeklyDateRange";
import RecurrenceUnit from "./task/recurrence/RecurrenceUnit";

export default class TasksManager {
	protected tasks: Task[] = [];
	private asleepTimeWindow: TimeWindow = new TimeWindow("0:00", "8:00");
	private downtimeTime: RecurringDateRange = new WeeklyDateRange(
		Weekday.SATURDAY, new Time(0),
		Weekday.SUNDAY, new Time(23, 59)
	)
	private sleepTask: Task;

	constructor() {
		this.sleepTask = this.createSleepTask(new Date());
	}

	private addTask(task: Task) {
		this.tasks.push(task);
	}

	protected createNewTask(taskDescription: string, taskID?: string): Task {
		return new Task(this, taskDescription, taskID);
	}

	public addCreatedTask(taskDescription: string, taskID?: string): Task {
		const task = this.createNewTask(taskDescription, taskID);
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

	public getAsleepTimeWindow(): TimeWindow {
		return this.asleepTimeWindow;
	}

	public setAsleepTimeWindow(timeWindow: TimeWindow): void {
		this.asleepTimeWindow = timeWindow;
		this.sleepTask = this.createSleepTask(new Date());
	}

	public getDowntime(): RecurringDateRange {
		return this.downtimeTime;
	}

	private createSleepTask(currentTime: Date): Task {
		const sleepDateRange = this.asleepTimeWindow.toDateRange(currentTime);

		const task = new Task(this, "Go To Sleep");
		task.setDeadline(sleepDateRange.getEndDate());
		task.makeRecurring({ amount: 1, unit: RecurrenceUnit.Day }, sleepDateRange.getStartDate(), currentTime);

		return task;
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

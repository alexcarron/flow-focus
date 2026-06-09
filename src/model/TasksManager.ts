import Task from "./task/Task";
import TaskPrioritizer from './TaskPrioritizer';
import RecurringDateRange from "./time-management/RecurringDateRange";
import Time from "./time-management/Time";
import TimeWindow from "./time-management/TimeWindow";
import Weekday from "./time-management/Weekday";
import WeeklyDateRange from "./time-management/WeeklyDateRange";

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

	protected createNewTask(taskDescription: string): Task {
		return new Task(this, taskDescription);
	}

	public addCreatedTask(taskDescription: string): Task {
		const task = this.createNewTask(taskDescription);
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

	public getDowntime(): RecurringDateRange {
		return this.downtimeTime;
	}

	private createSleepTask(currentTime: Date): Task {
		const sleepDateRange = this.asleepTimeWindow.toDateRange(currentTime);

		const task = new Task(this, "Go To Sleep");
		const day = 1000 * 60 * 60 * 24;
		task.makeRecurring(day, sleepDateRange.getStartDate());
		task.setStartTime(sleepDateRange.getStartDate());
		task.setDeadline(sleepDateRange.getEndDate());

		return task;
	}

	public getPriorityTask(currentTime: Date): Task | null {
		const taskPrioritizer: TaskPrioritizer = new TaskPrioritizer(this);
		return taskPrioritizer.getMostImportantTask(currentTime);
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

	private checkRecurringTasks(currentTime: Date): void {
		const recurringTasks = this.getRecurringTasks();
		recurringTasks.forEach(recurringTask => {
			if (recurringTask.isPastIntervalEndTime(currentTime)) {
				recurringTask.onPastIntervalEndTime(currentTime);
			}
		});
	}

	public update(currentTime: Date): void {
		this.checkRecurringTasks(currentTime);
	}

	public deleteTask(taskDeleting: Task): boolean {
		const currentNumTasks = this.tasks.length;
		this.tasks = this.tasks.filter((task) => {
			return !task.equals(taskDeleting);
		});
		const newNumTasks = this.tasks.length;

		console.log({
			currentNumTasks,
			newNumTasks,
			tasks: this.tasks
		});

		return newNumTasks < currentNumTasks;
	}
}

import NotifyStateChange from "../persistence/observer/NotifyStateChangeDecorator";
import StateObservable from "../persistence/observer/StateObservable";
import StateObserver from "../persistence/observer/StateObserver";
import Task from "./task/Task";
import TaskPrioritizer from './TaskPrioritizer';
import TasksManagerState from "./TasksManagerState";
import RecurringDateRange from "./time-management/RecurringDateRange";
import Time from "./time-management/Time";
import TimeWindow from "./time-management/TimeWindow";
import Weekday from "./time-management/Weekday";
import WeeklyDateRange from "./time-management/WeeklyDateRange";

export default class TasksManager implements StateObservable {
	protected tasks: Task[] = [];
	private asleepTimeWindow: TimeWindow = new TimeWindow("0:00", "8:00");
	private downtimeTime: RecurringDateRange = new WeeklyDateRange(
		Weekday.SATURDAY, new Time(0),
		Weekday.SUNDAY, new Time(23, 59)
	)
	private sleepTask: Task;

	constructor(
		public stateObserver: StateObserver,
	) {
		this.sleepTask = this.createSleepTask(new Date());
	}

	@NotifyStateChange
	private addTask(task: Task) {
		this.tasks.push(task);
	}

	/**
	 * Dynamically creates a new task
	 * @param taskDescription - The description of the task
	 * @returns The new task
	 */
	protected createNewTask(taskDescription: string): Task {
		return new Task(this, taskDescription, this.stateObserver);
	}

	/**
	 * Adds a newly created task based on the description
	 * @param taskDescription - The description of the task
	 * @returns The new task
	 */
	public addCreatedTask(taskDescription: string): Task {
		const task = this.createNewTask(taskDescription);
		this.addTask(task);
		return task;
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

		const task = new Task(this, "Go To Sleep", this.stateObserver);
		const day = 1000 * 60 * 60 * 24;
		task.makeRecurring(day, sleepDateRange.getStartDate());
		task.setStartTime(sleepDateRange.getStartDate());
		task.setDeadline(sleepDateRange.getEndDate());

		return task;
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

	getTasksInPriorityOrder(currentTime: Date): Task[] {
		const taskPrioritizer: TaskPrioritizer = new TaskPrioritizer(this);
		return taskPrioritizer.getTasksInPriorityOrder(this.tasks, currentTime);
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

	getState(): TasksManagerState {
		return {
			tasks: this.tasks.map(task => task.getState()),
			asleepTimeWindow: this.asleepTimeWindow,
			downtimeTime: this.downtimeTime
		}
	}

	@NotifyStateChange
	async restoreState(tasksManagerState: TasksManagerState) {
		const unFoundTasks = tasksManagerState.tasks.filter(state => {
			const task = this.tasks.find(task => task.getDescription() === state.description);

			if (task !== undefined) {
				task.restoreState(state);
				return false;
			}
			else {
				return true;
			}
		});

		unFoundTasks.forEach(state => {
			const task = this.createNewTask(state.description);
			task.restoreState(state);
			this.tasks.push(task);
		});

		this.asleepTimeWindow = tasksManagerState.asleepTimeWindow;
		this.downtimeTime = tasksManagerState.downtimeTime;
	}

	@NotifyStateChange
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


// 14
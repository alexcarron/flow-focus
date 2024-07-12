import Task from "./Task";
import TaskPrioritizer from "./TaskPrioritizer";

export default class TasksManager {
	protected tasks: Task[] = [];

	protected createNewTask(taskDescription: string): Task {
		const task = new Task(taskDescription);
		return task;
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
}
import Task from "./Task";

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

	public getNextTask(): Task {
		return this.tasks[this.tasks.length - 1];
	}
}
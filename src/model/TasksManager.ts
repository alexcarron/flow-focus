import Task from "./Task";

export default class TasksManager {
	private tasks: Task[] = [];

	public addTask(task: Task) {
		this.tasks.push(task);
	}

	public getNextTask(): Task {
		return this.tasks[this.tasks.length - 1];
	}
}
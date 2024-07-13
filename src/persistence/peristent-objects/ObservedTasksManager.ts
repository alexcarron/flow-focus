import TasksManager from "../../model/TasksManager";
import ObservedTask from "./ObservedTask";
import StateObserver from './StateObserver';

export default class ObservedTasksManager extends TasksManager {
	public constructor(
		private stateObserver: StateObserver,
	) {
		super();
	}

	override createNewTask(taskDescription: string): ObservedTask {
		const task = new ObservedTask(
			this.stateObserver,
			taskDescription,
		);
		return task;
	}

	override addTask(taskDescription: string): ObservedTask {
		const task = this.createNewTask(taskDescription);
		this.tasks.push(task);
		this.stateObserver.onStateChange();
		return task;
	}
}

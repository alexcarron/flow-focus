import TasksManager from "../../model/TasksManager";
import TasksManagerState from "../../model/TasksManagerState";
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
			this,
			taskDescription,
			this.stateObserver,
		);
		return task;
	}

	override addTask(taskDescription: string): ObservedTask {
		const task = this.createNewTask(taskDescription);
		this.tasks.push(task);
		this.stateObserver.onStateChange();
		return task;
	}

	override async restoreState(tasksManagerState: TasksManagerState): Promise<void> {
		return super.restoreState(tasksManagerState).then(() => {
			this.stateObserver.onStateChange();
		});
	}
}

import Task from "../../model/Task";
import TasksManager from "../../model/TasksManager";
import PersistenceManager from '../persistence-managers/PersistenceManager';

export default class PersistentTasksManager extends TasksManager {
	private persistenceManager: PersistenceManager<TasksManager>;

	public constructor(persistenceManager: PersistenceManager<TasksManager>) {
		super();
		this.persistenceManager = persistenceManager;

		try {
			this.persistenceManager.loadObject(this);
		}
		catch (error) {
			console.error("Error loading tasks manager: ", error);
		}
	}

	override addTask(task: Task) {
		super.addTask(task);
		this.persistenceManager.saveObject(this);
	}
}

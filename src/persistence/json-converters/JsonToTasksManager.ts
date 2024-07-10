import TasksManager from '../../model/TasksManager';
import JsonToObjectConverter from "./JsonToObjectConverter";
import JsonToTask from './JsonToTask';

export default class JsonToTasksManager implements JsonToObjectConverter<TasksManager> {
	/**
	 * Converts a JSON object into a TasksManager instance.
	 *
	 * @param {object} jsonObject - The JSON object to convert.
	 * @return {TasksManager} The TasksManager instance created from the JSON object.
	 * @throws {Error} If the JSON object is not an array.
	 */
	convertJsonToObject(jsonObject: object): TasksManager {
		const tasksManager = new TasksManager();

		if (!('tasks' in jsonObject)) {
			throw new Error('TasksManager JSON object does not have a "tasks" property');
		}

		if (!Array.isArray(jsonObject.tasks)) {
			throw new Error('TasksManager JSON object "tasks" property is not an array');
		}

		jsonObject.tasks.forEach((jsonTaskObject: any) => {
			const task = new JsonToTask().convertJsonToObject(jsonTaskObject);
			tasksManager.addTask(task);
		});

		return tasksManager;
	}
}
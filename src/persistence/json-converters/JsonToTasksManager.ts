import Task from '../../model/task/Task';
import TasksManager from '../../model/TasksManager';
import ObservedTasksManager from '../peristent-objects/ObservedTasksManager';
import StateObserver from '../peristent-objects/StateObserver';
import JsonSerializer from "./JsonToObservableConverter";

export default class JsonToTasksManager implements JsonSerializer<TasksManager> {
	private static readonly stateObserverPropertyName = 'stateObserver';

	private isIsoDateString(value: any): boolean {
		if (typeof value !== 'string') {
			return false;
		}

		const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

		if (!dateRegex.test(value)) {
			return false;
		}

		try {
			const date = new Date(value);

			if (isNaN(date.getTime())) {
				return false;
			}

			return true;
		}
		catch (error) {
			return false;
		}
	}

	private assignWithDateConversion(target: any, ...sources: any[]): any {
		sources.forEach(source => {
			Object.keys(source).forEach(key => {
				const value = source[key];
				if (this.isIsoDateString(value)) {
					target[key] = new Date(value);
				} else {
					target[key] = value;
				}
			});
		});
		return target;
	}

	/**
	 * Converts a JSON object into a TasksManager instance.
	 *
	 * @param {object} jsonObject - The JSON object to convert.
	 * @return {TasksManager} The TasksManager instance created from the JSON object.
	 * @throws {Error} If the JSON object is not an array.
	 */
	convertJsonToObject(jsonObject: object, stateObserver: StateObserver): TasksManager {
		const tasksManager = new ObservedTasksManager(
			stateObserver
		);

		if (!('tasks' in jsonObject)) {
			throw new Error('TasksManager JSON object does not have a "tasks" property');
		}

		if (!Array.isArray(jsonObject.tasks)) {
			throw new Error('TasksManager JSON object "tasks" property is not an array');
		}

		jsonObject.tasks.forEach((jsonTaskObject: object) => {

			if (
				!('description' in jsonTaskObject) ||
				typeof jsonTaskObject.description !== 'string'
			) {
				throw new Error('Task JSON object is missing string description property');
			}

			const task = tasksManager.addTask(jsonTaskObject.description);
			this.assignWithDateConversion(task, jsonTaskObject);

			// Check if jsonTaskObject has object stepsToStatusMap property
			if (
				!('steps' in jsonTaskObject) &&
				'stepsToStatusMap' in jsonTaskObject &&
				Array.isArray(jsonTaskObject.stepsToStatusMap)
			) {
				task.setStepsToStatusMap(jsonTaskObject.stepsToStatusMap);
			}

			if (
				'steps' in jsonTaskObject &&
				Array.isArray(jsonTaskObject.steps)
			) {
				const stepsToStatusObject: Array<[string, string]> = [];
				jsonTaskObject.steps.forEach((step: string) => {
					if (
						'isComplete' in jsonTaskObject &&
						typeof jsonTaskObject.isComplete === 'boolean' &&
						jsonTaskObject.isComplete
					) {
						stepsToStatusObject.push([step, 'Completed']);
					}
					else {
						stepsToStatusObject.push([step, 'Uncomplete']);
					}
				})

				task.setStepsToStatusMap(stepsToStatusObject);
			}

			// Check if task is recurring and if so, check if we passed it's interval end time
			if (task.isRecurring()) {
				if (task.isPastIntervalEndTime(new Date())) {
					task.onPastIntervalEndTime(new Date());
				}
			}

			return task;
		});

		return tasksManager;
	}

	private static createReplacer(excludeKey: string) {
		return function (key: string, value: any): any {
			if (key === excludeKey) {
				return undefined; // Exclude this property
			}

			if (value instanceof Map) {
        // Convert Map to an array of key-value pairs
        return Array.from(value.entries())
			}

			return value;
		}
	}

	/**
	 * Converts a TasksManager instance into a JSON object.
	 *
	 * @param {TasksManager} tasksManager - The TasksManager instance to convert.
	 * @return {object} The JSON object created from the TasksManager instance.
	 */
	convertObjectToJson(tasksManager: TasksManager): object {
		const replacer = JsonToTasksManager.createReplacer(JsonToTasksManager.stateObserverPropertyName);
		const object = JSON.parse(JSON.stringify(tasksManager, replacer));

		const tasks: {[key: string]: any}[] = [];

		object.tasks.forEach((task: {[key: string]: any} ) => {
			const resultTask: {[key: string]: any} = {};

			Object.keys(task).forEach(key => {
				if (key !== JsonToTasksManager.stateObserverPropertyName) {
					resultTask[key] = task[key];
				}
			});

			tasks.push(resultTask);
		})

		return {tasks}
	}
}
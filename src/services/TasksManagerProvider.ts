import { Injectable } from '@angular/core';
import TasksManager from '../model/TasksManager';
import JsonToTasksManager from '../persistence/json-converters/JsonToTasksManager';
import LocalStorageManager from '../persistence/persistence-managers/LocalStorageManager';
import PersistentTasksManager from '../persistence/peristent-objects/PersistentTasksManager';

/**
 * Determines the persistence layer for the TasksManager and ensures that only one instance is created.
 */
@Injectable({
  providedIn: 'root'
})
export class TasksManagerProvider {
	private static instance: TasksManager;

  private constructor() {}

	private static createInstance(): TasksManager {
		const tasksManagerLocalStorage = new LocalStorageManager<TasksManager>(
			localStorage,
			"tasksManager",
			new JsonToTasksManager()
		);

		return new PersistentTasksManager(tasksManagerLocalStorage);
	}

	public static getInstance(): TasksManager {
		if (!this.instance) {
			this.instance = this.createInstance();
		}
		return this.instance;
	}
}

import { ResolveFn } from '@angular/router';
import JsonServer from '../persistence/persistence-managers/JsonServer';
import TasksManager from '../model/TasksManager';
import JsonToTasksManager from '../persistence/json-converters/JsonToTasksManager';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import PersistentTasksManager from '../persistence/peristent-objects/PersistentTasksManager';

export const tasksManagerResolver: ResolveFn<any> = async (route, state) => {
	console.log("RESOLVER TIME");
	const API_URL = "http://localhost:3000/tasksMangager";
	const httpClient = inject(HttpClient);
	const jsonToTasksManagerConverter = new JsonToTasksManager();


	console.log({API_URL, httpClient, jsonToTasksManagerConverter});

	const tasksManagerJsonServer = new JsonServer<TasksManager>(
		API_URL,
		httpClient,
		jsonToTasksManagerConverter
	);

	console.log({tasksManagerJsonServer});

	const tasksManager = new PersistentTasksManager(tasksManagerJsonServer);
	console.log({tasksManager});
	await tasksManager.load();
	console.log("loaded", tasksManager);
	return tasksManager;
};

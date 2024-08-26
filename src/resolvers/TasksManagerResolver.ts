import { ResolveFn } from '@angular/router';
import JsonServer from '../persistence/persistence-managers/JsonServer';
import TasksManager from '../model/TasksManager';
import JsonToTasksManager from '../persistence/json-converters/JsonToTasksManager';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const tasksManagerResolver: ResolveFn<any> = async (route, state) => {
	const API_URL = "https://1d89ff6b3f96df.lhr.life/tasksManager";
	const httpClient = inject(HttpClient);
	const jsonToTasksManagerConverter = new JsonToTasksManager();

	const tasksManagerJsonServer =
		new JsonServer<TasksManager>(
			API_URL,
			httpClient,
			jsonToTasksManagerConverter
		);

	console.log("Persistent Json Server Object Created in Resolver",{tasksManagerJsonServer});

	console.log("Uninitialized tasks manager created in Resolver", {tasksManager: tasksManagerJsonServer.getPersistentObject()});
	await tasksManagerJsonServer.loadObject();
	const tasksManager = tasksManagerJsonServer.getPersistentObject();
	console.log("Tasks manager loaded in Resolver", tasksManager);
	return tasksManager;
};

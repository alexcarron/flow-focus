import { ResolveFn } from '@angular/router';
// import JsonServer from '../persistence/persistence-managers/JsonServer';
import TasksManager from '../model/TasksManager';
import JsonToTasksManager from '../persistence/json-converters/JsonToTasksManager';
// import { inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
import JsonBinServer from '../persistence/persistence-managers/JsonBinServer';

export const tasksManagerResolver: ResolveFn<any> = async (route, state) => {
	// const API_URL = "http://localhost:3004/tasksMangager";
	// const httpClient = inject(HttpClient);

	const API_KEY = '$2a$10$ZfMfY0mRQNyFIXAOQiTr6ODEIIvuFmdVNWl55HNw/tPkTyXJ3gdvW';
	const BIN_ID = '66c7cfbae41b4d34e423ee52'
	const jsonToTasksManagerConverter = new JsonToTasksManager();

	const tasksManagerJsonServer =
		new JsonBinServer<TasksManager>(
			API_KEY,
			BIN_ID,
			jsonToTasksManagerConverter
		);
		// new JsonServer<TasksManager>(
		// 	API_URL,
		// 	httpClient,
		// 	jsonToTasksManagerConverter
		// );

	console.log("Persistent Json Server Object Created in Resolver",{tasksManagerJsonServer});

	console.log("Uninitialized tasks manager created in Resolver", {tasksManager: tasksManagerJsonServer.getPersistentObject()});
	await tasksManagerJsonServer.loadObject();
	const tasksManager = tasksManagerJsonServer.getPersistentObject();
	console.log("Tasks manager loaded in Resolver", tasksManager);
	return tasksManager;
};

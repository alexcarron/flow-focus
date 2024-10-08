import { Routes } from '@angular/router';
import { FocusPageComponent } from './focus-page/focus-page.component';
import { tasksManagerResolver } from '../resolvers/TasksManagerResolver';
import { TasksManagerComponent } from './tasks-manager/tasks-manager.component';
import { TaskCreatorComponent } from './task-creator/task-creator.component';

export const routes: Routes = [
	{
		path: '', component: FocusPageComponent,
		resolve: { tasksManager: tasksManagerResolver }
	},
	{
		path: 'tasks', component: TasksManagerComponent,
		resolve: { tasksManager: tasksManagerResolver }
	},
	{
		path: 'create-task', component: TaskCreatorComponent,
		resolve: { tasksManager: tasksManagerResolver }
	},
];

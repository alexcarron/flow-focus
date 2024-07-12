import { Routes } from '@angular/router';
import { FocusPageComponent } from './focus-page/focus-page.component';
import { tasksManagerResolver } from '../resolvers/TasksManagerResolver';

export const routes: Routes = [
	{
		path: '', component: FocusPageComponent,
		resolve: { tasksManager: tasksManagerResolver }
	},
];

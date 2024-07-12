import { Component } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'focus-page',
  standalone: true,
  imports: [TaskComponent],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.css'
})
export class FocusPageComponent {
	tasksManager!: TasksManager;

	constructor(private activatedRoute: ActivatedRoute) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];
	}

	getNextTask() {
		return this.tasksManager.getNextTask();
	}
}

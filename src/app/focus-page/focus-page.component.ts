import { Component } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'focus-page',
  standalone: true,
  imports: [TaskComponent, CommonModule],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.css'
})
export class FocusPageComponent {
	tasksManager!: TasksManager;

	constructor(private activatedRoute: ActivatedRoute) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];

		setInterval(() => {
			this.tasksManager.update(new Date());
		}, 1000);
	}

	getNextTask() {
		const currentTime = new Date();
		return this.tasksManager.getPriorityTask(currentTime);
	}
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import TasksManager from '../../model/TasksManager';
import Task from '../../model/task/Task';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tasks-manager',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './tasks-manager.component.html',
  styleUrl: './tasks-manager.component.css'
})
export class TasksManagerComponent {
	tasksManager!: TasksManager;

	constructor(
		private activatedRoute: ActivatedRoute
	) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];
	}

	getTasks(): Task[] {
		return this.tasksManager.getTasks();
	}
}

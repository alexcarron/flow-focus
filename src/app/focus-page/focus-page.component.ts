import { Component } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';
import Task from '../../model/Task';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

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

	addRandomTask() {
		console.log(this.activatedRoute);
		this.tasksManager.addTask(new Task(Math.random().toString()));
	}

	displayLocalStorage() {
		console.log(localStorage.getItem("tasksManager"));
	}
}

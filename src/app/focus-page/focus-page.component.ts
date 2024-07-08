import { Component } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';
import DeadlineTask from '../../model/DeadlineTask';
import Task from '../../model/Task';

@Component({
  selector: 'focus-page',
  standalone: true,
  imports: [TaskComponent],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.css'
})
export class FocusPageComponent {
	tasksManager: TasksManager = TasksManager.getInstance();
	task: Task = new DeadlineTask("Task Description", new Date(2024, 9,9));

	ngOnInit() {
		this.task.addStep("Step 1");
		this.task.addStep("Step 2");
		this.task.addStep("Step 3");

		this.tasksManager.addTask(this.task);
	}
}

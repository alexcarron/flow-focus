import { Component } from '@angular/core';
import { TaskComponent } from './task/task.component';
import TasksManager from '../../model/TasksManager';

@Component({
  selector: 'focus-page',
  standalone: true,
  imports: [TaskComponent],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.css'
})
export class FocusPageComponent {
	tasksManager: TasksManager = TasksManager.getInstance();
}

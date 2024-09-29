import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import TasksManager from '../../model/TasksManager';
import Task from '../../model/task/Task';
import { FormsModule } from '@angular/forms';
import { DateFormatterPipe } from '../../pipes/DateFormatter.pipe';
import Duration from '../../model/time-management/Duration';

@Component({
  selector: 'app-tasks-manager',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, DateFormatterPipe],
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
		return this.tasksManager.getTasksInPriorityOrder(new Date());
	}

	getCurrentTime(): Date {
		return new Date();
	}

	getDurationRangeStrings(startMilliseconds: number, endMilliseconds: number) {
		const startDuration = Duration.fromMilliseconds(startMilliseconds)
		const endDuration = Duration.fromMilliseconds(endMilliseconds)
		return Duration.getDurationRangeStrings(startDuration, endDuration);
	}

	toDurationString(milliseconds: number) {
		const duration = Duration.fromMilliseconds(milliseconds);
		const amount = duration.getAmountOfUnits();
		if (amount === 1)
			return duration.getTimeUnit().name.slice(0, -1);

		return `${amount} ${duration.getTimeUnit().name}`
	}
}

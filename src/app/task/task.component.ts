import { Component, Input } from '@angular/core';
import Task from '../../model/Task';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'task',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task.component.html',
  styleUrl: './task.component.css'
})
export class TaskComponent {
	@Input() task!: Task;

	getDescription(): string {
		return "Task Description"
	}

	hasSteps(): boolean {
		return true
	}

	getNextStep(): string {
		return "Next step";
	}

	hasUpcomingDeadline(): boolean {
		return true;
	}

	getTimeLeft(): string {
		return `5 minutes left`;
	}

	isOptional(): boolean {
		return true;
	}

	skip() {
		console.log("skipped task")
	}

	complete() {
		console.log("completed task")
	}

	onDescriptionChange(event: Event) {
		console.log("description changed")
	}

	onNextStepChange(event: Event) {
		console.log("step changed")
	}
}

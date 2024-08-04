import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandHistoryService } from '../../services/CommandHistory.service';
import { RouterModule } from '@angular/router';
import { DurationInputComponent } from '../input-controls/duration-input/duration-input.component';

@Component({
  selector: 'task-creator',
  standalone: true,
  imports: [CommonModule, RouterModule, DurationInputComponent],
  templateUrl: './task-creator.component.html',
  styleUrl: './task-creator.component.css'
})
export class TaskCreatorComponent {
	private static readonly URGENT_MILLISECONDS_LEFT = 1000 * 60 * 60 * 5;
	name: string | null = null;
	step: string | null = null;

	constructor(
		private commandHistory: CommandHistoryService
	) {}

	ngOnInit() {}

	onNameChange(event: Event) {
		const element = event.target as HTMLHeadingElement;
		this.name = element.textContent ?? null;

		// Check if string is empty
		if (this.name?.trim() === "") {
			this.name = null;
		}
	}

	onStepChange(event: Event) {
		const element = event.target as HTMLHeadingElement;
		this.step = element.textContent ?? null;

		// Check if string is empty
		if (this.step?.trim() === "") {
			this.step = null;
		}
	}

	confirmName() {}
	confirmStep() {}
}

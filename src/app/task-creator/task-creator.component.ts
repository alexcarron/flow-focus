import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandHistoryService } from '../../services/CommandHistory.service';
import { RouterModule } from '@angular/router';
import { DurationInputComponent } from '../input-controls/duration-input/duration-input.component';
import { DatetimePopupComponent } from '../focus-page/task/datetime-popup/datetime-popup.component';
import { DatetimeInputComponent } from '../input-controls/timedate-input/datetime-input.component';
import { TextInputComponent } from '../input-controls/text-input/text-input.component';

@Component({
  selector: 'task-creator',
  standalone: true,
  imports: [CommonModule, RouterModule, DurationInputComponent, DatetimeInputComponent, TextInputComponent],
  templateUrl: './task-creator.component.html',
  styleUrl: './task-creator.component.css'
})
export class TaskCreatorComponent {
	name: string | null = null;
	step: string | null = null;

	constructor(
		private commandHistory: CommandHistoryService
	) {}

	ngOnInit() {}

	onNameChange(description: string | null) {
		console.log({description});
	}

	onStepChange(nextStep: string | null) {
		console.log({nextStep});
	}

	onDurationChange(durationInMilliseconds: number | null) {
		console.log({durationInMilliseconds});
	}

	onDeadlineChange(deadline: Date | null) {
		console.log({deadline});
	}

	onStartTimeChange(startTime: Date | null) {
		console.log(startTime);
	}

	confirmName() {}
	confirmStep() {}
}

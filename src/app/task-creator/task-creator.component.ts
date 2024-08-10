import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandHistoryService } from '../../services/CommandHistory.service';
import { RouterModule } from '@angular/router';
import { DurationInputComponent } from '../input-controls/duration-input/duration-input.component';
import { DatetimePopupComponent } from '../focus-page/task/datetime-popup/datetime-popup.component';
import { DatetimeInputComponent } from '../input-controls/timedate-input/datetime-input.component';
import { TextInputComponent } from '../input-controls/text-input/text-input.component';
import { CheckboxInputComponent } from '../input-controls/checkbox-input/checkbox-input.component';

@Component({
  selector: 'task-creator',
  standalone: true,
  imports: [CommonModule, RouterModule, DurationInputComponent, DatetimeInputComponent, TextInputComponent, CheckboxInputComponent],
  templateUrl: './task-creator.component.html',
  styleUrl: './task-creator.component.css'
})
export class TaskCreatorComponent {
	name: string | null = null;
	steps: string[] = [];
	nextStep: string | null = null;
	startTime: Date | null = null;
	deadline: Date | null = null;
	minDuration: number | null = null;
	maxDuration: number | null = null;
	repeatInterval: number | null = null;
	isMandatory: boolean = false;

	constructor(
		private commandHistory: CommandHistoryService
	) {}

	trackStepByIndex(index: number, step: string): number {
		return index;
	}

	onNameChange(description: string | null) {
		this.name = description;
	}

	onStepChange(step: string | null, stepIndex: number) {
		this.steps[stepIndex] = step ?? '';
	}

	deleteStep(stepIndex: number) {
		this.steps.splice(stepIndex, 1);

		const stepElements = document.getElementsByClassName('task-step-input') as HTMLCollectionOf<HTMLElement>;

		for (let i = 0; i < stepElements.length; i++) {
			const stepElement = stepElements[i];
			stepElement.textContent = this.steps[i] ?? '';
		}
	}

	onNextStepChange(nextStep: string | null) {
		this.nextStep = nextStep;
	}
	onNextStepKeydown(event: KeyboardEvent) {
		const keyName = event.key;
		if (keyName === 'Enter') {
			this.confirmStep();
		}
	}
	confirmStep() {
		if (this.nextStep === null) {
			return;
		}

		this.steps.push(this.nextStep);
		this.nextStep = null;

		const taskNextStepInput = document.getElementById('taskNextStep') as HTMLInputElement;
		taskNextStepInput.textContent = '';
		taskNextStepInput.focus();
	}

	onMinDurationChange(minDurationInMilliseconds: number | null) {
		this.minDuration = minDurationInMilliseconds;
	}

	onMaxDurationChange(maxDurationInMilliseconds: number | null) {
		this.maxDuration = maxDurationInMilliseconds;
	}

	onStartTimeChange(startTime: Date | null) {
		this.startTime = startTime;
	}

	onDeadlineChange(deadline: Date | null) {
		this.deadline = deadline;
	}

	onRepeatChange(repeatInterval: number | null) {
		this.repeatInterval = repeatInterval;
	}

	onMandatoryChange(isMandatory: boolean) {
		this.isMandatory = isMandatory;
	}

	private hasNeededInputs(): boolean {
		const hasName = this.name !== null;
		const hasValidSteps = this.steps.every(step =>
			step !== '' && step !== null
		);

		return hasName && hasValidSteps;
	}

	createTask() {
		if (!this.hasNeededInputs()) {
			return;
		}
	}
}

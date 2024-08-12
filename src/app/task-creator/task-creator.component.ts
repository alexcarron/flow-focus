import { Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandHistoryService } from '../../services/CommandHistory.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DurationInputComponent } from '../input-controls/duration-input/duration-input.component';
import { DatetimePopupComponent } from '../focus-page/task/datetime-popup/datetime-popup.component';
import { DatetimeInputComponent } from '../input-controls/timedate-input/datetime-input.component';
import { TextInputComponent } from '../input-controls/text-input/text-input.component';
import { CheckboxInputComponent } from '../input-controls/checkbox-input/checkbox-input.component';
import InputControlComponent from '../input-controls/InputControlComponent';
import TasksManager from '../../model/TasksManager';
import Task from '../../model/task/Task';
import { TaskTimingOptionsInputComponent } from '../input-controls/task-timing-options-input/task-timing-options-input.component';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';

@Component({
  selector: 'task-creator',
  standalone: true,
  imports: [CommonModule, RouterModule, DurationInputComponent, DatetimeInputComponent, TextInputComponent, CheckboxInputComponent, TaskTimingOptionsInputComponent],
  templateUrl: './task-creator.component.html',
  styleUrl: './task-creator.component.css'
})
export class TaskCreatorComponent {
	@ViewChild('taskDescriptionInput') taskDescriptionInput!: TextInputComponent;
	@ViewChildren('taskStepInput') taskStepInputs: QueryList<TextInputComponent> | undefined;
	@ViewChild('taskNextStepInput') taskNextStepInput!: TextInputComponent;
	@ViewChild('taskTimingOptionsInput') taskTimingOptionsInput!: TaskTimingOptionsInputComponent;

	tasksManager!: TasksManager;

	name: string | null = null;
	steps: string[] = [];
	nextStep: string | null = null;
	startTime: Date | null = null;
	deadline: Date | null = null;
	minDuration: number | null = null;
	maxDuration: number | null = null;
	repeatInterval: number | null = null;
	isMandatory: boolean = false;
	hasRepeatInterval: boolean = false;

	constructor (
		private activatedRoute: ActivatedRoute,
	) {}

	ngOnInit() {
		this.tasksManager = this.activatedRoute.snapshot.data['tasksManager'];
	}

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

		const taskNextStepInput = this.taskNextStepInput.hostElement as HTMLInputElement;
		taskNextStepInput.textContent = '';
		taskNextStepInput.focus();

	}


	onTimingOptionsChange(timingOptions: TaskTimingOptions) {
		this.startTime = timingOptions.startTime;
		this.deadline = timingOptions.deadline;
		this.minDuration = timingOptions.minDuration;
		this.maxDuration = timingOptions.maxDuration;
		this.repeatInterval = timingOptions.repeatInterval;
		this.isMandatory = timingOptions.isMandatory;
		this.hasRepeatInterval = timingOptions.repeatInterval !== null;
	}

	private hasNeededInputs(): boolean {
		const hasName = this.name !== null;
		const hasValidSteps = this.steps.every(step =>
			step !== '' && step !== null
		);

		console.log({
			hasName,
			hasValidSteps
		});

		return hasName && hasValidSteps;
	}

	onCreateTaskButton() {
		if (!this.hasNeededInputs()) {
			return;
		}

		this.createTask();

		this.clearValues();
		this.clearInputComponents();
	}

	createTask() {
		const task = this.tasksManager.addTask(this.name!);

		task.editSteps(this.steps);

		if (this.startTime) task.setEarliestStartTime(this.startTime);
		if (this.deadline) task.setDeadline(this.deadline);

		if (this.minDuration) task.setMinRequiredTime(this.minDuration);
		if (this.maxDuration) task.setMaxRequiredTime(this.maxDuration);

		if (this.repeatInterval) task.makeRecurring(
			this.repeatInterval,
			this.startTime ?? new Date(),
		);

		task.setMandatory(this.isMandatory);
	}

	clearValues() {
		this.name = null;
		this.steps = [];
		this.nextStep = null;
		this.startTime = null;
		this.deadline = null;
		this.minDuration = null;
		this.maxDuration = null;
		this.repeatInterval = null;
		this.isMandatory = false;
		this.hasRepeatInterval = false;
	}

	clearInputComponents() {
		const allInputComponents = [
			this.taskDescriptionInput,
			this.taskNextStepInput,
			this.taskTimingOptionsInput,
		];

		this.taskStepInputs?.forEach(inputComponent => {
			allInputComponents.push(inputComponent);
		})

		for (const inputComponent of allInputComponents) {
			inputComponent.clearInput();
		}
	}
}

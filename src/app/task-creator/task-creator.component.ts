import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DurationInputComponent } from '../input-controls/duration-input/duration-input.component';
import { DatetimeInputComponent } from '../input-controls/timedate-input/datetime-input.component';
import { TextInputComponent } from '../input-controls/text-input/text-input.component';
import { CheckboxInputComponent } from '../input-controls/checkbox-input/checkbox-input.component';
import TasksManager from '../../model/TasksManager';
import { TaskTimingOptionsInputComponent } from '../input-controls/task-timing-options-input/task-timing-options-input.component';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import { ArrayInputComponent } from '../input-controls/array-input/array-input.component';

@Component({
  selector: 'task-creator',
  standalone: true,
  imports: [CommonModule, RouterModule, DurationInputComponent, DatetimeInputComponent, TextInputComponent, CheckboxInputComponent, TaskTimingOptionsInputComponent, ArrayInputComponent],
  templateUrl: './task-creator.component.html',
  styleUrl: './task-creator.component.css'
})
export class TaskCreatorComponent {
	@ViewChild('taskDescriptionInput') taskDescriptionInput!: TextInputComponent;
	@ViewChild('taskCreatedStepsInput') taskCreatedStepsInput!: ArrayInputComponent;
	@ViewChild('taskNextStepInput') taskNextStepInput!: TextInputComponent;
	@ViewChild('taskTimingOptionsInput') taskTimingOptionsInput!: TaskTimingOptionsInputComponent;

	private static readonly DEFAULT_DURATION = 1000 * 60 * 30;

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
		this.minDuration = TaskCreatorComponent.DEFAULT_DURATION;
		this.maxDuration = TaskCreatorComponent.DEFAULT_DURATION;
	}

	getDefaultTimingOptions(): TaskTimingOptions {
		return {
			startTime: null,
			endTime: null,
			deadline: null,
			minDuration: TaskCreatorComponent.DEFAULT_DURATION,
			maxDuration: TaskCreatorComponent.DEFAULT_DURATION,
			repeatInterval: null,
			isMandatory: false
		};
	}

	onNameChange(description: string | null) {
		this.name = description;
	}

	onCreatedStepsChange(steps: string[]) {
		this.steps = steps;
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

		this.taskDescriptionInput.clearInput();
		this.taskNextStepInput.clearInput();

		this.name = null;
		this.steps = [];
		this.nextStep = null;
	}

	createTask() {
		const task = this.tasksManager.addCreatedTask(this.name!);

		task.editSteps(this.steps);

		if (this.startTime) task.setStartTime(this.startTime);
		if (this.deadline) task.setDeadline(this.deadline);

		if (this.minDuration) task.setMinRequiredTime(this.minDuration);
		if (this.maxDuration) task.setMaxRequiredTime(this.maxDuration);

		if (this.repeatInterval) task.makeRecurring(
			this.repeatInterval,
			this.startTime ?? new Date(),
		);

		task.setMandatory(this.isMandatory);
	}

	clearAll() {
		this.clearInputComponents();
		this.clearValues();
	}

	clearValues() {
		this.name = null;
		this.steps = [];
		this.nextStep = null;
		this.startTime = null;
		this.deadline = null;
		this.minDuration = TaskCreatorComponent.DEFAULT_DURATION;
		this.maxDuration = TaskCreatorComponent.DEFAULT_DURATION;
		this.repeatInterval = null;
		this.isMandatory = false;
		this.hasRepeatInterval = false;
	}

	clearInputComponents() {
		const allInputComponents = [
			this.taskDescriptionInput,
			this.taskCreatedStepsInput,
			this.taskNextStepInput,
			this.taskTimingOptionsInput,
		];


		for (const inputComponent of allInputComponents) {
			inputComponent.clearInput();
		}

		this.taskTimingOptionsInput.setValue(this.getDefaultTimingOptions());
	}
}

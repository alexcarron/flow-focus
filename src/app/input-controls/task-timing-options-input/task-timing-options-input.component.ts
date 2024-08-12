import { Component, EventEmitter, Output, Input, ViewChild } from '@angular/core';
import InputControlComponent from '../InputControlComponent';
import TaskTimingOptions from '../../../model/task/TaskTimingOptions';
import { CheckboxInputComponent } from '../checkbox-input/checkbox-input.component';
import { DatetimeInputComponent } from '../timedate-input/datetime-input.component';
import { DurationInputComponent } from '../duration-input/duration-input.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'task-timing-options-input',
  standalone: true,
  imports: [CommonModule, DatetimeInputComponent, DurationInputComponent, CheckboxInputComponent],
  templateUrl: './task-timing-options-input.component.html',
  styleUrl: './task-timing-options-input.component.css'
})
export class TaskTimingOptionsInputComponent implements InputControlComponent<TaskTimingOptions> {
	@ViewChild('startTimeInput') startTimeInput!: DatetimeInputComponent;
	@ViewChild('deadlineInput') deadlineInput!: DatetimeInputComponent;
	@ViewChild('minDurationInput') minDurationInput!: DurationInputComponent;
	@ViewChild('maxDurationInput') maxDurationInput!: DurationInputComponent;
	@ViewChild('hasRepeatIntervalInput') hasRepeatIntervalInput!: CheckboxInputComponent;
	@ViewChild('repeatIntervalInput') repeatIntervalInput!: DurationInputComponent;
	@ViewChild('mandatoryInput') mandatoryInput!: CheckboxInputComponent;

	@Input() initialValue: TaskTimingOptions | null = null;
	@Output() onInputChange = new EventEmitter<TaskTimingOptions>();
	startTime: Date | null = null;
	deadline: Date | null = null;
	minDuration: number | null = null;
	maxDuration: number | null = null;
	hasRepeatInterval: boolean = false;
	repeatInterval: number | null = null;
	isMandatory: boolean = false;

	ngOnInit(): void {
		if (this.initialValue) {
			this.startTime = this.initialValue.startTime;
			this.deadline = this.initialValue.deadline;
			this.minDuration = this.initialValue.minDuration;
			this.maxDuration = this.initialValue.maxDuration;
			this.hasRepeatInterval = this.initialValue.repeatInterval !== null;
			this.repeatInterval = this.initialValue.repeatInterval;
			this.isMandatory = this.initialValue.isMandatory;

			console.log({
				initialValue: this.initialValue,
				startTime: this.startTime,
				deadline: this.deadline,
				minDuration: this.minDuration,
				maxDuration: this.maxDuration,
				hasRepeatInterval: this.hasRepeatInterval,
				repeatInterval: this.repeatInterval,
				isMandatory: this.isMandatory
			})
		}
	}

	onMinDurationChange(minDurationInMilliseconds: number | null) {
		this.minDuration = minDurationInMilliseconds;
		this.onInput();
	}

	onMaxDurationChange(maxDurationInMilliseconds: number | null) {
		this.maxDuration = maxDurationInMilliseconds;
		this.onInput();
	}

	onStartTimeChange(startTime: Date | null) {
		this.startTime = startTime;
		this.onInput();
	}

	onDeadlineChange(deadline: Date | null) {
		this.deadline = deadline;
		this.onInput();
	}

	onRepeatChange(repeatInterval: number | null) {
		this.repeatInterval = repeatInterval;
		this.onInput();
	}

	onMandatoryChange(isMandatory: boolean) {
		this.isMandatory = isMandatory;
		this.onInput();
	}

	onHasRepeatIntervalChange(hasRepeatInterval: boolean) {
		if (!hasRepeatInterval) {
			this.repeatInterval = null;
		}

		this.hasRepeatInterval = hasRepeatInterval;
		this.onInput();
	}

	onInput(): void {
		this.onInputChange.emit({
			startTime: this.startTime,
			deadline: this.deadline,
			minDuration: this.minDuration,
			maxDuration: this.maxDuration,
			repeatInterval: this.repeatInterval,
			isMandatory: this.isMandatory
		});
	}

	clearInput(): void {
		this.startTime = null;
		this.deadline = null;
		this.minDuration = null;
		this.maxDuration = null;
		this.repeatInterval = null;
		this.isMandatory = false;
		this.hasRepeatInterval = false;

		const allInputComponents = [
			this.startTimeInput,
			this.deadlineInput,
			this.minDurationInput,
			this.maxDurationInput,
			this.hasRepeatIntervalInput,
			this.repeatIntervalInput,
			this.mandatoryInput,
		];

		for (const inputComponent of allInputComponents) {
			inputComponent.clearInput();
		}
	}

}

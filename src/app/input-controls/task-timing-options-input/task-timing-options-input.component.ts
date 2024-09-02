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
	@ViewChild('endTimeInput') endTimeInput!: DatetimeInputComponent;
	@ViewChild('deadlineInput') deadlineInput!: DatetimeInputComponent;
	@ViewChild('minDurationInput') minDurationInput!: DurationInputComponent;
	@ViewChild('maxDurationInput') maxDurationInput!: DurationInputComponent;
	@ViewChild('hasRepeatIntervalInput') hasRepeatIntervalInput!: CheckboxInputComponent;
	@ViewChild('repeatIntervalInput') repeatIntervalInput: DurationInputComponent | undefined;
	@ViewChild('mandatoryInput') mandatoryInput!: CheckboxInputComponent;

	@Input() initialValue: TaskTimingOptions | null = null;
	@Output() onInputChange = new EventEmitter<TaskTimingOptions>();
	private static readonly DEFAULT_VALUE: TaskTimingOptions = {
		startTime: null,
		endTime: null,
		deadline: null,
		minDuration: null,
		maxDuration: null,
		repeatInterval: null,
		isMandatory: false

	}
	enteredValue: TaskTimingOptions = TaskTimingOptionsInputComponent.DEFAULT_VALUE;
	hasRepeatInterval: boolean = false;

	ngOnInit(): void {
		if (this.initialValue) {
			this.enteredValue = this.initialValue;
			this.hasRepeatInterval = this.initialValue.repeatInterval !== null;
		}
	}

	onMinDurationChange(minDurationInMilliseconds: number | null) {
		this.enteredValue.minDuration = minDurationInMilliseconds;
		this.enteredValue.maxDuration = minDurationInMilliseconds;
		this.maxDurationInput.setValue(minDurationInMilliseconds);

		this.onInput();
	}

	onMaxDurationChange(maxDurationInMilliseconds: number | null) {
		this.enteredValue.maxDuration = maxDurationInMilliseconds;
		this.onInput();
	}

	onStartTimeChange(startTime: Date | null) {
		this.enteredValue.startTime = startTime;
		this.onInput();
	}

	onEndTimeChange(endTime: Date | null) {
		this.enteredValue.endTime = endTime;
		this.onInput();
	}

	onDeadlineChange(deadline: Date | null) {
		this.enteredValue.deadline = deadline;
		this.onInput();
	}

	onRepeatChange(repeatInterval: number | null) {
		this.enteredValue.repeatInterval = repeatInterval;
		this.onInput();
	}

	onMandatoryChange(isMandatory: boolean) {
		this.enteredValue.isMandatory = isMandatory;
		this.onInput();
	}

	onHasRepeatIntervalChange(hasRepeatInterval: boolean) {
		if (!hasRepeatInterval) {
			this.enteredValue.repeatInterval = null;
		}

		this.hasRepeatInterval = hasRepeatInterval;
		this.onInput();
	}

	setValue(value: TaskTimingOptions | null): void {
		if (value === null) {
			this.clearInput();
		}
		else {
			this.startTimeInput.setValue(value.startTime);
			this.endTimeInput.setValue(value.endTime);
			this.deadlineInput.setValue(value.deadline);
			this.minDurationInput.setValue(value.minDuration);
			this.maxDurationInput.setValue(value.maxDuration);
			this.hasRepeatIntervalInput.setValue(value.repeatInterval !== null);
			this.repeatIntervalInput?.setValue(value.repeatInterval);
			this.mandatoryInput.setValue(value.isMandatory);
		}

		this.onInput();
	}

	onInput(): void {
		this.onInputChange.emit(this.enteredValue);
	}

	clearInput(): void {
		this.enteredValue = TaskTimingOptionsInputComponent.DEFAULT_VALUE;

		const allInputComponents: InputControlComponent<any>[] = [
			this.startTimeInput,
			this.endTimeInput,
			this.deadlineInput,
			this.minDurationInput,
			this.maxDurationInput,
			this.hasRepeatIntervalInput,
			this.mandatoryInput,
		];

		if (this.repeatIntervalInput !== undefined)
			allInputComponents.push(this.repeatIntervalInput);

		for (const inputComponent of allInputComponents) {
			inputComponent.clearInput();
		}
	}

}

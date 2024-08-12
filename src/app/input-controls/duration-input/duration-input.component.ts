import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NumberInputComponent } from '../number-input/number-input.component';
import { SelectInputComponent } from '../select-input/select-input.component';
import InputControlComponent from '../InputControlComponent';
import Duration from '../../../model/time-management/Duration';
import { TimeUnitName } from '../../../model/time-management/StandardTimeUnit';

@Component({
  selector: 'duration-input',
  standalone: true,
  imports: [NumberInputComponent, SelectInputComponent],
  templateUrl: './duration-input.component.html',
  styleUrl: './duration-input.component.css'
})
export class DurationInputComponent implements InputControlComponent<number | null> {
	@ViewChild('durationValueInput') durationValueInput!: NumberInputComponent;
	@ViewChild('durationUnitInput') durationUnitInput!: SelectInputComponent<string>;

	@Input() initialValue: number | null = null;
	@Input() initialUnit: string | null = null;
	@Output() onInputChange = new EventEmitter<number | null>();
	timeValue: number | null = null;
	unit: string | null = 'Seconds';

	public readonly unitOptions: Map<string, string> =
		new Map<string, string>(
			Object.entries(TimeUnitName)
				.map(([key, value]) => [value, value])
		);

	ngOnInit() {
		if (this.initialValue) {
			const initialDuration = Duration.fromMilliseconds(this.initialValue);
			this.timeValue = initialDuration.getAmountOfUnits();
			this.unit = initialDuration.getTimeUnit().name;

			console.log({
				initialValue: this.initialValue,
				initialDuration: initialDuration,
				timeValue: this.timeValue,
				unit: this.unit
			});
		}
	}

	onTimeValueChange(timeValue: number | null) {
		this.timeValue = timeValue;

		this.onInput();
	}

	onUnitChange(unit: string | null) {
		this.unit = unit;

		this.onInput();
	}

	onInput() {
		if (this.timeValue !== null && this.unit !== null) {
			const durationInMilliseconds = this.convertDurationToMilliseconds(this.timeValue, this.unit);

			this.onInputChange.emit(durationInMilliseconds);
		}
		else {
			this.onInputChange.emit(null);
		}
	}

	private convertDurationToMilliseconds(timeValue: number, unit: string): number {
		switch (unit) {
			case 'Seconds':
				return timeValue * 1000;
			case 'Minutes':
				return timeValue * 1000 * 60;
			case 'Hours':
				return timeValue * 1000 * 60 * 60;
			case 'Days':
				return timeValue * 1000 * 60 * 60 * 24;
			case 'Weeks':
				return timeValue * 1000 * 60 * 60 * 24 * 7;
			case 'Months':
				return timeValue * 1000 * 60 * 60 * 24 * 30;
			case 'Years':
				return timeValue * 1000 * 60 * 60 * 24 * 365;
			default:
				return timeValue;
		}
	}


	clearInput(): void {
		this.durationValueInput.clearInput();
		this.durationUnitInput.clearInput();
	}
}

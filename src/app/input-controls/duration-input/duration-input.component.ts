import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NumberInputComponent } from '../number-input/number-input.component';
import { SelectInputComponent } from '../select-input/select-input.component';
import InputControlComponent from '../InputControlComponent';

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

	public readonly unitOptions: Map<string, string> = new Map<string, string>(Object.entries({
		seconds: 'Seconds',
		minutes: 'Minutes',
		hours: 'Hours',
		days: 'Days',
		weeks: 'Weeks',
		months: 'Months',
		years: 'Years'
	}));

	ngOnInit() {
		if (this.initialValue) {
			this.timeValue = this.initialValue / 1000;
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

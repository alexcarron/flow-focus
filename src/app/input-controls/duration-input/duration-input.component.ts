import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NumberInputComponent } from '../number-input/number-input.component';
import { SelectInputComponent } from '../select-input/select-input.component';
import InputControlComponent from '../InputControlComponent';
import Duration from '../../../model/time-management/Duration';
import { TimeUnitName, timeUnits } from '../../../model/time-management/StandardTimeUnit';

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
	@Input() initialUnit: TimeUnitName | null = null;
	@Output() onInputChange = new EventEmitter<number | null>();
	amountOfUnit: number | null = null;
	unit: TimeUnitName | null = TimeUnitName.Seconds;

	public readonly unitOptions: Map<string, string> =
		new Map<string, string>(
			Object.entries(TimeUnitName)
				.map(([key, value]) => [value, value])
		);

	ngOnInit() {
		if (this.initialValue) {
			const initialDuration = Duration.fromMilliseconds(this.initialValue);
			this.amountOfUnit = initialDuration.getAmountOfUnits();
			this.unit = initialDuration.getTimeUnit().name;
		}
	}

	onTimeValueChange(timeValue: number | null) {
		this.amountOfUnit = timeValue;

		this.onInput();
	}

	onUnitChange(unit: string | null) {
		this.unit = unit as TimeUnitName;

		this.onInput();
	}

	setValue(milliseconds: number | null) {
		if (milliseconds === null) {
			this.clearInput();
		}
		else {
			const initialDuration = Duration.fromMilliseconds(milliseconds);
			this.amountOfUnit = initialDuration.getAmountOfUnits();
			this.unit = initialDuration.getTimeUnit().name;

			this.durationUnitInput.setValue(this.unit);
			this.durationValueInput.setValue(this.amountOfUnit);
		}

		this.onInput();
	}

	incrementBy(increment: number) {
		if (this.amountOfUnit === null) this.amountOfUnit = 0;
		if (this.unit === null) this.unit = TimeUnitName.Seconds;

		this.amountOfUnit += increment;
		if (this.amountOfUnit <= 0) {
			this.amountOfUnit = 0;
			this.unit = TimeUnitName.Seconds;
		}
		this.setValue(this.amountOfUnit * timeUnits[this.unit].milliseconds);
	}

	onInput() {
		if (this.amountOfUnit !== null && this.unit !== null) {
			const unitInMilliseconds = timeUnits[this.unit].milliseconds;
			const durationInMilliseconds = this.amountOfUnit * unitInMilliseconds;

			this.onInputChange.emit(durationInMilliseconds);
		}
		else {
			this.onInputChange.emit(null);
		}
	}


	clearInput(): void {
		this.durationValueInput.clearInput();
		this.durationUnitInput.clearInput();
	}
}

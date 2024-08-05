import { Component } from '@angular/core';
import { NumberInputComponent } from '../number-input/number-input.component';
import { SelectInputComponent } from '../select-input/select-input.component';

@Component({
  selector: 'duration-input',
  standalone: true,
  imports: [NumberInputComponent, SelectInputComponent],
  templateUrl: './duration-input.component.html',
  styleUrl: './duration-input.component.css'
})
export class DurationInputComponent {
	public readonly unitOptions: Map<string, string> = new Map<string, string>(Object.entries({
		seconds: 'Seconds',
		minutes: 'Minutes',
		hours: 'Hours',
		days: 'Days',
		weeks: 'Weeks',
		months: 'Months',
		years: 'Years'
	}));

	onNumberChange(number: number | null) {

	}

	onUnitChange(unit: string | null) {

	}
}

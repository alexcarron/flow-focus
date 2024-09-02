import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import InputControlComponent from '../InputControlComponent';

@Component({
  selector: 'datetime-input',
  standalone: true,
  imports: [],
  templateUrl: './datetime-input.component.html',
  styleUrl: './datetime-input.component.css'
})
export class DatetimeInputComponent implements InputControlComponent<Date | null> {
	@Input() initialValue: Date | null = null;
	@Output() onInputChange = new EventEmitter<Date | null>();
	hostElement: HTMLElement;
	datetimeInputElement!: HTMLInputElement;

	private static readonly MORNING_HOUR = 7;
	private static readonly NIGHT_HOUR = 23;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	ngOnInit() {
		this.datetimeInputElement = this.hostElement.querySelector('input') as HTMLInputElement;

		if (this.initialValue !== null) {
			this.datetimeInputElement.setAttribute('value', this.formatDate(this.initialValue));
		}
		else {
			this.addPlaceholderClass();
		}
	}

	addPlaceholderClass() {
		this.datetimeInputElement.classList.add('placeholder-text');
	}

	removePlaceholderClass() {
		this.datetimeInputElement.classList.remove('placeholder-text');
	}

  // Method to format Date object to 'YYYY-MM-DDTHH:MM' string
  private formatDate(date: Date | null): string {
		if (date === null) {
			return '';
		}

    const pad = (n: number) => n < 10 ? '0' + n : n;

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // getMonth() is zero-based
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

	private getInputtedDate(): Date {
		const selectedDateString = this.datetimeInputElement.value;
		if (selectedDateString.trim() === "") {
			return new Date();
		}

		let date = new Date(selectedDateString);
		return date;
	}

	private setDate(date: Date) {
		this.datetimeInputElement.value = this.formatDate(date);
		this.removePlaceholderClass();
	}

	incrementDay() {
		const date = this.getInputtedDate();
		date.setDate(date.getDate() + 1);
		this.setDate(date);
		this.onInput();
	}

	decrementDay() {
		const date = this.getInputtedDate();
		date.setDate(date.getDate() - 1);
		this.setDate(date);
		this.onInput();
	}

	setMorningTime() {
		const date = this.getInputtedDate();
		date.setHours(DatetimeInputComponent.MORNING_HOUR);
		date.setMinutes(0);
		this.setDate(date);
		this.onInput();
	}

	setNightTime() {
		const date = this.getInputtedDate();
		date.setHours(DatetimeInputComponent.NIGHT_HOUR);
		date.setMinutes(0);
		this.setDate(date);
		this.onInput();
	}

	onInput() {
		const selectedDateString = this.datetimeInputElement.value;

		if (selectedDateString.trim() === "") {
			this.onInputChange.emit(null);
			this.addPlaceholderClass();
		}
		else {
			const date = new Date(selectedDateString);
			this.onInputChange.emit(date);
			this.removePlaceholderClass();
		}
	}

	clearInput(): void {
		this.datetimeInputElement.value = '';
		this.addPlaceholderClass();
	}
}

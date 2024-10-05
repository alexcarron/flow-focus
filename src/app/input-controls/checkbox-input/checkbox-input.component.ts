import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import InputControlComponent from '../InputControlComponent';

@Component({
  selector: 'checkbox-input',
  standalone: true,
  imports: [],
  templateUrl: './checkbox-input.component.html',
  styleUrl: './checkbox-input.component.css'
})
export class CheckboxInputComponent implements InputControlComponent<boolean> {
	@Input() initialValue: boolean = false;
	@Output() onInputChange = new EventEmitter<boolean>();
	private readonly hostElement: HTMLElement;
	checkboxElement!: HTMLInputElement;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	ngOnInit() {
		this.checkboxElement = this.hostElement.childNodes[0] as HTMLInputElement;

		if (this.initialValue) {
			this.checkboxElement.checked = true;
		}
	}

	setValue(value: boolean | null): void {
		if (value === null) {
			this.clearInput();
		}
		else {
			this.checkboxElement.checked = value;
		}

		this.onInput();
	}

	onInput() {
		this.onInputChange.emit(this.checkboxElement.checked);
	}

	clearInput(): void {
		this.checkboxElement.checked = false;
	}
}

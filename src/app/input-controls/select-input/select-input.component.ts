import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import InputControlComponent from '../InputControlComponent';

@Component({
  selector: 'select-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-input.component.html',
  styleUrl: './select-input.component.css'
})
export class SelectInputComponent<ValueType> implements InputControlComponent<ValueType | null> {
	@Input() placeholder: string | null = null;
	@Input() initialValue: ValueType | null = null;
	@Input() options!: Map<string, ValueType>;
	@Output() onInputChange = new EventEmitter<ValueType | null>();
	optionKeys: string[] = [];
	hostElement: HTMLElement;
	selectInputElement!: HTMLSelectElement;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	ngOnInit() {
		this.selectInputElement = this.hostElement.childNodes[0] as HTMLSelectElement;

		this.optionKeys = Array.from(this.options.keys());

		if (this.placeholder) {
			this.addPlaceholderClass();
		}

		if (this.initialValue) {
			this.selectInputElement.selectedIndex = this.optionKeys.indexOf(this.initialValue.toString());
		}
	}

	addPlaceholderClass() {
		this.selectInputElement.classList.add('placeholder-text');
	}

	removePlaceholderClass() {
		this.selectInputElement.classList.remove('placeholder-text');
	}

	onInput(event: Event) {
		const option  = this.selectInputElement.value;
		const optionValue = this.options.get(option);
		this.onInputChange.emit(optionValue);

		if (option === this.placeholder) {
			this.addPlaceholderClass();
		}
		else {
			this.removePlaceholderClass();
		}
	}

	clearInput(): void {
		this.selectInputElement.selectedIndex = 0;
		if (this.placeholder) {
			this.addPlaceholderClass();
		}
	}
}

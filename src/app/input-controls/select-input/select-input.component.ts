import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import InputControlComponent from '../InputControlComponent';
import { ShrinkToFitDirective } from '../../../directives/shrink-to-fit.directive';

@Component({
  selector: 'select-input',
  standalone: true,
  imports: [CommonModule, ShrinkToFitDirective],
  templateUrl: './select-input.component.html',
  styleUrl: './select-input.component.css'
})
export class SelectInputComponent<ValueType> implements InputControlComponent<ValueType | null> {
	@ViewChild('selectInput') selectInput!: ElementRef<HTMLElement>;

	@Input() placeholder: string | null = null;
	@Input() initialValue: ValueType | null = null;
	@Input() options!: Map<string, ValueType>;
	@Output() onInputChange = new EventEmitter<ValueType | null>();
	optionKeys: string[] = [];
	selectInputElement!: HTMLSelectElement;

	ngOnInit() {
		this.optionKeys = Array.from(this.options.keys());
	}

	ngAfterViewInit() {
		if (this.placeholder) {
			this.addPlaceholderClass();
		}

		this.selectInputElement = this.selectInput.nativeElement as HTMLSelectElement;

		if (this.initialValue) {
			this.options.forEach((value: ValueType, optionKey: string) => {
				if (value === this.initialValue) {
					const optionIndex = this.optionKeys.indexOf(optionKey);
					this.selectInputElement.selectedIndex = optionIndex
					this.selectInputElement.value = optionKey;
				}
			})
		}
	}

	addPlaceholderClass() {
		this.selectInputElement.classList.add('placeholder-text');
	}

	removePlaceholderClass() {
		this.selectInputElement.classList.remove('placeholder-text');
	}

	setValue(value: ValueType | null) {
		if (value === null) {
			this.clearInput();
			return;
		}

		this.options.forEach((optionValue: ValueType, optionKey: string) => {
			if (optionValue === value) {
				const optionIndex = this.optionKeys.indexOf(optionKey);
				this.selectInputElement.selectedIndex = optionIndex
				this.selectInputElement.value = optionKey;
			}
		});

		this.onInput();
	}

	onInput() {
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

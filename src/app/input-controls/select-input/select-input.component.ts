import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'select-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-input.component.html',
  styleUrl: './select-input.component.css'
})
export class SelectInputComponent<ValueType> {
	@Input() placeholder: string | null = null;
	@Input() options!: Map<string, ValueType>;
	@Output() onInputChange = new EventEmitter<ValueType | null>();
	selectInputElement!: HTMLSelectElement;

	ngOnInit() {
		this.selectInputElement = document.querySelector('.select-input') as HTMLSelectElement;
		this.addPlaceholderClass();
	}

	addPlaceholderClass() {
		this.selectInputElement.classList.add('placeholder-select');
	}

	removePlaceholderClass() {
		this.selectInputElement.classList.remove('placeholder-select');
	}

	onSelectChange(event: Event) {
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
}

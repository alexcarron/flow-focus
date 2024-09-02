import { Component, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import InputControlComponent from '../InputControlComponent';
import { TextInputComponent } from '../text-input/text-input.component';

@Component({
  selector: 'array-input',
  standalone: true,
  imports: [CommonModule, TextInputComponent],
  templateUrl: './array-input.component.html',
  styleUrl: './array-input.component.css'
})
export class ArrayInputComponent implements InputControlComponent<string[]> {
	@ViewChildren('itemInput') itemInputs!: QueryList<TextInputComponent> | undefined;

	@Input() initialValue: string[] | null = null;
	@Input() placeholder: string[] | string | null = null;
	@Output() onInputChange = new EventEmitter<string[]>();
	array: string[] = [];

	ngOnInit(): void {
		if (this.initialValue) {
			this.array = this.initialValue;
		}
	}

	trackStepByIndex(index: number): number {
		return index;
	}

	getPlaceholderByIndex(index: number): string | null {
		if (this.placeholder === null) {
			return null;
		}

		if (Array.isArray(this.placeholder)) {
			if (index >= 0 && index < this.placeholder.length) {
				return this.placeholder[index];
			}
			else if (this.placeholder.length > 0) {
				return this.placeholder[0];
			}
			else {
				return null;
			}
		}

		return this.placeholder;
	}

	onItemChange(item: string | null, index: number): void {
		this.array[index] = item ?? '';
		this.onInput();
	}

	deleteItem(index: number) {
		this.array.splice(index, 1);
		this.onInput();

		if (this.itemInputs === undefined) return;

		for (let itemInputIndex = 0; itemInputIndex < this.itemInputs.length; itemInputIndex++) {
			const itemInput = this.itemInputs.get(itemInputIndex);

			if (itemInput !== undefined) {
				itemInput.hostElement.textContent = this.array[itemInputIndex] ?? '';
			}

		}
	}

	onInput(): void {
		this.onInputChange.emit(this.array);
	}

	clearInput(): void {
		this.array = [];
		this.onInput();
	}

}

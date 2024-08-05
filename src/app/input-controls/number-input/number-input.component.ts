import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'number-input',
  standalone: true,
  imports: [],
  templateUrl: './number-input.component.html',
  styleUrl: './number-input.component.css'
})
export class NumberInputComponent {
	@Input() placeholder: string | null = null;
	@Output() onInputChange = new EventEmitter<number | null>();
	numberInputElement!: HTMLParagraphElement;
	inputNumber: number | null = null;
	savedRange: {
		anchorNode: Node,
		anchorOffset: number,
		focusNode: Node,
		focusOffset: number
	} | null = null;

	ngOnInit() {
		this.numberInputElement = document.querySelector('.number-input') as HTMLParagraphElement;

		// Set placeholder attribute
		if (this.placeholder)
			this.numberInputElement.setAttribute('placeholder', this.placeholder);
	}

	onInput() {
		let inputText: string | null = this.numberInputElement.textContent ?? '';

		if (inputText.trim() === "") {
			this.inputNumber = null;
			this.numberInputElement.textContent = '';
			return
		}

		if (isNaN(Number(inputText))) {
			this.numberInputElement.textContent = `${this.inputNumber ?? ''}`;
			return;
		}

		this.inputNumber = Number(inputText);
		this.onInputChange.emit(this.inputNumber);
	}

	setCaretPosition() {
		if (
			this.numberInputElement.textContent !== null &&
			this.numberInputElement.textContent !== ""
		) {
			return;
		}

		const range = document.createRange();
		const selection = window.getSelection();

		range.setStart(this.numberInputElement, 0)
		range.collapse(true)

		if (selection) {
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}

	onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
		}
		else {return;}

		let inputText: string | null = this.numberInputElement.textContent ?? null;
		let inputNumber: number | null = null;

		if (!isNaN(Number(inputText))) {
			inputNumber = Number(inputText);
		}

		if (inputNumber === null) {
			return;
		}

		if (event.key === 'ArrowUp') {
			inputNumber += 1;
		} else if (event.key === 'ArrowDown') {
			inputNumber -= 1;
		}

		this.numberInputElement.textContent = inputNumber.toString();
		this.onInput();
	}
}

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'text-input',
  standalone: true,
  imports: [],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.css'
})
export class TextInputComponent {
	@Input() placeholder: string | null = null;
	@Output() onInputChange = new EventEmitter<string | null>();
	textInputElement!: HTMLParagraphElement;

	ngOnInit() {
		this.textInputElement = document.querySelector('.text-input') as HTMLParagraphElement;

		// Set placeholder attribute
		if (this.placeholder)
			this.textInputElement.setAttribute('placeholder', this.placeholder);
	}

	onInput(event: Event) {
		let inputText: string | null = this.textInputElement.textContent ?? '';

		if (inputText.trim() === "") {
			inputText = null;
		}

		this.onInputChange.emit(inputText);
	}

	setCaretPosition(event: Event) {
		if (
			this.textInputElement.textContent !== null &&
			this.textInputElement.textContent !== ""
		) {
			return;
		}

		const range = document.createRange();
		const selection = window.getSelection();

		range.setStart(this.textInputElement, 0)
		range.collapse(true)

		if (selection) {
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}
}

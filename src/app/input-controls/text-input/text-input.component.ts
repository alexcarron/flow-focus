import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'text-input',
  standalone: true,
  imports: [],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.css',
	host: {
		'contenteditable': '',
		'(input)': 'onInput()',
		'(click)': 'setCaretPosition()',
		'(focus)': 'setCaretPosition()',
		'(keypress)': 'setCaretPosition()'
	}
})
export class TextInputComponent {
	@Input() placeholder: string | null = null;
	@Output() onInputChange = new EventEmitter<string | null>();
	private hostElement: HTMLElement;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	@HostBinding('attr.placeholder') get placeholderValue() {
		return this.placeholder;
	}

	onInput() {
		let inputText: string | null = this.hostElement.textContent ?? '';

		console.log(inputText);

		if (inputText.trim() === "") {
			inputText = null;
		}

		this.onInputChange.emit(inputText);
	}

	setCaretPosition() {
		if (
			this.hostElement.textContent !== null &&
			this.hostElement.textContent !== ""
		) {
			return;
		}

		const range = document.createRange();
		const selection = window.getSelection();

		range.setStart(this.hostElement, 0)
		range.collapse(true)

		if (selection) {
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}
}

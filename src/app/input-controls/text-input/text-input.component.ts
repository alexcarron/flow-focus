import { Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import InputControlComponent from '../InputControlComponent';

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
		'(keydown)': 'onKeyDown($event)'
	}
})
export class TextInputComponent implements InputControlComponent<string | null> {
	@Input() placeholder: string | null = null;
	@Input() initialValue: string | null = null;
	@Output() onInputChange = new EventEmitter<string | null>();
	hostElement: HTMLElement;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	@HostBinding('attr.placeholder') get placeholderValue() {
		return this.placeholder;
	}

	ngOnInit() {
		if (this.initialValue !== null) {
			this.hostElement.textContent = this.initialValue;
		}
	}

	onInput() {
		let inputText: string | null = this.hostElement.textContent ?? '';

		if (inputText.trim() === "") {
			inputText = null;
		}

		this.onInputChange.emit(inputText);
	}

	onKeyDown(event: KeyboardEvent) {
		// this.setCaretPosition();

		if (event.key === 'Enter') {
			event.preventDefault();
		}
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

	clearInput(): void {
		this.hostElement.textContent = '';
	}
}

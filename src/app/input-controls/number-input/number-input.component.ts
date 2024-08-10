import { Component, ElementRef, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import InputControlComponent from '../InputControlComponent';

@Component({
  selector: 'number-input',
  standalone: true,
  imports: [],
  templateUrl: './number-input.component.html',
  styleUrl: './number-input.component.css',
	host: {
		'contenteditable': '',
		'(input)': 'onInput($event)',
		'(click)': 'setCaretPosition()',
		'(focus)': 'setCaretPosition()',
		'(keypress)': 'onKeyDown($event)'
	}
})
export class NumberInputComponent implements InputControlComponent<number | null> {
	@Input() placeholder: string | null = null;
	@Input() initialValue: number | null = null;
	@Output() onInputChange = new EventEmitter<number | null>();
	inputNumber: number | null = null;
	savedRange: {
		anchorNode: Node,
		anchorOffset: number,
		focusNode: Node,
		focusOffset: number
	} | null = null;
	hostElement: HTMLElement;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	@HostBinding('attr.placeholder') get placeholderValue() {
		return this.placeholder;
	}

	ngOnInit(): void {
		if (this.initialValue !== null) {
			this.hostElement.textContent = `${this.initialValue}`;
		}
	}

	onInput() {
		let inputText: string | null = this.hostElement.textContent ?? '';

		if (inputText.trim() === "") {
			this.inputNumber = null;
			this.hostElement.textContent = '';
			return
		}

		if (isNaN(Number(inputText))) {
			this.hostElement.textContent = `${this.inputNumber ?? ''}`;
			return;
		}

		this.inputNumber = Number(inputText);
		this.onInputChange.emit(this.inputNumber);
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

	onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
		}
		else {return;}

		let inputText: string | null = this.hostElement.textContent ?? null;
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

		this.hostElement.textContent = inputNumber.toString();
		this.onInput();
	}

	clearInput(): void {
		this.hostElement.textContent = '';
	}
}

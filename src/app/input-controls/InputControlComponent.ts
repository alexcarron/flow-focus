import { EventEmitter } from '@angular/core';

export default interface InputControlComponent<OutputType> {
	initialValue: OutputType | null
	onInputChange: EventEmitter<OutputType>

	setValue(value: OutputType | null): void
	onInput(event: Event): void
	clearInput(): void
}
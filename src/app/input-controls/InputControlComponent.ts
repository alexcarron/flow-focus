import { EventEmitter, Output } from '@angular/core';

export default interface InputControlComponent<OutputType> {
	initialValue: OutputType | null
	onInputChange: EventEmitter<OutputType>

	ngOnInit(): void
	onInput(event: Event): void
	clearInput(): void
}
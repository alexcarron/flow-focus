import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'checkbox-input',
  standalone: true,
  imports: [],
  templateUrl: './checkbox-input.component.html',
  styleUrl: './checkbox-input.component.css'
})
export class CheckboxInputComponent {
	@Input() isChecked: boolean = false;
	@Output() onInputChange = new EventEmitter<boolean>();
	private hostElement: HTMLElement;
	checkboxElement!: HTMLInputElement;

	constructor (
		hostElementReference: ElementRef<HTMLElement>,
	) {
		this.hostElement = hostElementReference.nativeElement;
	}

	ngOnInit() {
		this.checkboxElement = this.hostElement.childNodes[0] as HTMLInputElement;

		if (this.isChecked) {
			this.checkboxElement.checked = true;
		}
	}

	onChange(event: Event) {
		this.onInputChange.emit(this.checkboxElement.checked);
	}
}

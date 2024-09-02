import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { TaskTimingOptionsInputComponent } from '../../../input-controls/task-timing-options-input/task-timing-options-input.component';
import TaskTimingOptions from '../../../../model/task/TaskTimingOptions';

@Component({
  selector: 'datetime-popup',
  standalone: true,
  imports: [CommonModule, TaskTimingOptionsInputComponent],
  templateUrl: './datetime-popup.component.html',
  styleUrl: './datetime-popup.component.css'
})
export class DatetimePopupComponent {
	hostElement: HTMLElement;

  @Output() openPopup = new EventEmitter<void>();
  @Output() closePopup = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<TaskTimingOptions>();
	@Input() oldTimingOptions: TaskTimingOptions | null = null;
	newTimingOptions: TaskTimingOptions | null = null;
	isOpen: boolean = false;

	constructor(private hostElementReference: ElementRef) {
		this.hostElement = hostElementReference.nativeElement;
	}

	ngOnInit() {
		this.close();
	}

  onInputChange(timingOptions: TaskTimingOptions): void {
		this.newTimingOptions = timingOptions;
  }

	confirm() {
		if (this.newTimingOptions !== null) {
			this.onConfirm.emit(this.newTimingOptions);
		}

		this.closePopup.emit();
	}

	open(): void {
		this.openPopup.emit();
		this.isOpen = true;
		this.hostElement.style.display = 'block';
	}

  close(): void {
    this.closePopup.emit();
		this.isOpen = false;
		this.hostElement.style.display = 'none';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
		if (this.isOpen) {
			const elementClicked = event.target as HTMLElement;
			// if clicked on element with overlay class
			if (elementClicked?.classList.contains('overlay')) {
				this.close();
			}
		}
  }
}

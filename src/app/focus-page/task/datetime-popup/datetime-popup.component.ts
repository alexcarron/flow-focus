import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'datetime-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './datetime-popup.component.html',
  styleUrl: './datetime-popup.component.css'
})
export class DatetimePopupComponent {
  @Output() closePopup = new EventEmitter<void>();
  @Output() startTimeSelected = new EventEmitter<string>();
  @Output() deadlineSelected = new EventEmitter<string>();
	@Input() oldStartTime: Date | null = null;
	@Input() oldDeadline: Date | null = null;
	startTime: string | null = null;
	deadline: string | null = null;

  // Method to format Date object to 'YYYY-MM-DDTHH:MM' string
  formatDate(date: Date | null): string {
		if (date === null) {
			return '';
		}

    const pad = (n: number) => n < 10 ? '0' + n : n;

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // getMonth() is zero-based
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onStartTimeChange(event: any): void {
		this.startTime = event.target.value;
  }

  onDeadlineChange(event: any): void {
		this.deadline = event.target.value;
  }

	confirm() {
		if (this.startTime !== null) {
			this.startTimeSelected.emit(this.startTime);
		}

		if (this.deadline !== null) {
			this.deadlineSelected.emit(this.deadline);
		}
	}

  close(): void {
    this.closePopup.emit();
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() closePopup = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<TaskTimingOptions | null>();
	@Input() oldTimingOptions: TaskTimingOptions | null = null;
	newTimingOptions: TaskTimingOptions | null = null;

	ngOnInit(): void {
		this.newTimingOptions = this.oldTimingOptions;
	}

  onInputChange(timingOptions: TaskTimingOptions): void {
		this.newTimingOptions = timingOptions;
  }

	confirm() {
		if (this.newTimingOptions !== null) {
			this.onConfirm.emit(this.newTimingOptions);
		}
	}

  close(): void {
    this.closePopup.emit();
  }
}

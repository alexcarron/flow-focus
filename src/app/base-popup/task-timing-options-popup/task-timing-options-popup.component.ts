import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild } from '@angular/core';
import TaskTimingOptions from '../../../model/task/TaskTimingOptions';
import { BasePopupComponent } from '../base-popup.component';
import { TaskTimingOptionsInputComponent } from '../../input-controls/task-timing-options-input/task-timing-options-input.component';

@Component({
  selector: 'task-timing-options-popup',
  standalone: true,
  imports: [CommonModule, TaskTimingOptionsInputComponent, BasePopupComponent],
  templateUrl: './task-timing-options-popup.component.html',
  styleUrl: './task-timing-options-popup.component.css'
})
export class TaskTimingOptionsPopupComponent extends BasePopupComponent<TaskTimingOptions> {
	@ViewChild('taskTimingOptionsInput') taskTimingOptionsInput!: TaskTimingOptionsInputComponent;
	@Input() oldTimingOptions: TaskTimingOptions | null = null;

  onInputChange(timingOptions: TaskTimingOptions): void {
		this.emittedConfirmation = timingOptions;
  }

	setOldTimingOptions(timingOptions: TaskTimingOptions) {
		this.oldTimingOptions = timingOptions;
		this.taskTimingOptionsInput.setValue(timingOptions);
	}
}

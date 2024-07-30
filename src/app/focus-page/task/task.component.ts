import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import Task from '../../../model/task/Task';
import { CommonModule } from '@angular/common';
import EditTaskDescriptionCommand from '../../../model/commands/EditTaskDescriptionCommand';
import { CommandHistoryService } from '../../../services/CommandHistory.service';
import EditTaskStepCommand from '../../../model/commands/EditTaskStepsCommand';
import { TimeFormatterPipe } from '../../../pipes/TimeFormatter.pipe';
import { DatetimePopupComponent } from './datetime-popup/datetime-popup.component';
import EditTaskDeadlineCommand from '../../../model/commands/EditTaskDeadlineCommand';
import EditTaskStartTimeCommand from '../../../model/commands/EditTaskStartTimeCommand';

@Component({
  selector: 'task',
  standalone: true,
  imports: [CommonModule, TimeFormatterPipe, DatetimePopupComponent],
  templateUrl: './task.component.html',
  styleUrl: './task.component.css'
})
export class TaskComponent {
	private static readonly URGENT_MILLISECONDS_LEFT = 1000 * 60 * 60 * 5;

	@Input() task!: Task;
	@Output() taskSkipped = new EventEmitter<Task>();
	@Output() taskCompleted = new EventEmitter<Task>();
	timeLeft: string | null = null;
	currentTime: Date = new Date();
	isPopupOpen = false;

	constructor(
		private commandHistory: CommandHistoryService
	) {}

	ngOnInit() {
		this.timeLeft = this.getTimeLeft();

		setInterval(() => {
			this.timeLeft = this.getTimeLeft();
			this.currentTime = new Date();
		}, 1000);
	}


	getDescription(): string {
		return this.task.getDescription();
	}


	hasSteps(): boolean {
		return this.task.hasNextStep();
	}

	getNextStep(): string {
		return this.task.getNextStep() ?? "";
	}

	/**
	 * Returns a minimal string representation of the time left from the given delta time.
	 *
	 * @param {number} millisecondsLeft - The time difference in milliseconds.
	 * @return {string} A string representing the time left in the format '<units left> <unit of time>'.
	 */
	private getTimeString(millisecondsLeft: number): string {
		const timeUnits = [
			{ millisecondsLong: 60 * 1000, name: 'minute' },
			{ millisecondsLong: 60 * 60 * 1000, name: 'hour' },
			{ millisecondsLong: 24 * 60 * 60 * 1000, name: 'day' },
			{ millisecondsLong: 7 * 24 * 60 * 60 * 1000, name: 'week' },
			{ millisecondsLong: 52.1775 * 7 * 24 * 60 * 60 * 1000, name: 'year' }
		];

		timeUnits.sort((a, b) => b.millisecondsLong - a.millisecondsLong);

		for (const timeUnit of timeUnits) {
			if (millisecondsLeft >= timeUnit.millisecondsLong) {
				const unitsLeft = Math.floor(millisecondsLeft / timeUnit.millisecondsLong);
				let unitName = timeUnit.name;

				if (unitsLeft > 1) {
					unitName += 's';
				}

				return `${unitsLeft} ${unitName}`;
			}
		}

		return '';
	}

	/**
	 * Returns the time left based on the deadline and current time.
	 *
	 * @return {string} A string representing the time left in appropriate units.
	 */
	getTimeLeft(): string | null {
		const millisecondsLeft = this.task.getTimeToComplete(this.currentTime);
		if (millisecondsLeft === null) {
			return null;
		}

		const timeLeftString = this.getTimeString(millisecondsLeft);
		return timeLeftString ? timeLeftString + " left" : "";
	}

	isSkippable(): boolean {
		return !this.task.isUrgent(this.currentTime);
	}

	skip() {
		this.taskSkipped.emit(this.task);
	}

	complete() {
		this.taskCompleted.emit(this.task);
	}

	getProgressPercentage(): string {
		return this.task.getProgress() * 94 + 3 + '%';
	}

	/**
	 * Updates the task's description based on the value of the input element.
	 *
	 * @param {Event} event - The event object containing information about the input element.
	 */
	onDescriptionChange(event: Event) {
		const newDescription = (event.target as HTMLHeadingElement).textContent ?? "";

		this.commandHistory.execute(
			new EditTaskDescriptionCommand(this.task, newDescription)
		);
	}


	/**
	 * Updates the task's next step based on the value of the input element.
	 *
	 * @param {Event} event - The event object containing information about the input element.
	 */
	onNextStepChange(event: Event) {
		const newNextStep = (event.target as HTMLHeadingElement).textContent ?? "";

		this.commandHistory.execute(
			new EditTaskStepCommand(this.task, newNextStep)
		)
	}

	getDeadline(): Date | null {
		return this.task.getDeadline();
	}

	getStartTime(): Date | null {
		return this.task.getEarliestStartTime();
	}

  openPopup(): void {
		console.log('Opening popup...');
    this.isPopupOpen = true;
  }

  closePopup(): void {
		console.log('Closing popup...');
    this.isPopupOpen = false;
  }

  changeStartTime(dateTime: string): void {
		const newStartTime = new Date(dateTime);
		const editStartTimeCommand = new EditTaskStartTimeCommand(
			this.task, newStartTime
		);
		this.commandHistory.execute(editStartTimeCommand);
		this.closePopup();
  }

  changeDeadline(dateTime: string): void {
		const newDeadline = new Date(dateTime);
		const editDeadlineCommand = new EditTaskDeadlineCommand(
			this.task, newDeadline
		);
		this.commandHistory.execute(editDeadlineCommand);
		this.closePopup();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
		if (this.isPopupOpen) {
			const target = event.target as HTMLElement;
			// if clicked on element with overlay class
			if (target?.classList.contains('overlay')) {
				this.closePopup();
			}
		}
  }
}

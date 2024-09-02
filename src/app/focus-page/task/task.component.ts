import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import Task from '../../../model/task/Task';
import { CommonModule } from '@angular/common';
import EditTaskDescriptionCommand from '../../../model/commands/EditTaskDescriptionCommand';
import { CommandHistoryService } from '../../../services/CommandHistory.service';
import EditTaskStepCommand from '../../../model/commands/EditTaskStepCommand';
import { TimeFormatterPipe } from '../../../pipes/TimeFormatter.pipe';
import { TaskTimingOptionsPopupComponent } from '../../base-popup/datetime-popup/task-timing-options-popup.component';
import { ShrinkToFitDirective } from '../../../directives/shrink-to-fit.directive';
import TaskTimingOptions from '../../../model/task/TaskTimingOptions';
import { ArrayInputComponent } from '../../input-controls/array-input/array-input.component';

@Component({
  selector: 'task',
  standalone: true,
  imports: [CommonModule, TimeFormatterPipe, TaskTimingOptionsPopupComponent, ShrinkToFitDirective, ArrayInputComponent],
  templateUrl: './task.component.html',
  styleUrl: './task.component.css'
})
export class TaskComponent {
	@ViewChild('taskSteps') taskStepsDiv?: ElementRef<HTMLDivElement>;
	@ViewChild('skipButton') skipButton?: ElementRef<HTMLDivElement>;
	@ViewChild('timingOptionsPopup') timingOptionsPopup?: TaskTimingOptionsPopupComponent;
	taskStepsDivElement?: HTMLDivElement
	skipButtonElement?: HTMLDivElement

	@Input() task!: Task;
	@Output() taskSkipped = new EventEmitter<Task>();
	@Output() taskCompleted = new EventEmitter<Task>();
	timeLeft: string | null = null;
	currentTime: Date = new Date();
	isTimingOptionsPopupOpen = false;

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

	ngAfterViewInit() {
		this.taskStepsDivElement = this.taskStepsDiv?.nativeElement;
		this.skipButtonElement = this.skipButton?.nativeElement;
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

	onPreviousStepsChange(previousSteps: string[]) {
		const upcomingSteps = this.task.getUpcomingSteps();
		const nextStep = this.getNextStep();
		const newSteps = [
			...previousSteps,
			nextStep,
			...upcomingSteps,
		]
		this.task.editSteps(newSteps);
	}

	onUpcomingStepsChange(upcomingSteps: string[]) {
		const previousSteps = this.task.getPreviousSteps();
		const nextStep = this.getNextStep();
		const newSteps = [
			...previousSteps,
			nextStep,
			...upcomingSteps,
		]
		this.task.editSteps(newSteps);
	}

	/**
	 * Returns a minimal string representation of the time left from the given delta time.
	 *
	 * @param {number} millisecondsLeft - The time difference in milliseconds.
	 * @return {string} A string representing the time left in the format '<units left> <unit of time>'.
	 */
	private getTimeString(millisecondsLeft: number): string {
		// Handle negative time
		const isNegative = millisecondsLeft < 0;
		if (isNegative) {
			millisecondsLeft = -millisecondsLeft;
		}

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

				return `${unitsLeft} ${unitName} ${isNegative ? 'ago' : 'left'}`;
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
		const millisecondsLeft = this.task.getTimeUntilDeadline(this.currentTime);
		if (millisecondsLeft === null) {
			return null;
		}

		const timeLeftString = this.getTimeString(millisecondsLeft);
		return timeLeftString;
	}

	isSkippable(): boolean {
		return !this.task.isUrgent(this.currentTime);
	}

	skip() {
		this.taskSkipped.emit(this.task);
	}

	skipTask() {}

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

	isFocusedOnNextStep(): boolean {
		if (this.taskStepsDivElement !== undefined && this.skipButtonElement !== undefined) {
			return (
				this.taskStepsDivElement.contains(document.activeElement) &&
				!this.skipButtonElement.contains(document.activeElement)
			);
		}

		return false;
	}

	getDeadline(): Date | null {
		return this.task.getDeadline();
	}

	getStartTime(): Date | null {
		return this.task.getStartTime();
	}

  openTimingOptionsPopup(): void {
		console.log(this.timingOptionsPopup);
		if (this.timingOptionsPopup) {
			this.timingOptionsPopup.open();
		}
  }

	onTimingOptionsPopoutConfirm(taskTimingOptions: TaskTimingOptions): void {
		this.task.setFromTaskTimingOptions(taskTimingOptions);
	}
}

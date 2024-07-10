import { Component, EventEmitter, Input, Output } from '@angular/core';
import Task from '../../../model/Task';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'task',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task.component.html',
  styleUrl: './task.component.css'
})
export class TaskComponent {
	private static readonly URGENT_MILLISECONDS_LEFT = 1000 * 60 * 5;

	@Input() task!: Task;
	@Output() taskSkipped: EventEmitter<void> = new EventEmitter<void>();


	getDescription(): string {
		console.log(this.task);
		return this.task.getDescription();
	}

	hasSteps(): boolean {
		return this.task.getNextStep() != null;
	}

	getNextStep(): string {
		return this.task.getNextStep() ?? "";
	}

	hasUpcomingDeadline(): boolean {
		const millisecondsLeft = this.task.getMillisecondsLeft();

		if (millisecondsLeft == null) {
			return false;
		}

		return millisecondsLeft <= TaskComponent.URGENT_MILLISECONDS_LEFT;
	}

	/**
	 * Returns a minimal string representation of the time left from the given delta time.
	 *
	 * @param {number} millisecondsLeft - The time difference in milliseconds.
	 * @return {string} A string representing the time left in the format '<units left> <unit of time>'.
	 */
	private getTimeLeftString(millisecondsLeft: number): string {
		const timeUnits = [
			{ millisecondsLong: 60 * 1000, name: 'minutes' },
			{ millisecondsLong: 60 * 60 * 1000, name: 'hours' },
			{ millisecondsLong: 24 * 60 * 60 * 1000, name: 'days' },
			{ millisecondsLong: 7 * 24 * 60 * 60 * 1000, name: 'weeks' },
			{ millisecondsLong: 52.1775 * 7 * 24 * 60 * 60 * 1000, name: 'years' }
		];

		timeUnits.sort((a, b) => b.millisecondsLong - a.millisecondsLong);

		for (const timeUnit of timeUnits) {
			if (millisecondsLeft >= timeUnit.millisecondsLong) {
				const unitsLeft = Math.floor(millisecondsLeft / timeUnit.millisecondsLong);
				return `${unitsLeft} ${timeUnit.name}`;
			}
		}

		return '';
	}

	/**
	 * Returns the time left based on the deadline and current time.
	 *
	 * @return {string} A string representing the time left in appropriate units.
	 */
	getTimeLeft(): string {
		const millisecondsLeft = this.task.getMillisecondsLeft();
		if (millisecondsLeft === null) {
			return "";
		}
		return this.getTimeLeftString(millisecondsLeft);
	}

	isSkippable(): boolean {
		return !this.task.isMandatory();
	}

	skip() {
		this.taskSkipped.emit();
	}

	complete() {
		this.task.complete();
	}

	/**
	 * Updates the task's description based on the value of the input element.
	 *
	 * @param {Event} event - The event object containing information about the input element.
	 */
	onDescriptionChange(event: Event) {
		const newDescription = (event.target as HTMLHeadingElement).textContent ?? "";
		this.task.setDescription(newDescription);
	}


	/**
	 * Updates the task's next step based on the value of the input element.
	 *
	 * @param {Event} event - The event object containing information about the input element.
	 */
	onNextStepChange(event: Event) {
		const newNextStep = (event.target as HTMLHeadingElement).textContent ?? "";
		this.task.replaceNextStep(newNextStep);
	}
}

import StepStatus from "./StepStatus";
import TaskState from "./TaskState";

export default class Task {
	private description: string;

	/**
	 * A map of steps to their status in order of completion. All steps are set to 'Uncomplete' by default.
	 */
	private stepsToStatusMap: Map<string, StepStatus> = new Map();

	private earliestStartTime: Date | null = null;
	private deadline: Date | null = null;
	private minRequiredTime: number | null = null;
	private maxRequiredTime: number | null = null;

	private repeatInterval: number | null = null;

	private isMandatory: boolean = false;
	private isComplete: boolean = false;
	private isSkipped: boolean = false;

	private lastAction: StepStatus | null = null;

	constructor(description: string) {
		this.description = description;
	};

	getDescription(): string {return this.description};
	changeDescription(description: string): void {this.description = description};

	isRecurring(): boolean {return this.repeatInterval !== null};
	getRepeatInterval(): number | null {return this.repeatInterval};

	/**
	 * Makes the task recurring by setting the repeat interval and time the interval should start.
	 * If the deadline is not set or is after the end of the interval, it is set to the end of the interval.
	 *
	 * @param {number} repeatInterval - The interval in milliseconds at which the task should repeat.
	 * @param {Date} intervalStartTime - The time at which the task should start repeating.
	 */
	makeRecurring(repeatInterval: number, intervalStartTime: Date): void {
		this.repeatInterval = repeatInterval;
		this.earliestStartTime = intervalStartTime;

		const intervalEndTime = new Date(this.earliestStartTime.getTime() + repeatInterval);

		// If deadline is not set or if deadline is after the end of the interval set it to the end of the interval
		if (
			this.deadline === null ||
			this.deadline.getTime() > intervalEndTime.getTime()
		) {
			this.deadline = intervalEndTime;
		}
	};

	/**
	 * Checks if the task is past its interval end time.
	 * @returns {boolean} - Whether the task is past its interval end time.
	 */
	isPastIntervalEndTime(currentTime: Date): boolean {
		if (!this.isRecurring() || !this.earliestStartTime || !this.repeatInterval) {
			return false;
		}

		const intervalEndTime = new Date(this.earliestStartTime.getTime() + this.repeatInterval);

		return currentTime.getTime() > intervalEndTime.getTime();
	};

	/**
	 * Handles resetting a task's interval and progress when the current time passes the end of a task interval.
	 */
	onPastIntervalEndTime(currentTime: Date): void {
		if (!this.isRecurring() || !this.earliestStartTime || !this.repeatInterval) {
			return;
		}

		this.resetProgress();

		let isNextIntervalStartTimeInFuture: boolean = false;
		while (!isNextIntervalStartTimeInFuture) {
			const nextIntervalStartTime: Date =
				new Date(this.earliestStartTime.getTime() + this.repeatInterval);

			if (nextIntervalStartTime.getTime() > currentTime.getTime()) {
				isNextIntervalStartTimeInFuture = true;
			}
			else {
				this.earliestStartTime = nextIntervalStartTime;

				if (this.deadline !== null) {
					const nextIntervalDeadline =
						new Date(this.deadline.getTime() + this.repeatInterval);

					this.deadline = nextIntervalDeadline;
				}
			}
		}

	};

	/**
	 * Resets the progress and completion status of the task.
	 */
	private resetProgress() {
		this.getSteps().forEach((step) => {
			this.stepsToStatusMap.set(step, StepStatus.UNCOMPLETE);
		});
		this.isComplete = false;
		this.isSkipped = false;
	}

	setStepsToStatusMap(stepsToStatusObject: Array<any>) {
		this.stepsToStatusMap = new Map();
		stepsToStatusObject.forEach(([step, status]) => {
			this.stepsToStatusMap.set(step, status as StepStatus);
		});
	};

	getSteps(): string[] {
		const steps = this.stepsToStatusMap.keys();
		return Array.from(steps);
	};

	/**
	 * Checks if the task has steps.
	 * @returns Whether the task has steps.
	 */
	private hasSteps(): boolean {
		return this.stepsToStatusMap.size > 0;
	};

	hasNextStep(): boolean {
		return this.getNextStep() !== null;
	};

	private getNumSteps(): number {
		return this.stepsToStatusMap.size;
	}

	/**
	 * Gets the first uncompleted or skipped step unless they just skipped it
	 * @returns {string | null} - The first uncompleted step or null if there are no steps or all steps are completed.
	 */
	getNextStep(): string | null {
		if (this.wasLastActionASkip()) {
			const firstUncompletedStepEntry =
				Array.from(this.stepsToStatusMap.entries())
					.find(([step, status]) => status === StepStatus.UNCOMPLETE);

			if (firstUncompletedStepEntry === undefined) {
				return null;
			}
			else {
				return firstUncompletedStepEntry ? firstUncompletedStepEntry[0] : null;
			}
		}
		else {
			const firstNonCompletedStepEntry =
				Array.from(this.stepsToStatusMap.entries())
					.find(([step, status]) => status !== StepStatus.COMPLETED);

			if (firstNonCompletedStepEntry === undefined) {
				return null;
			}
			else {
				return firstNonCompletedStepEntry ? firstNonCompletedStepEntry[0] : null;
			}

		}
	};

	/**
	 * Replaces the next step with a different step.
	 * @param newNextStep - The step to replace the first uncompleted step.
	 */
	replaceNextStep(newNextStep: string) {
		const nextStep = this.getNextStep();

		if (nextStep) {
			const nextUncompletedStepIndex = Array.from(this.stepsToStatusMap.keys()).findIndex(step => step === nextStep);

			if (nextUncompletedStepIndex !== -1) {
				// Store entries after the next uncompleted step
				const entriesAfterNextUncompletedStep = Array.from(this.stepsToStatusMap.entries()).slice(nextUncompletedStepIndex + 1);

				// Remove entries after the next uncompleted step
				entriesAfterNextUncompletedStep.forEach(([step, status]) => this.stepsToStatusMap.delete(step));

				// Remove the next uncompleted step
				this.stepsToStatusMap.delete(nextStep);

				// Replace the next uncompleted step with the new step
				this.stepsToStatusMap.set(newNextStep, StepStatus.UNCOMPLETE);

				// Add the remaining entries
				entriesAfterNextUncompletedStep.forEach(([step, status]) => this.stepsToStatusMap.set(step, status));
			}
		}
	};

	/**
	 * Adds a step to the task.
	 * @param step - The step to add.
	 */
	addStep(step: string): void {
		this.stepsToStatusMap.set(step, StepStatus.UNCOMPLETE);
	};

	/**
	 * Determines if the last action taken was a skip.
	 */
	private wasLastActionASkip(): boolean {
		return this.lastAction === StepStatus.SKIPPED;
	}

	/**
	 * Determines if all steps are completed.
	 * @returns Whether all steps are completed.
	 */
	private areAllStepsCompleted(): boolean {
		return Array.from(this.stepsToStatusMap.values())
			.every((status) => status === StepStatus.COMPLETED);
	}

	/**
	 * Completes a specified step.
	 * @param step - The step to complete.
	 */
	completeStep(step: string) {
		this.stepsToStatusMap.set(step, StepStatus.COMPLETED);

		if (this.areAllStepsCompleted()) {
			this.complete();
		}

		this.lastAction = StepStatus.COMPLETED;
	}

	/**
	 * Completes the next step, completing the task if all steps are completed
	 */
	completeNextStep() {
		if (!this.hasSteps()) {
			this.complete();
			return;
		}

		const nextStep = this.getNextStep();
		if (nextStep) {
			this.completeStep(nextStep);
		}
	}

	/**
	 * Determines if all steps are completed or skipped.
	 * @returns Whether all steps are completed or skipped.
	 */
	private areAllStepsActioned(): boolean {
		return Array.from(this.stepsToStatusMap.values())
			.every((status) => status !== StepStatus.UNCOMPLETE);
	}


	/**
	 * Skips a specified step.
	 * @param step - The step to skip.
	 */
	skipStep(step: string) {
		this.stepsToStatusMap.set(step, StepStatus.SKIPPED);

		if (this.areAllStepsActioned()) {
			this.skip();
		}

		this.lastAction = StepStatus.SKIPPED;
	}

	/**
	 * Skips the next uncompleted step, skipping the task if no steps are uncompleted.
	 */
	skipNextStep() {
		if (!this.hasSteps()) {
			this.skip();
			return;
		}

		const nextStep = this.getNextStep();
		if (nextStep) {
			this.skipStep(nextStep);
		}
	}

	/**
	 * Edits the steps of the task.
	 * @param newSteps - The new steps of the task.
	 */
	editSteps(newSteps: string[]): void {
		let stepStatuses = Array.from(this.stepsToStatusMap.values());

		this.stepsToStatusMap.clear();

		newSteps.forEach((step) => {
			this.stepsToStatusMap.set(step, stepStatuses.shift() ?? StepStatus.UNCOMPLETE);
		});
	}

	getEarliestStartTime(): Date | null {return this.earliestStartTime};
	setEarliestStartTime(earliestStartTime: Date): void {this.earliestStartTime = earliestStartTime};

	getDeadline(): Date | null {return this.deadline};
	setDeadline(deadline: Date): void {this.deadline = deadline};

	getTimeToComplete(currentTime: Date): number {
		if (this.getDeadline() === null) {
			return Number.POSITIVE_INFINITY;
		}

		const earliestStartTime = this.getEarliestStartTime()?.getTime();
		const deadlineTime = this.getDeadline()!.getTime();

		if (
			earliestStartTime !== undefined &&
			currentTime.getTime() < earliestStartTime
		) {
			return deadlineTime - earliestStartTime;
		}

		return deadlineTime - currentTime.getTime();
	}

	getMinRequiredTime(): number {
		if (this.minRequiredTime === null) {
			return 0;
		}
		return this.minRequiredTime
	};

	setMinRequiredTime(minRequiredTime: number): void {this.minRequiredTime = minRequiredTime};

	getMaxRequiredTime(currentTime: Date): number {
		if (this.maxRequiredTime === null) {
			if (this.deadline === null) {
				return Number.POSITIVE_INFINITY;
			}
			else {
				return this.getTimeToComplete(currentTime);
			}
		}
		return this.maxRequiredTime
	};
	setMaxRequiredTime(maxRequriedTime: number): void {this.maxRequiredTime = maxRequriedTime};

	getMinSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMaxRequiredTime(currentTime);
	}

	getMaxSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMinRequiredTime();
	}

	getIsMandatory(): boolean {return this.isMandatory}
	setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	getIsComplete(): boolean {return this.isComplete}
	private complete(): void {
		this.isComplete = true;
	}

	getIsSkipped(): boolean {return this.isSkipped}
	private skip(): void {
		this.isSkipped = true;
	}

	getProgress(): number {
		if (this.getIsComplete()) {
			return 1;
		}

		if (!this.hasSteps()) {
			return 0;
		}

		const completedSteps = Array.from(this.stepsToStatusMap.values())
			.filter((status) => status === StepStatus.COMPLETED)
			.length;

		return completedSteps / this.getNumSteps();
	}

	/**
	 * Gets a deep copy of the current state of the task.
	 */
	getCurrentState(): TaskState {
		return {
			description: this.description,
			isComplete: this.isComplete,
			isMandatory: this.isMandatory,
			isSkipped: this.isSkipped,
			earliestStartTime: this.earliestStartTime,
			deadline: this.deadline,
			minRequiredTime: this.minRequiredTime,
			maxRequiredTime: this.maxRequiredTime,
			repeatInterval: this.repeatInterval,
			stepsToStatusMap: new Map(this.stepsToStatusMap),
			lastAction: this.lastAction
		};
	}

	/**
	 * Restores the state of the task from the given state.
	 * @param taskState - The state to restore.
	 */
	restoreState(taskState: TaskState) {
		this.description = taskState.description;
		this.isComplete = taskState.isComplete;
		this.isMandatory = taskState.isMandatory;
		this.isSkipped = taskState.isSkipped;
		this.earliestStartTime = taskState.earliestStartTime;
		this.deadline = taskState.deadline;
		this.minRequiredTime = taskState.minRequiredTime;
		this.maxRequiredTime = taskState.maxRequiredTime;
		this.repeatInterval = taskState.repeatInterval;
		this.stepsToStatusMap = new Map(taskState.stepsToStatusMap);
		this.lastAction = taskState.lastAction;
	}
}
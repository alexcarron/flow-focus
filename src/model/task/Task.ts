import TaskTimingOptions from "./TaskTimingOptions";
import TasksManager from "../TasksManager";
import TasksManagerState from "../TasksManagerState";
import DateRange from "../time-management/DateRange";
import StepStatus from "./StepStatus";
import TaskState from "./TaskState";

export default class Task {
	/**
	 * A map of steps to their status in order of completion. All steps are set to 'Uncomplete' by default.
	 */
	protected description: string;
	protected stepsToStatusMap: Map<string, StepStatus> = new Map();
	protected earliestStartTime: Date | null = null;
	protected deadline: Date | null = null;
	protected minRequiredTime: number | null = null;
	protected maxRequiredTime: number | null = null;
	protected repeatInterval: number | null = null;
	protected isMandatory: boolean = false;
	protected isComplete: boolean = false;
	protected isSkipped: boolean = false;
	protected lastActionedStep: {step: string, status: StepStatus} | null = null;

	constructor(
		protected tasksManager: TasksManager,
		description: string,
	) {
		this.description = description;
	};

	getDescription(): string {return this.description};
	setDescription(description: string): void {this.description = description};

	setStepsToStatusMap(stepsToStatusObject: Array<[string, StepStatus | string]> | Map<string, StepStatus>) {
		if (stepsToStatusObject instanceof Map) {
			this.stepsToStatusMap = stepsToStatusObject;
		}
		else {
			this.stepsToStatusMap = new Map();
			stepsToStatusObject.forEach(([step, status]) => {
				this.stepsToStatusMap.set(step, status as StepStatus);
			});
		}
	};

	getEarliestStartTime(): Date | null {return this.earliestStartTime};
	setEarliestStartTime(earliestStartTime: Date | null): void {this.earliestStartTime = earliestStartTime};

	getDeadline(): Date | null {return this.deadline};
	setDeadline(deadline: Date | null): void {this.deadline = deadline};

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
		this.setEarliestStartTime(intervalStartTime);

		const intervalEndTime = new Date(this.earliestStartTime!.getTime() + repeatInterval);

		// If deadline is not set or if deadline is after the end of the interval set it to the end of the interval
		if (
			this.deadline === null ||
			this.deadline.getTime() > intervalEndTime.getTime()
		) {
			this.setDeadline(intervalEndTime);
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
				this.setEarliestStartTime(nextIntervalStartTime);

				if (this.deadline !== null) {
					const nextIntervalDeadline =
						new Date(this.deadline.getTime() + this.repeatInterval);

					this.setDeadline(nextIntervalDeadline);
				}
			}
		}

	};

	/**
	 * Resets the progress and completion status of the task.
	 */
	protected resetProgress() {
		this.getSteps().forEach((step) => {
			this.stepsToStatusMap.set(step, StepStatus.UNCOMPLETE);
		});
		this.isComplete = false;
		this.isSkipped = false;
		this.lastActionedStep = null;
	}

	getSteps(): string[] {
		const steps = this.stepsToStatusMap.keys();
		return Array.from(steps);
	};

	/**
	 * Checks if the task has steps.
	 * @returns Whether the task has steps.
	 */
	protected hasSteps(): boolean {
		return this.stepsToStatusMap.size > 0;
	};

	hasNextStep(): boolean {
		return this.getNextStep() !== null;
	};

	protected getNumSteps(): number {
		return this.stepsToStatusMap.size;
	}

	/**
	 * Gets the first step that hasn't been completed
	 * @returns The first step that hasn't been completed or null if there are no steps or all steps are completed.
	 */
	getFirstNotCompletedStep(): string | null {
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

	/**
	 * Gets the first step that is not complete or skipped
	 * @returns The first step that is not complete or skipped or null if there are no uncomplete step
	 */
	getFirstUncompleteStep(): string | null {
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

	/**
	 * Gets the next skipped step after the last step that was completed or skipped
	 * @returns The next skipped step after the last step that was completed or skipped or null if there has been no action or skipped steps
	 */
	getNextSkippedStep(): string | null {
		if (this.lastActionedStep === null) {
			return null;
		}

		const lastStepActioned = this.lastActionedStep.step;

		let foundLastStepActioned = false;

		// Get next step skipped after last step skipped if any
		const nextSkippedStep = Array.from(this.stepsToStatusMap.entries())
			.find(([step, status]) => {
				if (foundLastStepActioned) {
					return status === StepStatus.SKIPPED && step !== lastStepActioned
				}

				if (lastStepActioned === step) {
					foundLastStepActioned = true;
				}

				return false;
			});

		if (nextSkippedStep !== undefined) {
			return nextSkippedStep[0];
		}
		else {
			return null;
		}
	}



	/**
	 * Gets the next step that the user should focus on
	 * @returns The next step the uesr should focus on or null if there are no steps or all are completed.
	 */
	getNextStep(): string | null {
		if (this.wasLastActionASkip()) {
			const nextSkippedStep = this.getNextSkippedStep();
			const firstUncompletedStep = this.getFirstUncompleteStep();

			if (nextSkippedStep) {
				return nextSkippedStep;
			}
			else if (firstUncompletedStep) {
				return firstUncompletedStep;
			}
			else {
				return  this.getFirstNotCompletedStep();
			}
		}
		else {
			return this.getFirstNotCompletedStep();
		}
	};

	private getStepIndex(stepLookingFor: string): number {
		const steps = this.getSteps();
		return steps.findIndex(step => step === stepLookingFor);
	}

	getPreviousSteps(): string[] {
		const nextStep = this.getNextStep();
		if (nextStep === null) return [];

		const nextStepIndex = this.getStepIndex(nextStep);
		if (nextStepIndex === -1) return []

		// Store entries after the next uncompleted step
		const stepsBeforeNextStep = Array.from(this.getSteps())
			.slice(0, nextStepIndex);

		return stepsBeforeNextStep;
	}

	getUpcomingSteps(): string[] {
		const nextStep = this.getNextStep();
		if (nextStep === null) return [];

		const nextStepIndex = this.getStepIndex(nextStep);
		if (nextStepIndex === -1) return []

		// Store entries after the next uncompleted step
		const stepsAfterNextStep = Array.from(this.getSteps())
			.slice(nextStepIndex + 1);

		return stepsAfterNextStep;
	}

	removeDeadline(): void {
		this.setDeadline(null);
	}

	removeEarliestStartTime(): void {
		this.setEarliestStartTime(null);
	}

	/**
	 * Replaces the next step with a different step.
	 * @param newNextStep - The step to replace the first uncompleted step.
	 */
	replaceNextStep(newNextStep: string) {
		const nextStep = this.getNextStep();

		if (nextStep) {
			const nextStepIndex = this.getStepIndex(nextStep);

			if (nextStepIndex !== -1) {
				// Store entries after the next uncompleted step
				const entriesAfterNextUncompletedStep = Array.from(this.stepsToStatusMap.entries()).slice(nextStepIndex + 1);

				// Remove entries after the next uncompleted step
				entriesAfterNextUncompletedStep.forEach(
					([step, status]) => this.stepsToStatusMap.delete(step)
				);

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
	protected wasLastActionASkip(): boolean {
		return this.lastActionedStep?.status === StepStatus.SKIPPED;
	}

	/**
	 * Determines if all steps are completed.
	 * @returns Whether all steps are completed.
	 */
	protected areAllStepsCompleted(): boolean {
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

		this.lastActionedStep = {
			step: step,
			status: StepStatus.COMPLETED
		}
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
	protected areAllStepsActioned(): boolean {
		return Array.from(this.stepsToStatusMap.values())
			.every((status) => status !== StepStatus.UNCOMPLETE);
	}

	/**
	 * Gets the last skipped step.
	 * @returns The last skipped step or null if there are no skipped steps
	 */
	getLastSkippedStep(): string | null {
		const lastSkippedStep = Array.from(this.stepsToStatusMap.entries())
			.reverse()
			.find(([step, status]) => status === StepStatus.SKIPPED);

		return lastSkippedStep?.[0] ?? null;
	}


	/**
	 * Skips a specified step.
	 * @param step - The step to skip.
	 */
	skipStep(step: string) {
		this.stepsToStatusMap.set(step, StepStatus.SKIPPED);

		if (
			this.areAllStepsActioned() &&
			this.getLastSkippedStep() === step
		) {
			this.skip();
		}

		this.lastActionedStep = {
			step: step,
			status: StepStatus.SKIPPED
		}
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

		const stepsToStatusMapCopy = new Map<string, StepStatus>(this.stepsToStatusMap);

		this.stepsToStatusMap.clear();

		newSteps.forEach((step) => {
			let status = stepStatuses.shift() ?? StepStatus.UNCOMPLETE;

			if (stepsToStatusMapCopy.has(step)) {
				status = stepsToStatusMapCopy.get(step) ?? StepStatus.UNCOMPLETE;

				this.stepsToStatusMap.set(step, status);
			}
			else {
				this.stepsToStatusMap.set(step, status);
			}
		});
	}


	/**
	 * Calculates the time you have to complete the task not including blocked time (Sleeping, etc).
	 * @param currentTime - The current time.
	 * @param nonTaskableTimePerDay - The number of milliseconds per day that you can't spend completing tasks.
	 * @returns
	 */
	getTimeToComplete(currentTime: Date): number {
		if (this.getDeadline() === null) {
			return Number.POSITIVE_INFINITY;
		}

		const earliestStartDate = this.getEarliestStartTime()
		const deadlineDate = this.getDeadline()!;

		let taskDateRange = new DateRange(currentTime, deadlineDate);

		if (
			earliestStartDate !== null &&
			currentTime.getTime() < earliestStartDate.getTime()
		) {
			taskDateRange = new DateRange(earliestStartDate, deadlineDate);
		}

		return taskDateRange.getDurationWithoutTimeWindow(
			this.tasksManager.getAsleepTimeWindow()
		);
	}

	getMinRequiredTime(): number {
		if (this.minRequiredTime === null) {
			return 0;
		}
		return this.minRequiredTime
	};

	setMinRequiredTime(minRequiredTime: number | null): void {this.minRequiredTime = minRequiredTime};

	getTaskTimingOptions(): TaskTimingOptions {
		return {
			startTime: this.earliestStartTime,
			deadline: this.deadline,
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			repeatInterval: this.repeatInterval,
			isMandatory: this.isMandatory
		}
	}

	setFromTaskTimingOptions(taskTimingOptions: TaskTimingOptions): void {
		this.setEarliestStartTime(taskTimingOptions.startTime);
		this.setDeadline(taskTimingOptions.deadline);
		this.minRequiredTime = taskTimingOptions.minDuration;
		this.maxRequiredTime = taskTimingOptions.maxDuration;
		this.repeatInterval = taskTimingOptions.repeatInterval;
		this.isMandatory = taskTimingOptions.isMandatory
	}

	/**
	 * Determines the maximum amount of milliseconds it will take to complete this task
	 * @param currentTime - The current time
	 * @param nonTaskableTimePerDay - The number of milliseconds per day that you can't spend completing tasks
	 * @returns The maximum amount of milliseconds it will take to complete this task
	 */
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

	/**
	 * Determines the minimum amount of milliseconds you can spend not completing the task
	 * @param currentTime - The current time
	 * @param nonTaskableTimePerDay - The number of milliseconds per day that you can't spend completing tasks
	 * @returns The minimum amount of milliseconds you can spend not completing the task
	 */
	getMinSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMaxRequiredTime(currentTime);
	}

	/**
	 * Determines the maximum amount of milliseconds you can spend not completing the task
	 * @param currentTime - The current time
	 * @param nonTaskableTimePerDay - The number of milliseconds per day that you can't spend completing tasks
	 * @returns The maximum amount of milliseconds you can spend not completing the task
	 */
	getMaxSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMinRequiredTime();
	}

	/**
	 * Determines if the task is urgent
	 * @param currentTime - The current time
	 * @returns Whether the task is urgent
	 */
	isUrgent(currentTime: Date): boolean {
		if (this.deadline === null) {
			return false;
		}

		return this.getTimeToComplete(currentTime) <= this.getMaxRequiredTime(currentTime)
	}

	getIsMandatory(): boolean {return this.isMandatory}
	setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	getIsComplete(): boolean {return this.isComplete}
	protected complete(): void {
		this.isComplete = true;
		this.tasksManager.unSkipSkippedTasks();
	}

	getIsSkipped(): boolean {return this.isSkipped}
	protected skip(): void {
		this.isSkipped = true;
	}

	unSkip(): void {
		this.isSkipped = false;
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
	getState(): TaskState {
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
			lastActionedStep: this.lastActionedStep
		};
	}

	/**
	 * Gets a deep copy of the current state of the task's tasks manager
	 * @returns The state of the tasks manager
	 */
	getTasksManagerState(): TasksManagerState {
		return this.tasksManager.getState();
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
		this.setEarliestStartTime(taskState.earliestStartTime);
		this.setDeadline(taskState.deadline);
		this.minRequiredTime = taskState.minRequiredTime;
		this.maxRequiredTime = taskState.maxRequiredTime;
		this.repeatInterval = taskState.repeatInterval;
		this.setStepsToStatusMap(new Map(taskState.stepsToStatusMap));
		this.lastActionedStep = taskState.lastActionedStep;
	}

	/**
	 * Restores the state of the task from the given state.
	 * @param taskState - The state to restore.
	 */
	restoreTasksManagerState(taskManagerState: TasksManagerState) {
		this.tasksManager.restoreState(taskManagerState);
	}
}
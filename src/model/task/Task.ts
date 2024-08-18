import TaskTimingOptions from "./TaskTimingOptions";
import TasksManager from "../TasksManager";
import TasksManagerState from "../TasksManagerState";
import DateRange from "../time-management/DateRange";
import StepStatus from "./StepStatus";
import TaskState from "./TaskState";
import StateObserver from '../../persistence/observer/StateObserver';
import NotifyStateChange from "../../persistence/observer/NotifyStateChangeDecorator";
import StateObservable from "../../persistence/observer/StateObservable";
import Clonable from "../Clonable";

export default class Task implements StateObservable, Clonable<Task> {
	/**
	 * A map of steps to their status in order of completion. All steps are set to 'Uncomplete' by default.
	 */
	protected description: string;
	protected stepsToStatusMap: Map<string, StepStatus> = new Map();
	protected startTime: Date | null = null;
	protected endTime: Date | null = null;
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
		public stateObserver: StateObserver,
	) {
		this.description = description;
	}

	getClone(): Task {
		const task = new Task(this.tasksManager, this.description, this.stateObserver);
		task.stepsToStatusMap = new Map(this.stepsToStatusMap);
		task.startTime = this.startTime;
		task.endTime = this.endTime;
		task.deadline = this.deadline;
		task.minRequiredTime = this.minRequiredTime;
		task.maxRequiredTime = this.maxRequiredTime;
		task.repeatInterval = this.repeatInterval;
		task.isMandatory = this.isMandatory;
		task.isComplete = this.isComplete;
		task.isSkipped = this.isSkipped;
		task.lastActionedStep = this.lastActionedStep;
		return task;
	}

	getDescription(): string {return this.description};

	@NotifyStateChange
	setDescription(description: string): void {this.description = description};

	@NotifyStateChange
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

	getStartTime(): Date | null {return this.startTime};

	@NotifyStateChange
	setStartTime(startTime: Date | null): void {this.startTime = startTime};

	@NotifyStateChange
	setEndTime(endTime: Date | null): void {this.endTime = endTime};

	getDeadline(): Date | null {return this.deadline};

	@NotifyStateChange
	setDeadline(deadline: Date | null): void {this.deadline = deadline};

	getMinRequiredTime(): number {
		if (this.minRequiredTime === null) {
			return 0;
		}
		return this.minRequiredTime
	};

	@NotifyStateChange
	setMinRequiredTime(minRequiredTime: number | null): void {this.minRequiredTime = minRequiredTime};

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

	@NotifyStateChange
	setMaxRequiredTime(maxRequriedTime: number | null): void {this.maxRequiredTime = maxRequriedTime};

	getRepeatInterval(): number | null {return this.repeatInterval};

	@NotifyStateChange
	setRepeatInterval(repeatInterval: number | null): void {this.repeatInterval = repeatInterval};

	getIsMandatory(): boolean {return this.isMandatory}

	@NotifyStateChange
	setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	getIsComplete(): boolean {return this.isComplete}

	@NotifyStateChange
	setComplete(isComplete: boolean): void {this.isComplete = isComplete}

	getIsSkipped(): boolean {return this.isSkipped}

	@NotifyStateChange
	setSkipped(isSkipped: boolean): void {this.isSkipped = isSkipped}


	@NotifyStateChange
	setLastActionedStep(lastActionedStep: {step: string, status: StepStatus} | null): void {this.lastActionedStep = lastActionedStep};

	isRecurring(): boolean {return this.repeatInterval !== null};

	/**
	 * Makes the task recurring by setting the repeat interval and time the interval should start.
	 * If the deadline is not set or is after the end of the interval, it is set to the end of the interval.
	 *
	 * @param {number} repeatInterval - The interval in milliseconds at which the task should repeat.
	 * @param {Date} intervalStartTime - The time at which the task should start repeating.
	 */
	makeRecurring(repeatInterval: number, intervalStartTime: Date): void {
		this.setRepeatInterval(repeatInterval);
		this.setStartTime(intervalStartTime);

		const intervalEndTime = new Date(this.startTime!.getTime() + repeatInterval);

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
		if (!this.isRecurring() || !this.startTime || !this.repeatInterval) {
			return false;
		}

		const intervalEndTime = new Date(this.startTime.getTime() + this.repeatInterval);

		return currentTime.getTime() > intervalEndTime.getTime();
	};

	/**
	 * Handles resetting a task's interval and progress when the current time passes the end of a task interval.
	 */
	onPastIntervalEndTime(currentTime: Date): void {
		if (!this.isRecurring() || !this.startTime || !this.repeatInterval) {
			return;
		}

		this.resetProgress();

		let isNextIntervalStartTimeInFuture: boolean = false;
		while (!isNextIntervalStartTimeInFuture) {
			const nextIntervalStartTime: Date =
				new Date(this.startTime.getTime() + this.repeatInterval);

			if (nextIntervalStartTime.getTime() > currentTime.getTime()) {
				isNextIntervalStartTimeInFuture = true;
			}
			else {
				this.setStartTime(nextIntervalStartTime);

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
		this.setComplete(false);
		this.setSkipped(false);
		this.setLastActionedStep(null);
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

	removeStartTime(): void {
		this.setStartTime(null);
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

		this.setLastActionedStep({
			step: step,
			status: StepStatus.COMPLETED
		});
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

		this.setLastActionedStep({
			step: step,
			status: StepStatus.SKIPPED
		})
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

		const startTime = this.getStartTime()
		const deadlineDate = this.getDeadline()!;

		let taskDateRange = new DateRange(currentTime, deadlineDate);

		if (
			startTime !== null &&
			currentTime.getTime() < startTime.getTime()
		) {
			taskDateRange = new DateRange(startTime, deadlineDate);
		}

		return taskDateRange.getDurationWithoutTimeWindow(
			this.tasksManager.getAsleepTimeWindow()
		);
	}

	getTaskTimingOptions(): TaskTimingOptions {
		return {
			startTime: this.startTime,
			endTime: this.endTime,
			deadline: this.deadline,
			minRequiredTime: this.minRequiredTime,
			maxRequiredTime: this.maxRequiredTime,
			repeatInterval: this.repeatInterval,
			isMandatory: this.isMandatory
		}
	}

	setFromTaskTimingOptions(taskTimingOptions: TaskTimingOptions): void {
		this.setStartTime(taskTimingOptions.startTime);
		this.setEndTime(taskTimingOptions.endTime);
		this.setDeadline(taskTimingOptions.deadline);
		this.setMinRequiredTime(taskTimingOptions.minRequiredTime);
		this.setMaxRequiredTime(taskTimingOptions.maxRequiredTime);
		this.setRepeatInterval(taskTimingOptions.repeatInterval);
		this.setMandatory(taskTimingOptions.isMandatory)
	}

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

	protected complete(): void {
		this.setComplete(true);
		this.tasksManager.unSkipSkippedTasks();
	}

	protected skip(): void {
		this.setSkipped(true);
	}

	unSkip(): void {
		this.setSkipped(false);
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
			startTime: this.startTime,
			endTime: this.endTime,
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
		this.setDescription(taskState.description);
		this.setComplete(taskState.isComplete);
		this.setMandatory(taskState.isMandatory);
		this.setSkipped(taskState.isSkipped);
		this.setStartTime(taskState.startTime);
		this.setEndTime(taskState.endTime);
		this.setDeadline(taskState.deadline);
		this.setMinRequiredTime(taskState.minRequiredTime);
		this.setMaxRequiredTime(taskState.maxRequiredTime);
		this.setRepeatInterval(taskState.repeatInterval);
		this.setStepsToStatusMap(new Map(taskState.stepsToStatusMap));
		this.setLastActionedStep(taskState.lastActionedStep);
	}

	/**
	 * Restores the state of the task from the given state.
	 * @param taskState - The state to restore.
	 */
	restoreTasksManagerState(taskManagerState: TasksManagerState) {
		this.tasksManager.restoreState(taskManagerState);
	}

	/**
	 * Determines if the task is active at the given time
	 * @param currentTime - The current time
	 * @returns Whether the task is active
	 */
	isActive(currentTime: Date): boolean {
		if (this.isComplete) {
			return false;
		}

		if (
			this.startTime !== null &&
			this.startTime > currentTime
		) {
			return false;
		}

		if (
			this.endTime !== null &&
			this.endTime < currentTime
		) {
			return false;
		}

		return true;
	}
}
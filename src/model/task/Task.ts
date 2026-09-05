import { immerable } from 'immer';
import TaskTimingOptions from "./TaskTimingOptions";
import TasksManager from "../TasksManager";
import DateRange from "../time-management/DateRange";
import StepStatus from "./StepStatus";
import Step from "./Step";
import TaskState from "./TaskState";
import { StartTimeAfterEndTimeError, StartTimeAfterDeadlineError } from "./TaskTimingError";

export default class Task {
	static [immerable] = true;

	readonly id: string = crypto.randomUUID();

	dbId: number | undefined = undefined;

	protected description: string;
	protected steps: Step[] = [];
	protected startTime: Date | null = null;
	protected endTime: Date | null = null;
	protected deadline: Date | null = null;
	protected minRequiredTime: number | null = null;
	protected maxRequiredTime: number | null = null;
	protected repeatInterval: number | null = null;
	protected reccurenceStartTime: Date | null = null;
	protected isMandatory: boolean = false;
	protected isComplete: boolean = false;
	protected isSkipped: boolean = false;
	protected lastActionedStep: {stepID: string, status: StepStatus} | null = null;

	constructor(
		protected tasksManager: TasksManager,
		description: string,
	) {
		this.description = description;
	}

	getDescription(): string {return this.description};

	setDescription(description: string): void {this.description = description};

	replaceAllSteps(steps: Step[]): void {
		this.steps = steps;
	};

	hasSingletonDuration(): boolean {
		return this.minRequiredTime === this.maxRequiredTime;
	}

	static assertStartTimeNotAfterEndTime(startTime: Date | null, endTime: Date | null): void {
		if (startTime !== null && endTime !== null && startTime.getTime() > endTime.getTime()) {
			throw new StartTimeAfterEndTimeError(startTime, endTime);
		}
	}

	static assertStartTimeNotAfterDeadline(startTime: Date | null, deadline: Date | null): void {
		if (startTime !== null && deadline !== null && startTime.getTime() > deadline.getTime()) {
			throw new StartTimeAfterDeadlineError(startTime, deadline);
		}
	}

	getStartTime(): Date | null {return this.startTime};

	setStartTime(startTime: Date | null): void {this.startTime = startTime};

	getEndTime(): Date | null {return this.endTime}

	setEndTime(endTime: Date | null): void {this.endTime = endTime};

	/**
	 * Updates the start time and ensures that the new start time is not after the end time or deadline.
	 * @throws Error if the new start time is after the end time or deadline
	 */
	updateStartTime(newStartTime: Date): void {
		Task.assertStartTimeNotAfterEndTime(newStartTime, this.endTime);
		Task.assertStartTimeNotAfterDeadline(newStartTime, this.deadline);
		this.setStartTime(newStartTime);
	}

	getDeadline(): Date | null {return this.deadline};

	setDeadline(deadline: Date | null): void {this.deadline = deadline};

	getMinRequiredTime(): number {
		if (this.minRequiredTime === null) {
			return 0;
		}
		return this.minRequiredTime
	};

	setMinRequiredTime(minRequiredTime: number | null): void {this.minRequiredTime = minRequiredTime};

	hasMaxRequiredTime(): boolean {
		return this.maxRequiredTime !== null;
	}

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

	setMaxRequiredTime(maxRequriedTime: number | null): void {this.maxRequiredTime = maxRequriedTime};

	getRepeatInterval(): number | null {return this.repeatInterval};

	setRepeatInterval(repeatInterval: number | null): void {this.repeatInterval = repeatInterval};

	getIsMandatory(): boolean {return this.isMandatory}

	setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	getIsComplete(): boolean {return this.isComplete}

	setComplete(isComplete: boolean): void {this.isComplete = isComplete}

	getIsSkipped(): boolean {return this.isSkipped}

	setSkipped(isSkipped: boolean): void {this.isSkipped = isSkipped}

	setLastActionedStep(lastActionedStep: {stepID: string, status: StepStatus} | null): void {this.lastActionedStep = lastActionedStep};

	isRecurring(): boolean {return this.repeatInterval !== null};

	getReccurenceStartTime(): Date | null {return this.reccurenceStartTime};

	setReccurenceStartTime(reccurenceStartTime: Date | null): void {this.reccurenceStartTime = reccurenceStartTime};

	/**
	 * Sets reccurenceStartTime to intervalStartTime. Future occurrences are always
	 * computed from reccurenceStartTime, not from startTime, so deferring startTime (see SkipPopup)
	 * only postpones the current occurrence without shifting later ones.
	 */
	makeRecurring(repeatInterval: number, intervalStartTime: Date): void {
		Task.assertStartTimeNotAfterEndTime(intervalStartTime, this.endTime);

		const intervalEndTime = new Date(intervalStartTime.getTime() + repeatInterval);
		const finalDeadline =
			this.deadline === null || this.deadline.getTime() > intervalEndTime.getTime()
				? intervalEndTime
				: this.deadline;

		Task.assertStartTimeNotAfterDeadline(intervalStartTime, finalDeadline);

		this.setRepeatInterval(repeatInterval);
		this.setReccurenceStartTime(intervalStartTime);
		this.setStartTime(intervalStartTime);
		this.setDeadline(finalDeadline);
	};

	makeNonRecurring(): void {
		this.setRepeatInterval(null);
		this.setReccurenceStartTime(null);
	};

	isPastIntervalEndTime(currentTime: Date): boolean {
		if (!this.isRecurring() || !this.reccurenceStartTime || !this.repeatInterval) {
			return false;
		}

		const intervalEndTime = new Date(this.reccurenceStartTime.getTime() + this.repeatInterval);

		return currentTime.getTime() > intervalEndTime.getTime();
	};

	onPastIntervalEndTime(currentTime: Date): void {
		if (!this.isRecurring() || !this.reccurenceStartTime || !this.repeatInterval) {
			return;
		}

		this.resetProgress();

		let isNextIntervalStartTimeInFuture: boolean = false;
		while (!isNextIntervalStartTimeInFuture) {
			const nextIntervalStartTime: Date =
				new Date(this.reccurenceStartTime.getTime() + this.repeatInterval);

			if (nextIntervalStartTime.getTime() > currentTime.getTime()) {
				isNextIntervalStartTimeInFuture = true;
			}
			else {
				if (this.deadline !== null) {
					const nextIntervalDeadline =
						new Date(this.deadline.getTime() + this.repeatInterval);

					this.setDeadline(nextIntervalDeadline);
				}

				if (this.endTime !== null) {
					const nextIntervalEndTime =
						new Date(this.endTime.getTime() + this.repeatInterval);

					this.setEndTime(nextIntervalEndTime);
				}

				this.setReccurenceStartTime(nextIntervalStartTime);
			}
		}

		this.setStartTime(this.reccurenceStartTime);

		Task.assertStartTimeNotAfterEndTime(this.startTime, this.endTime);
		Task.assertStartTimeNotAfterDeadline(this.startTime, this.deadline);
	};

	protected resetProgress() {
		this.steps.forEach((step) => {
			step.status = StepStatus.UNCOMPLETE;
		});
		this.setComplete(false);
		this.setSkipped(false);
		this.setLastActionedStep(null);
	}

	getSteps(): Step[] {
		return [...this.steps];
	};

	protected hasSteps(): boolean {
		return this.steps.length > 0;
	};

	hasNextStep(): boolean {
		return this.getNextStep() !== null;
	};

	protected getNumSteps(): number {
		return this.steps.length;
	}

	getFirstNotCompletedStep(): Step | null {
		return this.steps.find(step => step.status !== StepStatus.COMPLETED) ?? null;
	}

	getFirstUncompleteStep(): Step | null {
		return this.steps.find(step => step.status === StepStatus.UNCOMPLETE) ?? null;
	}

	getNextSkippedStep(): Step | null {
		if (this.lastActionedStep === null) {
			return null;
		}

		const lastActionedStepID = this.lastActionedStep.stepID;

		let foundLastActionedStep = false;

		const nextSkippedStep = this.steps.find((step) => {
			if (foundLastActionedStep) {
				return step.status === StepStatus.SKIPPED && step.id !== lastActionedStepID;
			}

			if (step.id === lastActionedStepID) {
				foundLastActionedStep = true;
			}

			return false;
		});

		return nextSkippedStep ?? null;
	}

	getNextStep(): Step | null {
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
				return this.getFirstNotCompletedStep();
			}
		}
		else {
			return this.getFirstNotCompletedStep();
		}
	};

	public getStepIndex(stepIDLookingFor: string): number {
		return this.steps.findIndex(step => step.id === stepIDLookingFor);
	}

	getPreviousSteps(): Step[] {
		const nextStep = this.getNextStep();
		if (nextStep === null) return [];

		const nextStepIndex = this.getStepIndex(nextStep.id);
		if (nextStepIndex === -1) return []

		return this.steps.slice(0, nextStepIndex);
	}

	getUpcomingSteps(): Step[] {
		const nextStep = this.getNextStep();
		if (nextStep === null) return [];

		const nextStepIndex = this.getStepIndex(nextStep.id);
		if (nextStepIndex === -1) return []

		return this.steps.slice(nextStepIndex + 1);
	}

	removeDeadline(): void {
		this.setDeadline(null);
	}

	removeStartTime(): void {
		this.setStartTime(null);
	}

	isStepComplete(stepID: string) {
		return this.steps.find(step => step.id === stepID)?.status === StepStatus.COMPLETED
	}

	hasTaskStarted(currentTime: Date): boolean {
		return (
			(this.getStartTime() === null || this.getStartTime()! <= currentTime) &&
			(this.getEndTime() === null || this.getEndTime()! >= currentTime)
		);
	}

	willAlwaysBeAvailable(currentTime: Date): boolean {
		return this.hasTaskStarted(currentTime) && this.getEndTime() === null;
	}

	replaceNextStep(newStepText: string) {
		const nextStep = this.getNextStep();
		if (nextStep === null) return;

		nextStep.text = newStepText;
		nextStep.status = StepStatus.UNCOMPLETE;
	};

	addStep(text: string): Step {
		const newStep: Step = { id: crypto.randomUUID(), text, status: StepStatus.UNCOMPLETE };
		this.steps.push(newStep);
		return newStep;
	};

	insertStep(text: string, index: number): Step {
		const newStep: Step = { id: crypto.randomUUID(), text, status: StepStatus.UNCOMPLETE };
		this.steps.splice(index, 0, newStep);
		return newStep;
	}

	createStepLeftOfStep(adjacentStepID: string): Step {
		const adjacentStepIndex = this.getStepIndex(adjacentStepID);
		return this.insertStep("", adjacentStepIndex === -1 ? this.steps.length : adjacentStepIndex);
	}

	createStepRightOfStep(adjacentStepID: string): Step {
		const adjacentStepIndex = this.getStepIndex(adjacentStepID);
		return this.insertStep("", adjacentStepIndex === -1 ? this.steps.length : adjacentStepIndex + 1);
	}

	protected wasLastActionASkip(): boolean {
		return this.lastActionedStep?.status === StepStatus.SKIPPED;
	}

	protected areAllStepsCompleted(): boolean {
		return this.steps.every((step) => step.status === StepStatus.COMPLETED);
	}

	completeStep(stepID: string) {
		const step = this.steps.find(step => step.id === stepID);
		if (!step) return;

		step.status = StepStatus.COMPLETED;

		if (this.areAllStepsCompleted()) {
			this.complete();
		}

		this.setLastActionedStep({
			stepID: stepID,
			status: StepStatus.COMPLETED
		});
	}

	uncompleteStep(stepID: string) {
		const step = this.steps.find(step => step.id === stepID);
		if (!step) return;

		step.status = StepStatus.UNCOMPLETE;

		if (this.isComplete) {
			this.setComplete(false);
		}
	}

	completeStepAndPrecedingSteps(stepID: string) {
		const stepIndex = this.getStepIndex(stepID);
		if (stepIndex === -1) return;

		this.steps.slice(0, stepIndex + 1).forEach(stepToComplete => {
			if (stepToComplete.status !== StepStatus.COMPLETED) {
				this.completeStep(stepToComplete.id);
			}
		});
	}

	uncompleteStepAndFollowingSteps(stepID: string) {
		const stepIndex = this.getStepIndex(stepID);
		if (stepIndex === -1) return;

		this.steps.slice(stepIndex).forEach(stepToUncomplete => {
			if (stepToUncomplete.status !== StepStatus.UNCOMPLETE) {
				this.uncompleteStep(stepToUncomplete.id);
			}
		});
	}

	completeNextStep() {
		if (!this.hasSteps()) {
			this.complete();
			return;
		}

		const nextStep = this.getNextStep();
		if (nextStep) {
			this.completeStep(nextStep.id);
		}
	}

	completeAllSteps() {
		this.steps.forEach((step) => {
			this.completeStep(step.id);
		});

		this.complete();
	}

	protected areAllStepsActioned(): boolean {
		return this.steps.every((step) => step.status !== StepStatus.UNCOMPLETE);
	}

	getLastSkippedStep(): Step | null {
		return [...this.steps].reverse().find(step => step.status === StepStatus.SKIPPED) ?? null;
	}

	skipStep(stepID: string) {
		const step = this.steps.find(step => step.id === stepID);
		if (!step) return;

		step.status = StepStatus.SKIPPED;

		if (
			this.areAllStepsActioned() &&
			this.getLastSkippedStep()?.id === stepID
		) {
			this.skip();
		}

		this.setLastActionedStep({
			stepID: stepID,
			status: StepStatus.SKIPPED
		})
	}

	skipNextStep() {
		if (!this.hasSteps()) {
			this.skip();
			return;
		}

		const nextStep = this.getNextStep();
		if (nextStep) {
			this.skipStep(nextStep.id);
		}
	}

	editStepsText(newStepTexts: string[]): void {
		const remainingExistingSteps = [...this.steps];
		const originalStatusesByPosition = this.steps.map(step => step.status);

		this.steps = newStepTexts.map((text, position) => {
			const matchingExistingStepIndex = remainingExistingSteps.findIndex(step => step.text === text);

			if (matchingExistingStepIndex !== -1) {
				return remainingExistingSteps.splice(matchingExistingStepIndex, 1)[0];
			}

			const positionalStatus = originalStatusesByPosition[position] ?? StepStatus.UNCOMPLETE;
			return { id: crypto.randomUUID(), text, status: positionalStatus };
		});
	}

	editStepText(stepID: string, newText: string) {
		const step = this.steps.find(step => step.id === stepID);
		if (!step) return;

		step.text = newText;
	}

	reorderSteps(newStepIDOrder: string[]): void {
		const stepIDToStep = new Map(this.steps.map(step => [step.id, step]));
		this.steps = newStepIDOrder
			.map(stepID => stepIDToStep.get(stepID))
			.filter((step): step is Step => step !== undefined);
	}

	deleteStep(stepID: string): void {
		this.steps = this.steps.filter(step => step.id !== stepID);
	}

	getTimeUntilDeadline(currentTime: Date): number {
		if (this.getDeadline() === null) {
			return Number.POSITIVE_INFINITY;
		}
		return this.getDeadline()!.getTime() - currentTime.getTime();
	}

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
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			repeatInterval: this.repeatInterval,
			isMandatory: this.isMandatory
		}
	}

	setFromTaskTimingOptions(taskTimingOptions: TaskTimingOptions): void {
		const isRepeatIntervalChanging = taskTimingOptions.repeatInterval !== this.repeatInterval;
		const isBecomingRecurring = isRepeatIntervalChanging && taskTimingOptions.repeatInterval !== null;
		const finalStartTime = isBecomingRecurring
			? taskTimingOptions.startTime ?? new Date()
			: taskTimingOptions.startTime;

		Task.assertStartTimeNotAfterEndTime(finalStartTime, taskTimingOptions.endTime);
		Task.assertStartTimeNotAfterDeadline(finalStartTime, taskTimingOptions.deadline);

		this.setStartTime(taskTimingOptions.startTime);
		this.setEndTime(taskTimingOptions.endTime);
		this.setDeadline(taskTimingOptions.deadline);
		this.setMinRequiredTime(taskTimingOptions.minDuration);
		this.setMaxRequiredTime(taskTimingOptions.maxDuration);
		this.setMandatory(taskTimingOptions.isMandatory)

		if (isRepeatIntervalChanging && taskTimingOptions.repeatInterval !== null) {
			this.makeRecurring(taskTimingOptions.repeatInterval, taskTimingOptions.startTime ?? new Date());
		}
		else if (isRepeatIntervalChanging && taskTimingOptions.repeatInterval === null) {
			this.makeNonRecurring();
		}
		else {
			this.setRepeatInterval(taskTimingOptions.repeatInterval);
		}
	}

	getMinSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMaxRequiredTime(currentTime);
	}

	getMaxSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMinRequiredTime();
	}

	isUrgent(currentTime: Date): boolean {
		if (this.deadline === null) {
			return false;
		}

		if (!this.isMandatory) {
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

		const completedSteps = this.steps.filter((step) => step.status === StepStatus.COMPLETED).length;

		return completedSteps / this.getNumSteps();
	}

	getState(): TaskState {
		return {
			description: this.description,
			isComplete: this.isComplete,
			isMandatory: this.isMandatory,
			isSkipped: this.isSkipped,
			startTime: this.startTime,
			endTime: this.endTime,
			deadline: this.deadline,
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			repeatInterval: this.repeatInterval,
			reccurenceStartTime: this.reccurenceStartTime,
			steps: this.steps.map(step => ({ ...step })),
			lastActionedStep: this.lastActionedStep
		};
	}

	restoreState(taskState: TaskState) {
		Task.assertStartTimeNotAfterEndTime(taskState.startTime, taskState.endTime);
		Task.assertStartTimeNotAfterDeadline(taskState.startTime, taskState.deadline);

		this.setDescription(taskState.description);
		this.setComplete(taskState.isComplete);
		this.setMandatory(taskState.isMandatory);
		this.setSkipped(taskState.isSkipped);
		this.setStartTime(taskState.startTime);
		this.setEndTime(taskState.endTime);
		this.setDeadline(taskState.deadline);
		this.setMinRequiredTime(taskState.minDuration);
		this.setMaxRequiredTime(taskState.maxDuration);
		this.setRepeatInterval(taskState.repeatInterval);
		this.setReccurenceStartTime(taskState.reccurenceStartTime);
		this.replaceAllSteps(taskState.steps.map(step => ({ ...step })));
		this.setLastActionedStep(taskState.lastActionedStep);
	}

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

	mustStartToday(currentTime: Date): boolean {
		const endOfDay = new Date(currentTime);
		endOfDay.setHours(23, 59, 59, 999);

		const millisecondsUntilEndOfDay = endOfDay.getTime() - currentTime.getTime();

		const minSlackTime = this.getMinSlackTime(currentTime);
		const mustStartTaskToday = minSlackTime <= millisecondsUntilEndOfDay;

		const isTaskActive = this.isActive(currentTime);

		return (
			isTaskActive && mustStartTaskToday
		)
	}
}

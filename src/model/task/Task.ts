import { immerable } from 'immer';
import TaskTimingOptions from "./TaskTimingOptions";
import TasksManager from "../TasksManager";
import DateRange from "../time-management/DateRange";
import StepStatus from "./StepStatus";
import Step from "./Step";
import TaskState from "./TaskState";
import { StartTimeAfterEndTimeError, StartTimeAfterDeadlineError, SkipUntilDateInPastError } from "./TaskTimingError";
import RecurrenceDuration, { addRecurrenceDurations, areRecurrenceDurationsEqual } from "./recurrence/RecurrenceDuration";
import TaskOccurrence from "./recurrence/TaskOccurrence";
import { computeCurrentTaskOccurrence, TaskRecurrenceSnapshot } from "./recurrence/computeTaskOccurrence";

const FIRST_OCCURRENCE_INDEX = 0;

export default class Task {
	static [immerable] = true;

	readonly id: string;

	protected description: string;
	protected steps: Step[] = [];
	protected startTime: Date | null = null;
	protected endTime: Date | null = null;
	protected deadline: Date | null = null;
	protected minRequiredTime: number | null = null;
	protected maxRequiredTime: number | null = null;
	protected recurrenceDuration: RecurrenceDuration | null = null;
	protected shouldNotSkipMissedOccurrences: boolean = false;
	protected completedOccurrenceIndex: number | null = null;
	protected skippedOccurrenceIndex: number | null = null;
	protected progressOccurrenceIndex: number | null = null;
	protected currentOccurrence: TaskOccurrence | null = null;
	protected isMandatory: boolean = false;
	protected isComplete: boolean = false;
	protected isSkipped: boolean = false;
	protected skippedUntil: Date | null = null;
	protected lastActionedStep: {stepID: string, status: StepStatus} | null = null;

	constructor(
		protected tasksManager: TasksManager,
		description: string,
		id: string = crypto.randomUUID(),
	) {
		this.id = id;
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

	getStartTime(): Date | null {
		if (this.currentOccurrence !== null) return this.currentOccurrence.startTime;
		return this.startTime;
	}

	getAnchorStartTime(): Date | null {return this.startTime}

	setStartTime(startTime: Date | null): void {this.startTime = startTime};

	getEndTime(): Date | null {
		if (this.currentOccurrence !== null) return this.currentOccurrence.endTime;
		return this.endTime;
	}

	getAnchorEndTime(): Date | null {return this.endTime}

	setEndTime(endTime: Date | null): void {this.endTime = endTime};

	getDeadline(): Date | null {
		if (this.currentOccurrence !== null) return this.currentOccurrence.deadline;
		return this.deadline;
	}

	getAnchorDeadline(): Date | null {return this.deadline}

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
			if (this.getDeadline() === null) {
				return Number.POSITIVE_INFINITY;
			}
			else {
				return this.getTimeToComplete(currentTime);
			}
		}
		return this.maxRequiredTime
	};

	setMaxRequiredTime(maxRequriedTime: number | null): void {this.maxRequiredTime = maxRequriedTime};

	getRecurrenceDuration(): RecurrenceDuration | null {return this.recurrenceDuration};

	setRecurrenceDuration(recurrenceDuration: RecurrenceDuration | null): void {this.recurrenceDuration = recurrenceDuration};

	getShouldNotSkipMissedOccurrences(): boolean {return this.shouldNotSkipMissedOccurrences}

	setShouldNotSkipMissedOccurrences(shouldNotSkipMissedOccurrences: boolean): void {this.shouldNotSkipMissedOccurrences = shouldNotSkipMissedOccurrences}

	getCompletedOccurrenceIndex(): number | null {return this.completedOccurrenceIndex}

	setCompletedOccurrenceIndex(completedOccurrenceIndex: number | null): void {this.completedOccurrenceIndex = completedOccurrenceIndex}

	getSkippedOccurrenceIndex(): number | null {return this.skippedOccurrenceIndex}

	setSkippedOccurrenceIndex(skippedOccurrenceIndex: number | null): void {this.skippedOccurrenceIndex = skippedOccurrenceIndex}

	getProgressOccurrenceIndex(): number | null {return this.progressOccurrenceIndex}

	setProgressOccurrenceIndex(progressOccurrenceIndex: number | null): void {this.progressOccurrenceIndex = progressOccurrenceIndex}

	getIsMandatory(): boolean {return this.isMandatory}

	setMandatory(isMandatory: boolean): void {this.isMandatory = isMandatory}

	getIsComplete(): boolean {
		if (this.currentOccurrence !== null) {
			return this.completedOccurrenceIndex === this.currentOccurrence.index;
		}
		return this.isComplete;
	}

	setComplete(isComplete: boolean, currentTime: Date = new Date()): void {
		this.isComplete = isComplete;
		if (isComplete) this.setSkippedUntil(null);

		if (this.currentOccurrence === null) return;

		if (isComplete) {
			this.completedOccurrenceIndex = this.currentOccurrence.index;
		}
		else if (this.completedOccurrenceIndex === this.currentOccurrence.index) {
			this.completedOccurrenceIndex = this.getIndexOfOccurrenceBefore(this.currentOccurrence.index);
		}
		this.refreshCurrentOccurrence(currentTime);
	}

	protected getIndexOfOccurrenceBefore(occurrenceIndex: number): number | null {
		if (occurrenceIndex <= FIRST_OCCURRENCE_INDEX) return null;
		return occurrenceIndex - 1;
	}

	getIsSkipped(): boolean {return this.isSkipped}

	setSkipped(isSkipped: boolean): void {this.isSkipped = isSkipped}

	getSkippedUntil(): Date | null {return this.skippedUntil}

	setSkippedUntil(skippedUntil: Date | null): void {this.skippedUntil = skippedUntil}

	/**
	 * Hides the task until skipUntilDate without changing its start time, end time, or deadline.
	 * @throws SkipUntilDateInPastError if skipUntilDate is not after currentTime
	 */
	skipUntil(skipUntilDate: Date, currentTime: Date = new Date()): void {
		if (skipUntilDate.getTime() <= currentTime.getTime()) {
			throw new SkipUntilDateInPastError(skipUntilDate, currentTime);
		}
		this.setSkippedUntil(skipUntilDate);
	}

	cancelSkip(): void {
		this.setSkippedUntil(null);
	}

	setLastActionedStep(lastActionedStep: {stepID: string, status: StepStatus} | null): void {this.lastActionedStep = lastActionedStep};

	isRecurring(): boolean {return this.recurrenceDuration !== null};

	getCurrentOccurrence(): TaskOccurrence | null {return this.currentOccurrence}

	protected getRecurrenceSnapshot(): TaskRecurrenceSnapshot | null {
		if (this.recurrenceDuration === null || this.startTime === null) return null;
		return {
			anchorStartTime: this.startTime,
			anchorEndTime: this.endTime,
			anchorDeadline: this.deadline,
			recurrenceDuration: this.recurrenceDuration,
			completedOccurrenceIndex: this.completedOccurrenceIndex,
			skippedOccurrenceIndex: this.skippedOccurrenceIndex,
			shouldNotSkipMissedOccurrences: this.shouldNotSkipMissedOccurrences,
		};
	}

	refreshCurrentOccurrence(currentTime: Date): void {
		const recurrenceSnapshot = this.getRecurrenceSnapshot();
		if (recurrenceSnapshot === null) {
			this.currentOccurrence = null;
			return;
		}

		this.currentOccurrence = computeCurrentTaskOccurrence(recurrenceSnapshot, currentTime);

		if (this.progressOccurrenceIndex !== this.currentOccurrence.index) {
			this.resetProgress();
			this.progressOccurrenceIndex = this.currentOccurrence.index;
		}
	}

	protected getDefaultDeadlineForAnchorOccurrence(anchorStartTime: Date, recurrenceDuration: RecurrenceDuration, existingDeadline: Date | null): Date {
		const nextOccurrenceStartTime = addRecurrenceDurations(anchorStartTime, recurrenceDuration, 1);
		const isExistingDeadlineWithinFirstOccurrence =
			existingDeadline !== null && existingDeadline.getTime() <= nextOccurrenceStartTime.getTime();
		if (isExistingDeadlineWithinFirstOccurrence) return existingDeadline;
		return nextOccurrenceStartTime;
	}

	makeRecurring(recurrenceDuration: RecurrenceDuration, anchorStartTime: Date, currentTime: Date = new Date()): void {
		Task.assertStartTimeNotAfterEndTime(anchorStartTime, this.endTime);

		const anchorDeadline = this.getDefaultDeadlineForAnchorOccurrence(anchorStartTime, recurrenceDuration, this.deadline);

		Task.assertStartTimeNotAfterDeadline(anchorStartTime, anchorDeadline);

		this.setRecurrenceDuration(recurrenceDuration);
		this.setStartTime(anchorStartTime);
		this.setDeadline(anchorDeadline);
		this.setCompletedOccurrenceIndex(this.isComplete ? FIRST_OCCURRENCE_INDEX : null);
		this.setSkippedOccurrenceIndex(null);
		this.setProgressOccurrenceIndex(FIRST_OCCURRENCE_INDEX);
		this.refreshCurrentOccurrence(currentTime);
	};

	makeNonRecurring(): void {
		const isCurrentOccurrenceComplete = this.getIsComplete();
		this.setStartTime(this.getStartTime());
		this.setEndTime(this.getEndTime());
		this.setDeadline(this.getDeadline());
		this.setRecurrenceDuration(null);
		this.setCompletedOccurrenceIndex(null);
		this.setSkippedOccurrenceIndex(null);
		this.setProgressOccurrenceIndex(null);
		this.currentOccurrence = null;
		this.isComplete = isCurrentOccurrenceComplete;
	};

	skipCurrentOccurrence(currentTime: Date = new Date()): void {
		if (this.currentOccurrence === null) return;
		this.setSkippedOccurrenceIndex(this.currentOccurrence.index);
		this.refreshCurrentOccurrence(currentTime);
	}

	protected reanchorToCurrentOccurrence(): void {
		if (this.currentOccurrence === null) return;

		const currentIndex = this.currentOccurrence.index;
		this.setStartTime(this.currentOccurrence.startTime);
		this.setEndTime(this.currentOccurrence.endTime);
		this.setDeadline(this.currentOccurrence.deadline);
		this.setCompletedOccurrenceIndex(this.completedOccurrenceIndex === currentIndex ? FIRST_OCCURRENCE_INDEX : null);
		this.setSkippedOccurrenceIndex(this.skippedOccurrenceIndex === currentIndex ? FIRST_OCCURRENCE_INDEX : null);
		this.setProgressOccurrenceIndex(FIRST_OCCURRENCE_INDEX);
	}

	protected resetProgress() {
		this.steps.forEach((step) => {
			step.status = StepStatus.UNCOMPLETE;
		});
		this.setSkipped(false);
		this.setSkippedUntil(null);
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

		if (this.getIsComplete()) {
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
			startTime: this.getStartTime(),
			endTime: this.getEndTime(),
			deadline: this.getDeadline(),
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			recurrenceDuration: this.recurrenceDuration,
			shouldNotSkipMissedOccurrences: this.shouldNotSkipMissedOccurrences,
			isMandatory: this.isMandatory
		}
	}

	protected static areNullableDatesEqual(left: Date | null, right: Date | null): boolean {
		if (left === null || right === null) return left === right;
		return left.getTime() === right.getTime();
	}

	protected isOccurrenceScheduleChanging(taskTimingOptions: TaskTimingOptions): boolean {
		return (
			!Task.areNullableDatesEqual(taskTimingOptions.startTime, this.getStartTime()) ||
			!Task.areNullableDatesEqual(taskTimingOptions.endTime, this.getEndTime()) ||
			!Task.areNullableDatesEqual(taskTimingOptions.deadline, this.getDeadline()) ||
			!areRecurrenceDurationsEqual(taskTimingOptions.recurrenceDuration, this.recurrenceDuration)
		);
	}

	setFromTaskTimingOptions(taskTimingOptions: TaskTimingOptions, currentTime: Date = new Date()): void {
		const wasRecurring = this.isRecurring();
		const recurrenceDuration = taskTimingOptions.recurrenceDuration;
		const finalStartTime = recurrenceDuration !== null
			? taskTimingOptions.startTime ?? currentTime
			: taskTimingOptions.startTime;

		Task.assertStartTimeNotAfterEndTime(finalStartTime, taskTimingOptions.endTime);
		Task.assertStartTimeNotAfterDeadline(finalStartTime, taskTimingOptions.deadline);

		this.setMinRequiredTime(taskTimingOptions.minDuration);
		this.setMaxRequiredTime(taskTimingOptions.maxDuration);
		this.setMandatory(taskTimingOptions.isMandatory);
		this.setShouldNotSkipMissedOccurrences(taskTimingOptions.shouldNotSkipMissedOccurrences);

		if (wasRecurring && recurrenceDuration === null) {
			this.makeNonRecurring();
		}

		if (wasRecurring && recurrenceDuration !== null) {
			if (!this.isOccurrenceScheduleChanging(taskTimingOptions)) {
				this.refreshCurrentOccurrence(currentTime);
				return;
			}
			this.reanchorToCurrentOccurrence();
		}

		this.setStartTime(finalStartTime);
		this.setEndTime(taskTimingOptions.endTime);
		this.setDeadline(taskTimingOptions.deadline);

		if (recurrenceDuration === null) return;

		if (!wasRecurring) {
			this.makeRecurring(recurrenceDuration, finalStartTime as Date, currentTime);
			return;
		}

		this.setRecurrenceDuration(recurrenceDuration);
		this.refreshCurrentOccurrence(currentTime);
	}

	getMinSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMaxRequiredTime(currentTime);
	}

	getMaxSlackTime(currentTime: Date): number {
		return this.getTimeToComplete(currentTime) - this.getMinRequiredTime();
	}

	isUrgent(currentTime: Date): boolean {
		if (this.getDeadline() === null) {
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
			skippedUntil: this.skippedUntil,
			startTime: this.startTime,
			endTime: this.endTime,
			deadline: this.deadline,
			minDuration: this.minRequiredTime,
			maxDuration: this.maxRequiredTime,
			recurrenceDuration: this.recurrenceDuration === null ? null : { ...this.recurrenceDuration },
			shouldNotSkipMissedOccurrences: this.shouldNotSkipMissedOccurrences,
			completedOccurrenceIndex: this.completedOccurrenceIndex,
			skippedOccurrenceIndex: this.skippedOccurrenceIndex,
			progressOccurrenceIndex: this.progressOccurrenceIndex,
			steps: this.steps.map(step => ({ ...step })),
			lastActionedStep: this.lastActionedStep
		};
	}

	restoreState(taskState: TaskState, currentTime: Date = new Date()) {
		Task.assertStartTimeNotAfterEndTime(taskState.startTime, taskState.endTime);
		Task.assertStartTimeNotAfterDeadline(taskState.startTime, taskState.deadline);

		this.setDescription(taskState.description);
		this.isComplete = taskState.isComplete;
		this.setMandatory(taskState.isMandatory);
		this.setSkipped(taskState.isSkipped);
		this.setSkippedUntil(taskState.skippedUntil);
		this.setStartTime(taskState.startTime);
		this.setEndTime(taskState.endTime);
		this.setDeadline(taskState.deadline);
		this.setMinRequiredTime(taskState.minDuration);
		this.setMaxRequiredTime(taskState.maxDuration);
		this.setRecurrenceDuration(taskState.recurrenceDuration === null ? null : { ...taskState.recurrenceDuration });
		this.setShouldNotSkipMissedOccurrences(taskState.shouldNotSkipMissedOccurrences);
		this.setCompletedOccurrenceIndex(taskState.completedOccurrenceIndex);
		this.setSkippedOccurrenceIndex(taskState.skippedOccurrenceIndex);
		this.setProgressOccurrenceIndex(taskState.progressOccurrenceIndex);
		this.replaceAllSteps(taskState.steps.map(step => ({ ...step })));
		this.setLastActionedStep(taskState.lastActionedStep);
		this.refreshCurrentOccurrence(currentTime);
	}

	isActive(currentTime: Date): boolean {
		if (
			this.skippedUntil !== null &&
			this.skippedUntil > currentTime
		) {
			return false;
		}

		return this.isActiveIgnoringSkip(currentTime);
	}

	isActiveIgnoringSkip(currentTime: Date): boolean {
		if (this.getIsComplete()) {
			return false;
		}

		const startTime = this.getStartTime();
		if (startTime !== null && startTime > currentTime) {
			return false;
		}

		const endTime = this.getEndTime();
		if (endTime !== null && endTime < currentTime) {
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

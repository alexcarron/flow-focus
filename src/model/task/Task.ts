import { immerable } from 'immer';
import TaskTimingOptions from "./TaskTimingOptions";
import TasksManager from "../TasksManager";
import DateRange from "../time-management/DateRange";
import StepStatus from "./StepStatus";
import TaskState from "./TaskState";

export default class Task {
	static [immerable] = true;

	dbId: number | undefined = undefined;

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
	) {
		this.description = description;
	}

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

	hasSingletonDuration(): boolean {
		return this.minRequiredTime === this.maxRequiredTime;
	}

	getStartTime(): Date | null {return this.startTime};

	setStartTime(startTime: Date | null): void {this.startTime = startTime};

	getEndTime(): Date | null {return this.endTime}

	setEndTime(endTime: Date | null): void {this.endTime = endTime};

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

	setLastActionedStep(lastActionedStep: {step: string, status: StepStatus} | null): void {this.lastActionedStep = lastActionedStep};

	isRecurring(): boolean {return this.repeatInterval !== null};

	makeRecurring(repeatInterval: number, intervalStartTime: Date): void {
		this.setRepeatInterval(repeatInterval);
		this.setStartTime(intervalStartTime);

		const intervalEndTime = new Date(this.startTime!.getTime() + repeatInterval);

		if (
			this.deadline === null ||
			this.deadline.getTime() > intervalEndTime.getTime()
		) {
			this.setDeadline(intervalEndTime);
		}
	};

	isPastIntervalEndTime(currentTime: Date): boolean {
		if (!this.isRecurring() || !this.startTime || !this.repeatInterval) {
			return false;
		}

		const intervalEndTime = new Date(this.startTime.getTime() + this.repeatInterval);

		return currentTime.getTime() > intervalEndTime.getTime();
	};

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

				if (this.endTime !== null) {
					const nextIntervalEndTime =
						new Date(this.endTime.getTime() + this.repeatInterval);

					this.setEndTime(nextIntervalEndTime);
				}
			}
		}

	};

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

	protected hasSteps(): boolean {
		return this.stepsToStatusMap.size > 0;
	};

	hasNextStep(): boolean {
		return this.getNextStep() !== null;
	};

	protected getNumSteps(): number {
		return this.stepsToStatusMap.size;
	}

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

	getNextSkippedStep(): string | null {
		if (this.lastActionedStep === null) {
			return null;
		}

		const lastStepActioned = this.lastActionedStep.step;

		let foundLastStepActioned = false;

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
				return this.getFirstNotCompletedStep();
			}
		}
		else {
			return this.getFirstNotCompletedStep();
		}
	};

	public getStepIndex(stepLookingFor: string): number {
		const steps = this.getSteps();
		return steps.findIndex(step => step === stepLookingFor);
	}

	getPreviousSteps(): string[] {
		const nextStep = this.getNextStep();
		if (nextStep === null) return [];

		const nextStepIndex = this.getStepIndex(nextStep);
		if (nextStepIndex === -1) return []

		const stepsBeforeNextStep = Array.from(this.getSteps())
			.slice(0, nextStepIndex);

		return stepsBeforeNextStep;
	}

	getUpcomingSteps(): string[] {
		const nextStep = this.getNextStep();
		if (nextStep === null) return [];

		const nextStepIndex = this.getStepIndex(nextStep);
		if (nextStepIndex === -1) return []

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

	isStepComplete(step: string) {
		return this.stepsToStatusMap.get(step) === StepStatus.COMPLETED
	}

	hasTaskStarted(currentTime: Date): boolean {
		return (
			this.getStartTime() === null || this.getStartTime()! <= currentTime &&
			this.getEndTime() === null || this.getEndTime()! >= currentTime
		);
	}

	willAlwaysBeAvailable(currentTime: Date): boolean {
		return this.hasTaskStarted(currentTime) && this.getEndTime() === null;
	}

	replaceNextStep(newNextStep: string) {
		const nextStep = this.getNextStep();

		if (nextStep) {
			const nextStepIndex = this.getStepIndex(nextStep);

			if (nextStepIndex !== -1) {
				const entriesAfterNextUncompletedStep = Array.from(this.stepsToStatusMap.entries()).slice(nextStepIndex + 1);

				entriesAfterNextUncompletedStep.forEach(
					([step, status]) => this.stepsToStatusMap.delete(step)
				);

				this.stepsToStatusMap.delete(nextStep);

				this.stepsToStatusMap.set(newNextStep, StepStatus.UNCOMPLETE);

				entriesAfterNextUncompletedStep.forEach(([step, status]) => this.stepsToStatusMap.set(step, status));
			}
		}
	};

	addStep(step: string): void {
		this.stepsToStatusMap.set(step, StepStatus.UNCOMPLETE);
	};

	insertStep(step: string, index: number) {
		const currentSteps = this.getSteps();
		const newSteps = [
			...currentSteps.slice(0, index),
			step,
			...currentSteps.slice(index)
		]
		this.editSteps(newSteps);
	}

	createStepLeftOfStep(adjacentStep: string) {
		const adjacentStepIndex = this.getStepIndex(adjacentStep);
		this.insertStep("", adjacentStepIndex);
	}

	createStepRightOfStep(adjacentStep: string) {
		const adjacentStepIndex = this.getStepIndex(adjacentStep);
		this.insertStep("", adjacentStepIndex + 1);
	}

	protected wasLastActionASkip(): boolean {
		return this.lastActionedStep?.status === StepStatus.SKIPPED;
	}

	protected areAllStepsCompleted(): boolean {
		return Array.from(this.stepsToStatusMap.values())
			.every((status) => status === StepStatus.COMPLETED);
	}

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

	uncompleteStep(step: string) {
		this.stepsToStatusMap.set(step, StepStatus.UNCOMPLETE);
	}

	completeStepAndPrecedingSteps(step: string) {
		const stepIndex = this.getStepIndex(step);
		if (stepIndex === -1) return;

		this.getSteps().slice(0, stepIndex + 1).forEach(stepToComplete => {
			if (this.stepsToStatusMap.get(stepToComplete) !== StepStatus.COMPLETED) {
				this.completeStep(stepToComplete);
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
			this.completeStep(nextStep);
		}
	}

	completeAllSteps() {
		this.stepsToStatusMap.forEach((status, step) => {
			this.completeStep(step);
		});

		this.complete();
	}

	protected areAllStepsActioned(): boolean {
		return Array.from(this.stepsToStatusMap.values())
			.every((status) => status !== StepStatus.UNCOMPLETE);
	}

	getLastSkippedStep(): string | null {
		const lastSkippedStep = Array.from(this.stepsToStatusMap.entries())
			.reverse()
			.find(([step, status]) => status === StepStatus.SKIPPED);

		return lastSkippedStep?.[0] ?? null;
	}

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

	editStep(oldStep: string, newStep: string) {
		const currentSteps = this.getSteps();

		const newSteps = currentSteps.map(step => {
			if (step === oldStep)
				return newStep

			return step
		});

		this.editSteps(newSteps);
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
		this.setStartTime(taskTimingOptions.startTime);
		this.setEndTime(taskTimingOptions.endTime);
		this.setDeadline(taskTimingOptions.deadline);
		this.setMinRequiredTime(taskTimingOptions.minDuration);
		this.setMaxRequiredTime(taskTimingOptions.maxDuration);
		this.setRepeatInterval(taskTimingOptions.repeatInterval);
		this.setMandatory(taskTimingOptions.isMandatory)
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

		const completedSteps = Array.from(this.stepsToStatusMap.values())
			.filter((status) => status === StepStatus.COMPLETED)
			.length;

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
			stepsToStatusMap: new Map(this.stepsToStatusMap),
			lastActionedStep: this.lastActionedStep
		};
	}

	restoreState(taskState: TaskState) {
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
		this.setStepsToStatusMap(new Map(taskState.stepsToStatusMap));
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

	equals(otherTask: Task) {
		return (
			this.getDescription() == otherTask.getDescription() &&
			this.getSteps().join(",") == otherTask.getSteps().join(",") &&
			this.getStartTime() == otherTask.getStartTime() &&
			this.getEndTime() == otherTask.getEndTime() &&
			this.getDeadline() == otherTask.getDeadline() &&
			this.getRepeatInterval() == otherTask.getRepeatInterval()
		)
	}
}

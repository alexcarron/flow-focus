import StepStatus from "../../model/task/StepStatus";
import Task from "../../model/task/Task";
import TaskState from "../../model/task/TaskState";
import TaskTimingOptions from "../../model/task/TaskTimingOptions";
import TasksManager from "../../model/TasksManager";
import StateObserver from "./StateObserver";

export default class ObservedTask extends Task {
	public constructor(
		tasksManager: TasksManager,
		description: string,
		private stateObserver: StateObserver,
	) {
		super(tasksManager, description);
	}

	override setDescription(description: string): void {
		super.setDescription(description);
		this.stateObserver.onStateChange();
	}

	override setStepsToStatusMap(stepsToStatusObject: Array<[string, StepStatus | string]> | Map<string, StepStatus>): void {
		super.setStepsToStatusMap(stepsToStatusObject);
		this.stateObserver.onStateChange();
	}

	override setEarliestStartTime(earliestStartTime: Date | null): void {
		super.setEarliestStartTime(earliestStartTime);
		this.stateObserver.onStateChange();
	}

	override setDeadline(deadline: Date | null): void {
		super.setDeadline(deadline);
		this.stateObserver.onStateChange();
	}

	override setMinRequiredTime(minDuration: number | null): void {
		super.setMinRequiredTime(minDuration);
		this.stateObserver.onStateChange();
	}

	override setMaxRequiredTime(maxDuration: number | null): void {
		super.setMaxRequiredTime(maxDuration);
		this.stateObserver.onStateChange();
	}

	override setMandatory(isMandatory: boolean): void {
		super.setMandatory(isMandatory);
		this.stateObserver.onStateChange();
	}

	override makeRecurring(repeatInterval: number, repeatStartTime: Date): void {
		super.makeRecurring(repeatInterval, repeatStartTime);
		this.stateObserver.onStateChange();
	}

	override onPastIntervalEndTime(currentTime: Date): void {
		super.onPastIntervalEndTime(currentTime);
		this.stateObserver.onStateChange();
	}

	override resetProgress(): void {
		super.resetProgress();
		this.stateObserver.onStateChange();
	}

	override replaceNextStep(newNextStep: string): void {
		super.replaceNextStep(newNextStep);
		this.stateObserver.onStateChange();
	}

	override addStep(step: string): void {
		super.addStep(step);
		this.stateObserver.onStateChange();
	}

	override completeStep(step: string): void {
		super.completeStep(step);
		this.stateObserver.onStateChange();
	}

	override skipStep(step: string): void {
		super.skipStep(step);
		this.stateObserver.onStateChange();
	}

	override editSteps(newSteps: string[]): void {
		super.editSteps(newSteps);
		this.stateObserver.onStateChange();
	}

	override complete(): void {
		super.complete();
		this.stateObserver.onStateChange();
	}

	override skip(): void {
		super.skip();
		this.stateObserver.onStateChange();
	}

	override restoreState(taskState: TaskState): void {
		super.restoreState(taskState);
		this.stateObserver.onStateChange();
	}

	override setFromTaskTimingOptions(taskTimingOptions: TaskTimingOptions): void {
		super.setFromTaskTimingOptions(taskTimingOptions);
		this.stateObserver.onStateChange();
	}
}
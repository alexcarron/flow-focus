import StepStatus from "../../model/task/StepStatus";
import Task from "../../model/task/Task";
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

	override setStartTime(startTime: Date | null): void {
		super.setStartTime(startTime);
		this.stateObserver.onStateChange();
	}

	override setEndTime(endTime: Date | null): void {
		super.setEndTime(endTime);
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

	override setRepeatInterval(repeatInterval: number | null): void {
		super.setRepeatInterval(repeatInterval);
		this.stateObserver.onStateChange();
	}

	override setMandatory(isMandatory: boolean): void {
		super.setMandatory(isMandatory);
		this.stateObserver.onStateChange();
	}

	override setComplete(isComplete: boolean): void {
		super.setComplete(isComplete);
		this.stateObserver.onStateChange();
	}

	override setSkipped(isSkipped: boolean): void {
		super.setSkipped(isSkipped);
		this.stateObserver.onStateChange();
	}

	override setLastActionedStep(lastActionedStep: { step: string; status: StepStatus; } | null): void {
		super.setLastActionedStep(lastActionedStep);
		this.stateObserver.onStateChange();
	}
}
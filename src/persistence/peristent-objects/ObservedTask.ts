import Task from "../../model/Task";
import StateObserver from "./StateObserver";

export default class ObservedTask extends Task {
	public constructor(
		description: string,
		private stateObserver: StateObserver
	) {
		super(description);
	}

	override setDescription(description: string): void {
		super.setDescription(description);
		this.stateObserver.onStateChange();
	}

	override replaceNextUncompletedStep(newNextStep: string): void {
		super.replaceNextUncompletedStep(newNextStep);
		this.stateObserver.onStateChange();
	}

	override addStep(step: string): void {
		super.addStep(step);
		this.stateObserver.onStateChange();
	}

	override setEarliestStartTime(earliestStartTime: Date): void {
		super.setEarliestStartTime(earliestStartTime);
		this.stateObserver.onStateChange();
	}

	override setDeadline(deadline: Date): void {
		super.setDeadline(deadline);
		this.stateObserver.onStateChange();
	}

	override setMinDuration(minDuration: number): void {
		super.setMinDuration(minDuration);
		this.stateObserver.onStateChange();
	}

	override setMaxDuration(maxDuration: number): void {
		super.setMaxDuration(maxDuration);
		this.stateObserver.onStateChange();
	}

	override setMandatory(isMandatory: boolean): void {
		super.setMandatory(isMandatory);
		this.stateObserver.onStateChange();
	}

	override complete(): void {
		super.complete();
		this.stateObserver.onStateChange();
	}
}
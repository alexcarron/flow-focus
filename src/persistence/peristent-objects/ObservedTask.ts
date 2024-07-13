import Task from "../../model/Task";
import StateObserver from "./StateObserver";

export default class ObservedTask extends Task {
	public constructor(
		private stateObserver: StateObserver,
		description: string,
	) {
		super(description);
	}

	override setDescription(description: string): void {
		super.setDescription(description);
		this.stateObserver.onStateChange();
	}

	override makeRecurring(repeatInterval: number, repeatStartTime: Date): void {
		super.makeRecurring(repeatInterval, repeatStartTime);
		this.stateObserver.onStateChange();
	}

	override onPastIntervalEndTime(): void {
		super.onPastIntervalEndTime();
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

	override setMinRequiredTime(minDuration: number): void {
		super.setMinRequiredTime(minDuration);
		this.stateObserver.onStateChange();
	}

	override setMaxRequiredTime(maxDuration: number): void {
		super.setMaxRequiredTime(maxDuration);
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
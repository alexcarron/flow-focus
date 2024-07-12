import Task from "../../model/Task";
import StateObserver from "./StateObserver";

export default class ObservedTask extends Task {
	public constructor(
		description: string,
		private stateObserver: StateObserver
	) {
		super(description);
	}

	/**
	 * Sets the description of the task and saves it to the persistence manager.
	 * @param description - The description of the task.
	 */
	override setDescription(description: string): void {
		super.setDescription(description);
		this.stateObserver.onStateChange();
	}

	/**
	 * Replaces the next step of the task and saves it to the persistence manager.
	 * @param newNextStep - The new next step of the task.
	 */
	override replaceNextStep(newNextStep: string): void {
		super.replaceNextStep(newNextStep);
		this.stateObserver.onStateChange();
	}

	/**
	 * Adds a step to the task and saves it to the persistence manager.
	 * @param step - The step to add.
	 */
	override addStep(step: string): void {
		super.addStep(step);
		this.stateObserver.onStateChange();
	}

	/**
	 * Sets the deadline of the task and saves it to the persistence manager.
	 * @param deadline - The deadline of the task.
	 */
	override setDeadline(deadline: Date): void {
		super.setDeadline(deadline);
		this.stateObserver.onStateChange();
	}

	/**
	 * Sets the mandatory status of the task and saves it to the persistence manager.
	 * @param isMandatory - The new mandatory status of the task.
	 */
	override setMandatory(isMandatory: boolean): void {
		super.setMandatory(isMandatory);
		this.stateObserver.onStateChange();
	}

	/**
	 * Completes the task and saves it to the persistence manager.
	 */
	override complete(): void {
		super.complete();
		this.stateObserver.onStateChange();
	}

}
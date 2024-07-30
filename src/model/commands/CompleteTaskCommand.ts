import EditTaskCommand from "./EditTaskCommand";

export default class CompleteTaskCommand extends EditTaskCommand {
	public doAction(): void {
		this.task.completeNextStep();
	}

	public toString(): string {
		return `Completing Next Step of "${this.task.getDescription()}"`
	}
}
import EditTaskCommand from "./EditTaskCommand";

export default class CompleteAllTaskCommand extends EditTaskCommand {
	public doAction(): void {
		this.task.completeAllSteps();
	}

	public toString(): string {
		return `Completing all steps of "${this.task.getDescription()}"`
	}
}
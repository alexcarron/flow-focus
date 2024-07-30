import EditTaskCommand from "./EditTaskCommand";

export default class SkipTaskCommand extends EditTaskCommand {
	public doAction(): void {
		this.task.skipNextStep();
	}

	public toString(): string {
		return `Skipping Next Step of "${this.task.getDescription()}"`
	}
}
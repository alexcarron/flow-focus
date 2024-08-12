import Task from "../task/Task";
import EditTaskCommand from "./EditTaskCommand";

export default class EditTaskStepsCommand extends EditTaskCommand {

	constructor(task: Task,
		private newSteps: string[]
	) {
		super(task);
	}

	public doAction(): void {
		this.task.editSteps(this.newSteps);
	}

	public toString(): string {
		return `Replacing "${this.task.getSteps()}" steps with "${this.newSteps}"`
	}
}
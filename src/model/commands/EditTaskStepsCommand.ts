import Task from "../task/Task";
import EditTaskCommand from "./EditTaskCommand";
import UndoableCommand from "./UndoableCommand";

export default class EditTaskStepCommand extends EditTaskCommand {

	constructor(task: Task,
		private newStep: string
	) {
		super(task);
	}

	public doAction(): void {
		this.task.replaceNextStep(this.newStep);
	}

	public toString(): string {
		return `Replacing "${this.task.getDescription()}"'s next step with "${this.newStep}"`
	}
}
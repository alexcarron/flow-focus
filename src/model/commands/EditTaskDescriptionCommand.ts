import Task from "../task/Task";
import EditTaskCommand from "./EditTaskCommand";

export default class EditTaskDescriptionCommand extends EditTaskCommand {
	constructor(task: Task,
		private newDescription: string
	) {
		super(task);
	}

	public doAction(): void {
		this.task.setDescription(this.newDescription);
	}

	public toString(): string {
		return `Editing "${this.task.getDescription()}"'s description from "${this.getTaskStateBefore()?.description}" to "${this.getTaskStateAfter()?.description}"`
	}
}
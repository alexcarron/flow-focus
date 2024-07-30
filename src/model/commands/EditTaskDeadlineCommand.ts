import Task from "../task/Task";
import EditTaskCommand from "./EditTaskCommand";

export default class EditTaskDeadlineCommand extends EditTaskCommand {
	constructor(task: Task,
		private newDeadline: Date
	) {
		super(task);
	}

	public doAction(): void {
		this.task.setDeadline(this.newDeadline);
	}

	public toString(): string {
		const taskStateBefore = this.getTaskStateBefore();
		const taskStateAfter = this.getTaskStateAfter();

		return `Editing "${this.task.getDescription()}"'s deadline from "${taskStateBefore?.deadline}" to "${taskStateAfter?.deadline}"`
	}
}
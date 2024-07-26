import Task from "../task/Task";
import UndoableCommand from "./UndoableCommand";

export default class EditTaskDescriptionCommand implements UndoableCommand {
	private task: Task;
	private oldDescription: string;
	private newDescription: string;

	constructor(task: Task, newDescription: string) {
		this.task = task;
		this.oldDescription = task.getDescription();
		this.newDescription = newDescription;
	}

	public undo(): void {
		this.task.setDescription(this.oldDescription);
	}

	public redo(): void {
		this.task.setDescription(this.newDescription);
	}

	public toString(): string {
		return `Editing "${this.task.getDescription()}"'s description from "${this.oldDescription}" to "${this.newDescription}"`
	}
}
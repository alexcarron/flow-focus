import Task from "../Task";
import UndoableCommand from "./UndoableCommand";

export default class CompleteTaskCommand implements UndoableCommand {
	private task: Task;

	constructor(task: Task) {
		this.task = task;
	}

	public undo(): void {
		this.task.undoComplete();
	}

	public redo(): void {
		this.task.complete();
	}

	public toString(): string {
		return `Completing "${this.task.getDescription()}"`
	}
}
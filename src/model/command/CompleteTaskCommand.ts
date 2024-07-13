import Task from "../Task";
import UndoableCommand from "./UndoableCommand";

export default class CompleteTaskCommand implements UndoableCommand {
	private task: Task;

	constructor(task: Task) {
		this.task = task;
	}

	public undo(): void {
		this.task.undoCompleteStep();
	}

	public redo(): void {
		this.task.completeStep();
	}

	public toString(): string {
		return `Completing Next Step of "${this.task.getDescription()}"`
	}
}
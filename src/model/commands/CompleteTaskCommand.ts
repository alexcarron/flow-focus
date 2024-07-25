import Task from "../task/Task";
import TaskState from "../task/TaskState";
import UndoableCommand from "./UndoableCommand";

export default class CompleteTaskCommand implements UndoableCommand {
	private task: Task;
	private taskStateBefore: TaskState;

	constructor(task: Task) {
		this.task = task;
		this.taskStateBefore = task.getCurrentState();
	}

	public undo(): void {
		this.task.restoreState(this.taskStateBefore);
	}

	public redo(): void {
		this.task.completeNextStep();
	}

	public toString(): string {
		return `Completing Next Step of "${this.task.getDescription()}"`
	}
}
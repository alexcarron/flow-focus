import Task from "../task/Task";
import TaskState from "../task/TaskState";
import UndoableCommand from "./UndoableCommand";

export default class SkipTaskCommand implements UndoableCommand {
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
		this.task.skipNextStep();
	}

	public toString(): string {
		return `Skipping Next Step of "${this.task.getDescription()}"`
	}
}
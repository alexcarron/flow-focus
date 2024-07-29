import Task from "../task/Task";
import TasksManagerState from "../TasksManagerState";
import UndoableCommand from "./UndoableCommand";

export default class SkipTaskCommand implements UndoableCommand {
	private task: Task;
	private tasksStateBefore: TasksManagerState;

	constructor(task: Task) {
		this.task = task;
		this.tasksStateBefore = task.getTasksManagerState();
	}

	public undo(): void {
		this.task.restoreTasksManagerState(this.tasksStateBefore);
	}

	public redo(): void {
		this.task.skipNextStep();
	}

	public toString(): string {
		return `Skipping Next Step of "${this.task.getDescription()}"`
	}
}
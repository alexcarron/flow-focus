import Task from "../task/Task";
import TasksManagerState from "../TasksManagerState";
import UndoableCommand from "./UndoableCommand";

export default class SkipTaskCommand implements UndoableCommand {
	private task: Task;
	private tasksStateBefore: TasksManagerState;
	private tasksStateAfter: TasksManagerState | null = null;

	constructor(task: Task) {
		this.task = task;
		this.tasksStateBefore = task.getTasksManagerState();
	}

	public execute(): void {
		this.task.skipNextStep();
		this.tasksStateAfter = this.task.getTasksManagerState();
	}

	public undo(): void {
		this.task.restoreTasksManagerState(this.tasksStateBefore);
	}

	public redo(): void {
		if (this.tasksStateAfter !== null) {
			this.task.restoreTasksManagerState(this.tasksStateAfter);
		}
	}

	public toString(): string {
		return `Skipping Next Step of "${this.task.getDescription()}"`
	}
}
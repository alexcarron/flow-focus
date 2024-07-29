import Task from "../task/Task";
import TasksManagerState from "../TasksManagerState";
import UndoableCommand from "./UndoableCommand";

export default class CompleteTaskCommand implements UndoableCommand {
	private task: Task;
	private tasksStateBefore: TasksManagerState;
	private tasksStateAfter: TasksManagerState | null = null;

	constructor(task: Task) {
		this.task = task;
		this.tasksStateBefore = task.getTasksManagerState();
	}

	public execute(): void {
		this.task.completeNextStep();
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
		return `Completing Next Step of "${this.task.getDescription()}"`
	}
}
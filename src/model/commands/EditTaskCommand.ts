import Task from "../task/Task";
import TaskState from "../task/TaskState";
import TasksManagerState from "../TasksManagerState";
import UndoableCommand from "./UndoableCommand";

export default abstract class EditTaskCommand implements UndoableCommand {
	protected task: Task;
	protected tasksStateBefore: TasksManagerState;
	protected tasksStateAfter: TasksManagerState | null = null;

	constructor(task: Task) {
		this.task = task;
		this.tasksStateBefore = task.getTasksManagerState();
	}

	protected abstract doAction(): void;
	public execute(): void {
		this.doAction();
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

	public abstract toString(): string;

	protected getTaskStateBefore(): TaskState | undefined {
		return this.tasksStateBefore.tasks.find(task => task.deadline === this.task.getDeadline())
	}

	protected getTaskStateAfter(): TaskState | undefined {
		return this.tasksStateAfter?.tasks.find(task => task.deadline === this.task.getDeadline())
	}
}
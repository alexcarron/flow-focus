import Task from "../task/Task";
import UndoableCommand from "./UndoableCommand";

export default class EditTaskStepsCommand implements UndoableCommand {
	private task: Task;
	private oldSteps: string[];
	private newSteps: string[];

	constructor(task: Task, newSteps: string[] | string) {
		this.task = task;
		this.oldSteps = task.getSteps();

		if (Array.isArray(newSteps)) {
			this.newSteps = newSteps;
		}
		else if (this.oldSteps.length === 0) {
			this.newSteps = [newSteps];
		}
		else {
			let newStepsArray = this.oldSteps;
			newStepsArray[this.oldSteps.length - 1] = newSteps;
			this.newSteps = newStepsArray;
		}
	}

	public execute(): void {
		this.task.editSteps(this.newSteps);
	}

	public undo(): void {
		this.task.editSteps(this.oldSteps);
	}

	public redo(): void {
		this.execute();
	}

	public toString(): string {
		return `Editing "${this.task.getDescription()}"'s steps from "${this.oldSteps}" to "${this.newSteps}"`
	}
}
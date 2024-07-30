import Task from "../task/Task";
import EditTaskCommand from "./EditTaskCommand";

export default class EditTaskStartTimeCommand extends EditTaskCommand {
	constructor(task: Task,
		private newStartTime: Date
	) {
		super(task);
	}

	public doAction(): void {
		this.task.setEarliestStartTime(this.newStartTime);
	}

	public toString(): string {
		return `Editing "${this.task.getDescription()}"'s start time from "${this.getTaskStateBefore()?.earliestStartTime}" to "${this.getTaskStateAfter()?.earliestStartTime}"`
	}
}
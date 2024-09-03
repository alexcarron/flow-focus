import Task from "../task/Task";
import EditTaskCommand from "./EditTaskCommand";

export default class DeferTaskCommand extends EditTaskCommand {
	constructor(task: Task,
		private deferMilliseconds: number
	) {
		super(task);
	}

	public doAction(): void {
		let currentTime = new Date();
		const newStartTime = new Date(currentTime.getTime() + this.deferMilliseconds);
		this.task.setStartTime(newStartTime);
	}

	public toString(): string {
		return `Completing Next Step of "${this.task.getDescription()}"`
	}
}
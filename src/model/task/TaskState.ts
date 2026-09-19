import StepStatus from "./StepStatus";
import Step from "./Step";
import TaskTimingOptions from "./TaskTimingOptions";

type TaskState = {
	description: string,
	steps: Step[],
	isComplete: boolean,
	isSkipped: boolean,
	skippedUntil: Date | null,
	lastActionedStep: {stepID: string, status: StepStatus} | null,
	reccurenceStartTime: Date | null,
} & TaskTimingOptions;

export default TaskState;
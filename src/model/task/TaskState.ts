import StepStatus from "./StepStatus";
import TaskTimingOptions from "./TaskTimingOptions";

type TaskState = {
	description: string,
	stepsToStatusMap: Map<string, StepStatus>,
	isComplete: boolean,
	isSkipped: boolean,
	lastActionedStep: {step: string, status: StepStatus} | null,
} & TaskTimingOptions;

export default TaskState;
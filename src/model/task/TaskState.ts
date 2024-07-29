import StepStatus from "./StepStatus";

type TaskState = {
	description: string,
	stepsToStatusMap: Map<string, StepStatus>,
	earliestStartTime: Date | null,
	deadline: Date | null,
	minRequiredTime: number | null,
	maxRequiredTime: number | null,
	repeatInterval: number | null,
	isMandatory: boolean,
	isComplete: boolean,
	isSkipped: boolean,
	lastActionedStep: {step: string, status: StepStatus} | null,
}

export default TaskState;
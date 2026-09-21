import StepStatus from "./step/StepStatus";
import Step from "./step/Step";
import TaskTimingOptions from "./TaskTimingOptions";

type TaskState = {
	description: string,
	steps: Step[],
	isComplete: boolean,
	isSkipped: boolean,
	skippedUntil: Date | null,
	lastActionedStep: {stepID: string, status: StepStatus} | null,
	completedOccurrenceIndex: number | null,
	skippedOccurrenceIndex: number | null,
	progressOccurrenceIndex: number | null,
	tagIDs: string[],
} & TaskTimingOptions;

export default TaskState;

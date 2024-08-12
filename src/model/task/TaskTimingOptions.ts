type TaskTimingOptions = {
	startTime: Date | null;
	deadline: Date | null;
	minDuration: number | null;
	maxDuration: number | null;
	repeatInterval: number | null;
	isMandatory: boolean;
}

export default TaskTimingOptions;
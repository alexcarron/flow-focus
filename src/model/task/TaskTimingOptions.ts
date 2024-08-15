type TaskTimingOptions = {
	startTime: Date | null;
	endTime: Date | null;
	deadline: Date | null;
	minRequiredTime: number | null;
	maxRequiredTime: number | null;
	repeatInterval: number | null;
	isMandatory: boolean;
}

export default TaskTimingOptions;
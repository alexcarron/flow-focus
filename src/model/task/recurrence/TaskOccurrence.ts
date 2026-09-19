type TaskOccurrence = {
	index: number;
	startTime: Date;
	endTime: Date | null;
	deadline: Date | null;
};

export default TaskOccurrence;

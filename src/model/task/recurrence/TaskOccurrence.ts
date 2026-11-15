type TaskOccurrence = {
	index: number;
	startDate: Date;
	targetDate: Date | null;
	dueDate: Date | null;
};

export default TaskOccurrence;

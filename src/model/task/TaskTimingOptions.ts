import RecurrenceDuration from './recurrence/RecurrenceDuration';

type TaskTimingOptions = {
	startDate: Date | null;
	targetDate: Date | null;
	dueDate: Date | null;
	minDuration: number | null;
	maxDuration: number | null;
	recurrenceDuration: RecurrenceDuration | null;
	shouldNotSkipMissedOccurrences: boolean;
}

export default TaskTimingOptions;

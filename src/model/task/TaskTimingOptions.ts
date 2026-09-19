import RecurrenceDuration from './recurrence/RecurrenceDuration';

type TaskTimingOptions = {
	startTime: Date | null;
	endTime: Date | null;
	deadline: Date | null;
	minDuration: number | null;
	maxDuration: number | null;
	recurrenceDuration: RecurrenceDuration | null;
	shouldNotSkipMissedOccurrences: boolean;
	isMandatory: boolean;
}

export default TaskTimingOptions;

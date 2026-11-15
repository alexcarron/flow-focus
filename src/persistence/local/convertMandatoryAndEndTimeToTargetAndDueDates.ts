export type TaskDatesWithMandatoryAndEndTime = {
	startTime: string | null;
	endTime: string | null;
	deadline: string | null;
	isMandatory: boolean;
};

export type TaskStartTargetAndDueDates = {
	startDate: string | null;
	targetDate: string | null;
	dueDate: string | null;
};

function isDateAfter({ date, otherDate }: { date: string; otherDate: string }): boolean {
	return Date.parse(date) > Date.parse(otherDate);
}

export function convertMandatoryAndEndTimeToTargetAndDueDates(taskDates: TaskDatesWithMandatoryAndEndTime): TaskStartTargetAndDueDates {
	const { startTime, endTime, deadline, isMandatory } = taskDates;

	if (deadline !== null && endTime !== null) {
		const isDeadlineAfterEndTime = isDateAfter({
			date: deadline,
			otherDate: endTime,
		});
		let targetDate: string | null = deadline;
		if (isDeadlineAfterEndTime) {
			targetDate = null;
		}
		return {
			startDate: startTime,
			targetDate,
			dueDate: endTime,
		};
	}

	const onlyDate = deadline ?? endTime;
	if (isMandatory) {
		return {
			startDate: startTime,
			targetDate: null,
			dueDate: onlyDate,
		};
	}
	return {
		startDate: startTime,
		targetDate: onlyDate,
		dueDate: null,
	};
}

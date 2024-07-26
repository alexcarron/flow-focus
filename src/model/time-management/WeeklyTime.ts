import RecurringDateRange from "./RecurringDateRange"
import DateRange from './DateRange';
import Time from "./Time";
import Weekday from "./Weekday";

export default class WeeklyDateRange extends RecurringDateRange {
	constructor(
		startWeekday: Weekday,
		startTime: Time,
		endWeekday: Weekday,
		endTime: Time
	) {
		const week = 1000 * 60 * 60 * 24 * 7;

		const startDate = new Date();
		// Set start date at weekday
		startDate.setDate(
			startDate.getDate() - startDate.getDay() + startWeekday
		);
		startDate.setHours(startTime.getHour(), startTime.getMinute(), 0, 0);

		let daysAfter = endWeekday - startWeekday;

		if (endWeekday < startWeekday) {
			daysAfter = 6 - startWeekday + endWeekday;
		}

		const endDate = new Date(startDate.getTime() + daysAfter * week);
		endDate.setHours(endTime.getHour(), endTime.getMinute(), 0, 0);

		const dateRange = new DateRange(startDate, endDate);

		super(dateRange, week);
	}
}
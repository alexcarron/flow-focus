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
		const day = 1000 * 60 * 60 * 24;
		const week = day * 7;

		const startDate = new Date();
		// Set start date at weekday
		startDate.setDate(
			startDate.getDate() - startDate.getDay() + startWeekday
		);
		startDate.setHours(startTime.getHour(), startTime.getMinute(), 0, 0);

		let daysAfter = (endWeekday - startWeekday + 7)%7;

		const endDate = new Date(startDate.getTime() + daysAfter * day);
		endDate.setHours(endTime.getHour(), endTime.getMinute(), 0, 0);

		const dateRange = new DateRange(startDate, endDate);


		console.log({
			startWeekday, startTime, endWeekday, endTime, startDate: startDate.toString(), endDate: endDate.toString(),
		});

		super(dateRange, week);
	}
}
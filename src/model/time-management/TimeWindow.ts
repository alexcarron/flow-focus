import DateRange from "./DateRange";
import Time from "./Time";

export default class TimeWindow {
	private startTime: Time;
	private endTime: Time;

	constructor(
		startTimeString: string,
		endTimeString: string
	) {
		this.startTime = Time.fromString(startTimeString);
		this.endTime = Time.fromString(endTimeString);
	}

	public getStartTime(): Time {return this.startTime}
	public getEndTime(): Time {return this.endTime}

	public getMinutesLong(): number {
		if (this.startTime.getTotalMinutes() > this.endTime.getTotalMinutes()) {
			return (
				(24*60 - this.startTime.getTotalMinutes()) +
				this.endTime.getTotalMinutes()
			);
		}
		else {
			return this.endTime.getTotalMinutes() - this.startTime.getTotalMinutes();
		}
	}

	/**
	 * Get the duration of the time window in milliseconds
	 * @returns The duration of the time window in milliseconds
	 */
	getDuration(): number {
		return this.getMinutesLong() * 1000 * 60;
	}

	/**
	 * Checks if a date is in the time window.
	 * @param date - The date
	 * @returns Whether the date is in the time window
	 */
	public isInWindow(date: Date): boolean {
		const currentHour = date.getHours();
		const currentMinute = date.getMinutes();
		const currentTotalMinutes = currentHour * 60 + currentMinute;

		const startTimeTotalMinutes = this.startTime.getTotalMinutes();
		const endTimeTotalMinutes = this.endTime.getTotalMinutes();

		if (startTimeTotalMinutes > endTimeTotalMinutes) {
			return (
				(currentTotalMinutes >= startTimeTotalMinutes) ||
				(currentTotalMinutes <= endTimeTotalMinutes)
			);
		}
		else {
			return (
				(currentTotalMinutes >= startTimeTotalMinutes) && (currentTotalMinutes <= endTimeTotalMinutes)
			);
		}
	}

	/**
	 * Converts a time window to a date range.
	 * @param startDate - The start date
	 * @returns The date range
	 */
	toDateRange(startDate: Date): DateRange {
		const startDateHour = startDate.getHours();
		const startDateMinute = startDate.getMinutes();
		const startDateTotalMinutes = startDateHour * 60 + startDateMinute;

		if (
			(this.isInWindow(startDate) &&
			startDateTotalMinutes < this.startTime.getTotalMinutes()) ||
			(!this.isInWindow(startDate) &&
			startDateTotalMinutes > this.startTime.getTotalMinutes())
		) {
			startDate.setDate(startDate.getDate() + 1);
		}

		startDate.setHours(this.startTime.getHour());
		startDate.setMinutes(this.startTime.getMinute());
		startDate.setSeconds(0);

		const endDate = new Date(startDate.getTime() + this.getDuration());

		return new DateRange(startDate, endDate);
	}
}
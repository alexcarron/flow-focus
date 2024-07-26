import TimeWindow from "./TimeWindow";

export default class DateRange {
	constructor(
		private startDate: Date,
		private endDate: Date
	) {
		if (this.startDate > this.endDate) {
			throw new Error('Cannot construct DateRange with start date after end date');
		}
	}

	getStartDate(): Date {return this.startDate}
	getEndDate(): Date {return this.endDate}

	/**
	 * Get the duration of the date range in milliseconds
	 * @returns The duration of the date range in milliseconds
	 */
	getDuration(): number {
		return this.endDate.getTime() - this.startDate.getTime();
	}

	private getDaysLong(): number {
		return Math.floor(this.getDuration() / (1000 * 60 * 60 * 24));
	}

	/**
	 * Calculates the total duration between two dates, excluding any time that falls within a specified daily time window
	 * @param timeWindow - The daily time window to exclude
	 */
	getDurationWithoutTimeWindow(timeWindow: TimeWindow): number {
		let excludedTime = 0;
		let nonCrossoverStartDate = this.startDate;
		let nonCrossoverEndDate = this.endDate;

		if (timeWindow.isInWindow(this.startDate)) {
			const startDateHour = this.startDate.getHours();
			const startDateMinutes = this.startDate.getMinutes();

			const crossoverTimeWindow = new TimeWindow(
				`${startDateHour}:${startDateMinutes}`,
				timeWindow.getEndTime().toString(),
			)

			excludedTime += crossoverTimeWindow.getDuration();
			nonCrossoverStartDate = new Date(this.startDate.getTime() + crossoverTimeWindow.getDuration());
		}

		if (timeWindow.isInWindow(this.endDate)) {
			const endDateHour = this.endDate.getHours();
			const endDateMinutes = this.endDate.getMinutes();

			const crossoverTimeWindow = new TimeWindow(
				timeWindow.getStartTime().toString(),
				`${endDateHour}:${endDateMinutes}`,
			)

			excludedTime += crossoverTimeWindow.getDuration();
			nonCrossoverEndDate = new Date(this.endDate.getTime() - crossoverTimeWindow.getDuration());
		}

		const nonCrossoverDays = new DateRange(nonCrossoverStartDate, nonCrossoverEndDate).getDaysLong();
		excludedTime += nonCrossoverDays * timeWindow.getDuration();

		return this.getDuration() - excludedTime;
	}
}
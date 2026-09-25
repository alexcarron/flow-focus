import TimeWindow from "./TimeWindow";

export default class DateRange {
	constructor(
		private startDate: Date,
		private endDate: Date
	) {
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

	private areDatesReversed(): boolean {
		return this.startDate.getTime() > this.endDate.getTime();
	}

	/**
	 * Calculates the total duration between two dates, excluding any time that falls within a specified daily time window
	 * @param timeWindow - The daily time window to exclude
	 */
	getDurationWithoutTimeWindow(timeWindow: TimeWindow): number {
		if (this.areDatesReversed()) {
			const reverseDateRange = new DateRange(this.endDate, this.startDate);
			const durationWithoutTimeWindow = reverseDateRange.getDurationWithoutTimeWindow(timeWindow);
			return -durationWithoutTimeWindow;
		}

		let excludedTime = 0;

		const firstWindowInstanceStart = new Date(this.startDate);
		firstWindowInstanceStart.setHours(timeWindow.getStartTime().getHour(), timeWindow.getStartTime().getMinute(), 0, 0);
		firstWindowInstanceStart.setDate(firstWindowInstanceStart.getDate() - 1);

		const dayInMilliseconds = 24 * 60 * 60 * 1000;

		for (
			let windowInstanceStart = firstWindowInstanceStart;
			windowInstanceStart.getTime() < this.endDate.getTime();
			windowInstanceStart = new Date(windowInstanceStart.getTime() + dayInMilliseconds)
		) {
			const windowInstanceEnd = new Date(windowInstanceStart.getTime() + timeWindow.getDuration());

			const overlapStart = Math.max(windowInstanceStart.getTime(), this.startDate.getTime());
			const overlapEnd = Math.min(windowInstanceEnd.getTime(), this.endDate.getTime());

			if (overlapEnd > overlapStart) {
				excludedTime += overlapEnd - overlapStart;
			}
		}

		return this.getDuration() - excludedTime;
	}
}
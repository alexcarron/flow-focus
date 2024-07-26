import DateRange from './DateRange';
export default class RecurringDateRange {
	constructor(
		private dateRange: DateRange,

		/**
		 * The number of milliseconds it takes for the date range to repeat
		 */
		private repeatInterval: number,
	) {
		if (repeatInterval <= 0) {
			throw new Error('Repeat interval must be greater than 0');
		}
	}

	getRepeatInterval(): number {return this.repeatInterval}

	/**
	 * Determines if the date in inside the recurring date range
	 */
	isInRange(date: Date): boolean {
		const rangeStartTime = this.dateRange.getStartDate().getTime();
		const rangeEndTime = this.dateRange.getEndDate().getTime();

    let intervalIndex = Math.floor(
			(date.getTime() - rangeStartTime) /
			this.repeatInterval
		);

    let intervalStart = rangeStartTime + intervalIndex * this.repeatInterval;
    let intervalEnd = intervalStart + (rangeEndTime - rangeStartTime);

    return date.getTime() >= intervalStart && date.getTime() <= intervalEnd;
	}
}
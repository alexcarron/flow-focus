class Time {
	private hour: number;
	private minute: number;

	constructor(hour: number, minute: number) {
		this.hour = hour;
		this.minute = minute;
	}

	getHour(): number {return this.hour}
	getMinute(): number {return this.minute}
	getTotalMinutes(): number {return this.hour * 60 + this.minute}

	toString(): string {
		return `${this.hour.toString().padStart(2, '0')}:${this.minute.toString().padStart(2, '0')}`;
	}

	/**
	 * Converts a time string to a Time object.
	 * @throws Error if the time string is invalid
	 * @param timeString The time string to convert
	 * @returns The Time object
	 */
	static fromString(timeString: string): Time {
		let hour = 0;
		let minute = 0;

		const endMeridiemRegex = /[AaPp][Mm]$/;
		const endMeridiem = endMeridiemRegex.exec(timeString)?.[0];

		if (endMeridiem !== undefined) {
			const meridiemIsPM = endMeridiem.toLowerCase() === 'pm';

			const hourNumRegex = /^(0?\d|1[0-2])(\s|:|[AaPp])/;
			const hourNum = hourNumRegex.exec(timeString)?.[1];
			if (hourNum === undefined) {
				throw new Error(`Invalid syntax for time "${timeString}": Missing or invalid hour`);
			}

			hour = parseInt(hourNum);
			hour = hour === 12 ? 0 : hour;
			hour = meridiemIsPM ? hour + 12 : hour;

			const minuteNumRegex = /:([0-5]?\d)($|\s|[AaPp])/;
			const minuteNum = minuteNumRegex.exec(timeString)?.[1];
			if (minuteNum !== undefined) {
				minute = parseInt(minuteNum);
			}
		}
		else {
			const hourNumRegex = /^([0-1]?\d|2[0-3])(:|$)/;
			const hourNum = hourNumRegex.exec(timeString)?.[1];
			if (hourNum === undefined) {
				throw new Error(`Invalid syntax for time "${timeString}": Missing or invalid hour`);
			}

			hour = parseInt(hourNum);

			const minuteNumRegex = /:([0-5]?\d)$/;
			const minuteNum = minuteNumRegex.exec(timeString)?.[1];
			if (minuteNum !== undefined) {
				minute = parseInt(minuteNum);
			}
		}

		return new Time(hour, minute);
	}
}

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

		return (
			(currentTotalMinutes >= startTimeTotalMinutes) && (currentTotalMinutes <= endTimeTotalMinutes)
		);
	}
}
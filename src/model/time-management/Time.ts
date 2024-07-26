export default class Time {
	private hour: number;
	private minute: number;

	constructor(hour: number, minute: number = 0) {
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
import { TimeUnit, TimeUnitName, timeUnits } from "./StandardTimeUnit";

export default class Duration {
	constructor(
		private amountOfUnits: number,
		private timeUnit: TimeUnit,
	) {}

	public getAmountOfUnits(): number {return this.amountOfUnits}
	public getTimeUnit(): TimeUnit {return this.timeUnit}

	public toMilliseconds(): number {
		return this.timeUnit.milliseconds * this.amountOfUnits;
	}

	private static getLargestDivisibleUnit(milliseconds: number): TimeUnit {
		const longestToShortestTimeUnits = Object.values(timeUnits)
			.sort((timeUnitLeft, timeUnitRight) =>
				timeUnitRight.milliseconds - timeUnitLeft.milliseconds
			);


		for (const timeUnit of longestToShortestTimeUnits) {
			if (milliseconds % timeUnit.milliseconds === 0) {
				return timeUnit;
			}
		}

		return timeUnits[TimeUnitName.Milliseconds];
	}

	static fromMilliseconds(milliseconds: number): Duration {
		if (milliseconds <= 0) {
			return new Duration(0, timeUnits.seconds);
		}

		const largestDivisibleUnit = Duration.getLargestDivisibleUnit(milliseconds);

		const amountOfUnits = Math.floor(milliseconds / largestDivisibleUnit.milliseconds);

		return new Duration(amountOfUnits, largestDivisibleUnit);
	}

	static getDurationRangeStrings(startDuration: Duration, endDuration: Duration): [string, string | undefined] {
		const startAmount = startDuration.getAmountOfUnits();
		const startUnit = startDuration.getTimeUnit().name;
		const endAmount = endDuration.getAmountOfUnits();
		const endUnit = endDuration.getTimeUnit().name;

		// Handle cases where start and end are the same
		if (
			startDuration.getAmountOfUnits() === endDuration.getAmountOfUnits() &&
			startDuration.getTimeUnit().name === endDuration.getTimeUnit().name
		) {
			return [`${startAmount} ${startUnit}`, undefined];
		}

		// Handle cases where both are the same unit
		if (
			startDuration.getTimeUnit().name === endDuration.getTimeUnit().name
		) {

			return [`${startAmount}`, `${endAmount} ${startUnit}`];
		}

		// Handle cases where units are different
		return [`${startAmount} ${startUnit}`, `${endAmount} ${endUnit}`];
	}
}
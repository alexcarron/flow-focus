import { TimeUnit, TimeUnitName, timeUnits } from "./StandardTimeUnit";

export default class Duration {
	constructor(
		private amountOfUnits: number,
		private timeUnit: TimeUnit,
	) {}

	public getAmountOfUnits(): number {return this.amountOfUnits}
	public getTimeUnit(): TimeUnit {return this.timeUnit}

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
		const largestDivisibleUnit = Duration.getLargestDivisibleUnit(milliseconds);

		const amountOfUnits = Math.floor(milliseconds / largestDivisibleUnit.milliseconds);

		return new Duration(amountOfUnits, largestDivisibleUnit);
	}
}
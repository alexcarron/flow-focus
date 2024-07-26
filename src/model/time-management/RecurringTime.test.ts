import DateRange from "./DateRange";
import RecurringDateRange from "./RecurringTime";

describe('RecurringTime', () => {
	const currentTime = new Date();

	describe('constructor', () => {
		it('should initialize with a repeat interval', () => {
			const dateRange = new DateRange(currentTime, currentTime);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			expect(recurringDateRange.getRepeatInterval()).toEqual(1000);
		})
	});

	describe('isInRange', () => {
		it('should return true if date is in range', () => {
			const dateRange = new DateRange(currentTime, currentTime);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			expect(recurringDateRange.isInRange(currentTime)).toEqual(true);
		})

		it('should return false if date is not in range', () => {
			const dateRange = new DateRange(currentTime, currentTime);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			const dateOutOfRange = new Date(currentTime.getTime() + 50);
			expect(recurringDateRange.isInRange(dateOutOfRange)).toEqual(false);
		})

		it('should return true if date is later but still in an interval', () => {
			const dateRange = new DateRange(
				currentTime, new Date(currentTime.getTime() + 500)
			);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			const dateInRange = new Date(currentTime.getTime() + 1250);

			expect(recurringDateRange.isInRange(dateInRange)).toEqual(true);
		})

		it('should return true if date is way into the future but still in an interval', () => {
			const dateRange = new DateRange(
				currentTime, new Date(currentTime.getTime() + 500)
			);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			const dateInRange = new Date(currentTime.getTime() + 993819216231250);

			expect(recurringDateRange.isInRange(dateInRange)).toEqual(true);
		})

		it('should return false if date is way into the future but still not in the interval', () => {
			const dateRange = new DateRange(
				currentTime, new Date(currentTime.getTime() + 500)
			);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			const dateInRange = new Date(currentTime.getTime() + 993819216231750);

			expect(recurringDateRange.isInRange(dateInRange)).toEqual(false);
		})

		it('should return true if date is way into the past but still in an interval', () => {
			const dateRange = new DateRange(
				currentTime, new Date(currentTime.getTime() + 500)
			);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			const dateInRange = new Date(currentTime.getTime() - 993819216231750);

			expect(recurringDateRange.isInRange(dateInRange)).toEqual(true);
		})

		it('should return false if date is way into the past but still is not in an interval', () => {
			const dateRange = new DateRange(
				currentTime, new Date(currentTime.getTime() + 500)
			);
			const recurringDateRange = new RecurringDateRange(dateRange, 1000);
			const dateInRange = new Date(currentTime.getTime() - 993819216231250);

			expect(recurringDateRange.isInRange(dateInRange)).toEqual(false);
		})
	})
})
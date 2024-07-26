import DateRange from "./DateRange";
import TimeWindow from "./TimeWindow";

describe('DateRange', () => {
	const currentTime = new Date();

	describe('constructor', () => {
		it('should set start and end dates', () => {
			const start = currentTime
			const end = new Date(currentTime.getTime() + 1000);
			const dateRange = new DateRange(start, end);
			expect(dateRange.getStartDate()).toEqual(start);
			expect(dateRange.getEndDate()).toEqual(end);
		});

		it('should throw an error if start date is after end date', () => {
			const start = new Date(currentTime.getTime() + 1000);
			const end = currentTime
			expect(() => new DateRange(start, end)).toThrow();
		})
	})

	describe('getDuration', () => {
		it('should get time between dates in milliseconds', () => {
			const start = currentTime
			const end = new Date(currentTime.getTime() + 1000);
			const dateRange = new DateRange(start, end);
			expect(dateRange.getDuration()).toEqual(1000);
		});
	});

	describe('getDurationWithoutTimeWindow', () => {
		it('should get time between dates excluding the daily time window in milliseconds with a day-long day range', () => {
			const day = 24 * 60 * 60 * 1000;
			const fourHours = 4 * 60 * 60 * 1000;

			const start = currentTime
			const end = new Date(start.getTime() + day);
			start.setHours(10, 0, 0, 0);
			end.setHours(10, 0, 0, 0);
			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '4:00');

			expect(dateRange.getDuration()).toEqual(day);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(day - fourHours);
		});

		it('should get time between dates excluding the daily time window in milliseconds with a dynamic range less than a day', () => {
			const day = 24 * 60 * 60 * 1000;
			const twentyThreeHours = 23 * 60 * 60 * 1000;
			const threeHours = 3 * 60 * 60 * 1000;

			const start = currentTime
			const end = new Date(start.getTime() + day);
			start.setHours(2, 0, 0, 0);
			end.setHours(1, 0, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '4:00');

			expect(dateRange.getDuration()).toEqual(twentyThreeHours);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(twentyThreeHours - threeHours);
		});

		it('should get time between dates excluding the daily time window in milliseconds with a multi-day-long day range', () => {
			const tenDays = 10 * 24 * 60 * 60 * 1000;
			const fourHours = 4 * 60 * 60 * 1000;

			const start = currentTime
			const end = new Date(start.getTime() + tenDays);
			start.setHours(10, 0, 0, 0);
			end.setHours(10, 0, 0, 0);
			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '4:00');

			expect(dateRange.getDuration()).toEqual(tenDays);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(tenDays - fourHours*10);
		});

		it('should get time between dates excluding the daily time window in milliseconds with a dynamic multi-day range', () => {
			const tenDays = 10 * 24 * 60 * 60 * 1000;
			const hour = 60 * 60 * 1000;
			const rangeDuration = tenDays - hour;


			const start = currentTime
			const end = new Date(start.getTime() + tenDays);
			start.setHours(2, 0, 0, 0);
			end.setHours(1, 0, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '4:00');

			expect(dateRange.getDuration()).toEqual(rangeDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(rangeDuration - (3*hour + 9*4*hour));
		});

		it('should get time between dates excluding the daily time window in milliseconds with a dynamic multi-day range at end points', () => {
			const tenDays = 10 * 24 * 60 * 60 * 1000;
			const hour = 60 * 60 * 1000;
			const rangeDuration = tenDays + 3*hour;


			const start = currentTime
			const end = new Date(start.getTime() + tenDays);
			start.setHours(0, 30, 0, 0);
			end.setHours(3, 30, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '4:00');

			expect(dateRange.getDuration()).toEqual(rangeDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(rangeDuration - (11*4*hour - hour));
		});
	});
});
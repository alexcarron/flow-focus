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
	})

	describe('getDuration', () => {
		it('should get time between dates in milliseconds', () => {
			const start = currentTime
			const end = new Date(currentTime.getTime() + 1000);
			const dateRange = new DateRange(start, end);
			expect(dateRange.getDuration()).toEqual(1000);
		});

		it('should get negative time between dates in milliseconds if reversed date range', () => {
			const start = currentTime
			const end = new Date(currentTime.getTime() + 1000);
			const dateRange = new DateRange(end, start);
			expect(dateRange.getDuration()).toEqual(-1000);
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

		it('should get negative time between dates excluding the daily time window in milliseconds with a reverse dynamic multi-day range at end points', () => {
			const tenDays = 10 * 24 * 60 * 60 * 1000;
			const hour = 60 * 60 * 1000;
			const rangeDuration = tenDays + 3*hour;


			const start = currentTime
			const end = new Date(start.getTime() + tenDays);
			start.setHours(0, 30, 0, 0);
			end.setHours(3, 30, 0, 0);

			const dateRange = new DateRange(end, start);

			const timeWindow = new TimeWindow('0:00', '4:00');

			expect(dateRange.getDuration()).toEqual(-rangeDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(-(rangeDuration - (11*4*hour - hour)));
		});

		it('should exclude a full time window that falls entirely within a range shorter than a day', () => {
			const eightHours = 8 * 60 * 60 * 1000;

			const start = new Date(2024, 0, 1, 20, 0, 0, 0);
			const end = new Date(2024, 0, 2, 17, 0, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '8:00');

			const expectedDuration = end.getTime() - start.getTime();
			expect(dateRange.getDuration()).toEqual(expectedDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(expectedDuration - eightHours);
		});

		it('should get negative time excluding a full time window that falls entirely within a reversed range shorter than a day', () => {
			const eightHours = 8 * 60 * 60 * 1000;

			const start = new Date(2024, 0, 1, 20, 0, 0, 0);
			const end = new Date(2024, 0, 2, 17, 0, 0, 0);

			const dateRange = new DateRange(end, start);

			const timeWindow = new TimeWindow('0:00', '8:00');

			const forwardDuration = end.getTime() - start.getTime();
			expect(dateRange.getDuration()).toEqual(-forwardDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(-(forwardDuration - eightHours));
		});

		it('should exclude every full time window crossed by a multi-day range, even when the total span is not a whole number of days', () => {
			const eightHours = 8 * 60 * 60 * 1000;

			const start = new Date(2024, 0, 1, 20, 0, 0, 0);
			const end = new Date(2024, 0, 3, 17, 0, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '8:00');

			const expectedDuration = end.getTime() - start.getTime();
			expect(dateRange.getDuration()).toEqual(expectedDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(expectedDuration - 2*eightHours);
		});

		it('should exclude a wrapping time window that crosses midnight itself when it falls within the range', () => {
			const eightHours = 8 * 60 * 60 * 1000;

			const start = new Date(2024, 0, 1, 12, 0, 0, 0);
			const end = new Date(2024, 0, 2, 12, 0, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('22:00', '6:00');

			const expectedDuration = end.getTime() - start.getTime();
			expect(dateRange.getDuration()).toEqual(expectedDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(expectedDuration - eightHours);
		});

		it('should exclude nothing when the range never crosses the time window at all', () => {
			const start = new Date(2024, 0, 1, 9, 0, 0, 0);
			const end = new Date(2024, 0, 1, 15, 0, 0, 0);

			const dateRange = new DateRange(start, end);

			const timeWindow = new TimeWindow('0:00', '4:00');

			const expectedDuration = end.getTime() - start.getTime();
			expect(dateRange.getDuration()).toEqual(expectedDuration);
			expect(dateRange.getDurationWithoutTimeWindow(timeWindow))
			.toEqual(expectedDuration);
		});
	});
});
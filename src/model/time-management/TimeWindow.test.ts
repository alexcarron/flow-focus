import TimeWindow from "./TimeWindow";


describe('TimeWindow', () => {
	describe('constructor', () => {
		it('should throw error if string is empty', () => {
			const time = '';
			expect(() => new TimeWindow(time, time)).toThrow();
		})

		it('should throw error if string is missing hour', () => {
			const time = ':00 AM';
			expect(() => new TimeWindow(time, time)).toThrow();
		})

		it('should throw error if hour is over 23', () => {
			const time = '24:00 AM';
			expect(() => new TimeWindow(time, time)).toThrow();
		})

		it('should throw error if hour is under 0', () => {
			const time = '-1:00 AM';
			expect(() => new TimeWindow(time, time)).toThrow();
		})

		it('should throw error if hour is over 12 when string includes AM/PM', () => {
			const time =  '13:00 PM';
			expect(() => new TimeWindow(time, time)).toThrow();
		})

		it('should parse time with 12 AM', () => {
			const time = '12:12 AM';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().toString()).toEqual('00:12');
			expect(timeWindow.getEndTime().toString()).toEqual('00:12');
		})

		it('should parse time with 12 PM', () => {
			const time = '12:00 PM';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().toString()).toEqual('12:00');
			expect(timeWindow.getEndTime().toString()).toEqual('12:00');
		})

		it('should parse time with 5 AM', () => {
			const time = '5:25 AM';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().toString()).toEqual('05:25');
			expect(timeWindow.getEndTime().toString()).toEqual('05:25');
		})

		it('should parse time with no colon', () => {
			const time = '5 AM';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().toString()).toEqual('05:00');
			expect(timeWindow.getEndTime().toString()).toEqual('05:00');
		})

		it('should parse time with no meridian', () => {
			const time = '5';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().toString()).toEqual('05:00');
			expect(timeWindow.getEndTime().toString()).toEqual('05:00');
		});

		it('should parse time hour number of 0', () => {
			const time = '0:00 AM';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().toString()).toEqual('00:00');
			expect(timeWindow.getEndTime().toString()).toEqual('00:00');
		});

		it('should parse time with colon and AM', () => {
			const time = '5:30 AM';
			const timeWindow = new TimeWindow(time, time);

			expect(timeWindow.getStartTime().getHour()).toEqual(5);
			expect(timeWindow.getStartTime().getMinute()).toEqual(30);
		});
	})

	describe('getMinutesLong', () => {
		it('should return 0 if start time and end time are the same', () => {
			const time = '5:00 AM';
			const timeWindow = new TimeWindow(time, time);
			expect(timeWindow.getMinutesLong()).toEqual(0);
		});

		it('should return 30 minutes if start time and end time are 30 minutes apart', () => {
			const timeWindow = new TimeWindow(
				'5:00 AM', '5:30 AM'
			);
			expect(timeWindow.getMinutesLong()).toEqual(30);
		});

		it('should handle start time that is after end time', () => {
			const timeWindow = new TimeWindow(
				'0:30', '0:00'
			);
			expect(timeWindow.getMinutesLong()).toEqual(60 * 23 + 30);
		});

		it('should handle different meridians', () => {
			const timeWindow = new TimeWindow(
				'5:00 AM', '5:30 PM'
			);
			expect(timeWindow.getMinutesLong()).toEqual(60 * 12 + 30);
		});
	});

	describe('isInWindow', () => {
		it('should return true if time is in time window', () => {
			const timeWindow = new TimeWindow(
				'5:00 AM', '5:30 AM'
			);

			const currentTime = new Date();
			currentTime.setHours(5, 15, 0, 0);

			expect(timeWindow.isInWindow(currentTime)).toEqual(true);
		});

		it('should return true if at start of time window', () => {
			const timeWindow = new TimeWindow(
				'5:00 AM', '5:30 AM'
			);

			const currentTime = new Date();
			currentTime.setHours(5, 0, 0, 0);

			expect(timeWindow.isInWindow(currentTime)).toEqual(true);
		});

		it('should return true if at end of time window', () => {
			const timeWindow = new TimeWindow(
				'5:00 AM', '5:30 AM'
			);

			const currentTime = new Date();
			currentTime.setHours(5, 30, 0, 0);

			expect(timeWindow.isInWindow(currentTime)).toEqual(true);
		});

		it('should return false if not in time window', () => {
			const timeWindow = new TimeWindow(
				'5:00 AM', '5:30 AM'
			);

			const currentTime = new Date();
			currentTime.setHours(4, 59, 0, 0);

			expect(timeWindow.isInWindow(currentTime)).toEqual(false);
		});

		it('should return true if in wrapped time window', () => {
			const timeWindow = new TimeWindow(
				'8:00 PM', '8:00 AM'
			);

			const currentTime = new Date();
			currentTime.setHours(22, 59, 0, 0);

			expect(timeWindow.isInWindow(currentTime)).toEqual(true);
		});

	});
})
import { parseSingleDuration, parseDurationRange } from './parseDurationPhrase';

const oneMinute = 1000 * 60;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;

describe('parseSingleDuration', () => {
	it('parses an amount and unit', () => {
		expect(parseSingleDuration('3 hours')?.milliseconds).toBe(3 * oneHour);
		expect(parseSingleDuration('10 minutes')?.milliseconds).toBe(10 * oneMinute);
	});

	it('accepts unit abbreviations', () => {
		expect(parseSingleDuration('5 min')?.milliseconds).toBe(5 * oneMinute);
		expect(parseSingleDuration('2 hrs')?.milliseconds).toBe(2 * oneHour);
	});

	it('returns null when there is no duration', () => {
		expect(parseSingleDuration('friday')).toBeNull();
	});

	it('accepts "a"/"an" as an amount of one', () => {
		expect(parseSingleDuration('an hour')?.milliseconds).toBe(1 * oneHour);
		expect(parseSingleDuration('a minute')?.milliseconds).toBe(1 * oneMinute);
	});

	it('accepts "half" phrases as half the unit', () => {
		expect(parseSingleDuration('half an hour')?.milliseconds).toBe(0.5 * oneHour);
		expect(parseSingleDuration('half a day')?.milliseconds).toBe(0.5 * oneDay);
		expect(parseSingleDuration('half hour')?.milliseconds).toBe(0.5 * oneHour);
	});

	it('accepts vague quantity phrases', () => {
		expect(parseSingleDuration('a couple hours')?.milliseconds).toBe(2 * oneHour);
		expect(parseSingleDuration('a couple of hours')?.milliseconds).toBe(2 * oneHour);
		expect(parseSingleDuration('couple minutes')?.milliseconds).toBe(2 * oneMinute);
		expect(parseSingleDuration('a few minutes')?.milliseconds).toBe(3 * oneMinute);
		expect(parseSingleDuration('few days')?.milliseconds).toBe(3 * oneDay);
		expect(parseSingleDuration('several days')?.milliseconds).toBe(4 * oneDay);
	});

	it('accepts "dozen" phrases', () => {
		expect(parseSingleDuration('dozen hours')?.milliseconds).toBe(12 * oneHour);
		expect(parseSingleDuration('a dozen hours')?.milliseconds).toBe(12 * oneHour);
		expect(parseSingleDuration('dozen days')?.milliseconds).toBe(12 * oneDay);
		expect(parseSingleDuration('half a dozen days')?.milliseconds).toBe(6 * oneDay);
	});

	it('accepts "and a half"/"and a quarter"/"and three quarters" fractional phrases with digits', () => {
		expect(parseSingleDuration('2 and a half hours')?.milliseconds).toBe(2.5 * oneHour);
		expect(parseSingleDuration('3 and a half days')?.milliseconds).toBe(3.5 * oneDay);
		expect(parseSingleDuration('2 and a quarter hours')?.milliseconds).toBe(2.25 * oneHour);
		expect(parseSingleDuration('2 and three quarter hours')?.milliseconds).toBe(2.75 * oneHour);
		expect(parseSingleDuration('2 and three quarters hours')?.milliseconds).toBe(2.75 * oneHour);
	});

	it('accepts "and a half"/"and a quarter" fractional phrases with spelled-out numbers', () => {
		expect(parseSingleDuration('two and a half hours')?.milliseconds).toBe(2.5 * oneHour);
		expect(parseSingleDuration('three and a quarter days')?.milliseconds).toBe(3.25 * oneDay);
	});

	it('accepts "a/an UNIT and a half" phrasing', () => {
		expect(parseSingleDuration('an hour and a half')?.milliseconds).toBe(1.5 * oneHour);
		expect(parseSingleDuration('a day and a half')?.milliseconds).toBe(1.5 * oneDay);
	});

	it('accepts decimal amounts', () => {
		expect(parseSingleDuration('1.5 hours')?.milliseconds).toBe(1.5 * oneHour);
		expect(parseSingleDuration('1.2 days')?.milliseconds).toBe(1.2 * oneDay);
	});

	it('accepts spelled-out number amounts', () => {
		expect(parseSingleDuration('two hours')?.milliseconds).toBe(2 * oneHour);
		expect(parseSingleDuration('fifty hours')?.milliseconds).toBe(50 * oneHour);
		expect(parseSingleDuration('twenty three minutes')?.milliseconds).toBe(23 * oneMinute);
		expect(parseSingleDuration('twenty-three minutes')?.milliseconds).toBe(23 * oneMinute);
		expect(parseSingleDuration('nine minutes')?.milliseconds).toBe(9 * oneMinute);
		expect(parseSingleDuration('eleven days')?.milliseconds).toBe(11 * oneDay);
	});

	it('accepts chained mixed units joined by "and" or spaces', () => {
		expect(parseSingleDuration('three days and two hours')?.milliseconds).toBe(3 * oneDay + 2 * oneHour);
		expect(parseSingleDuration('2 hours 23 min')?.milliseconds).toBe(2 * oneHour + 23 * oneMinute);
		expect(parseSingleDuration('10 days 12 hours 5 min')?.milliseconds).toBe(10 * oneDay + 12 * oneHour + 5 * oneMinute);
		expect(parseSingleDuration('1 day, 2 hours and 3 minutes')?.milliseconds).toBe(oneDay + 2 * oneHour + 3 * oneMinute);
		expect(parseSingleDuration('1 day, 2 hours, and 3 minutes')?.milliseconds).toBe(oneDay + 2 * oneHour + 3 * oneMinute);
		expect(parseSingleDuration('1 day and 2 hours and 3 minutes')?.milliseconds).toBe(oneDay + 2 * oneHour + 3 * oneMinute);
	});

	it('accepts abbreviated chained units with or without spaces', () => {
		expect(parseSingleDuration('1h 30m')?.milliseconds).toBe(oneHour + 30 * oneMinute);
		expect(parseSingleDuration('1h30m')?.milliseconds).toBe(oneHour + 30 * oneMinute);
		expect(parseSingleDuration('2d3h')?.milliseconds).toBe(2 * oneDay + 3 * oneHour);
		expect(parseSingleDuration('5d2h10m')?.milliseconds).toBe(5 * oneDay + 2 * oneHour + 10 * oneMinute);
		expect(parseSingleDuration('25d 12h 1m')?.milliseconds).toBe(25 * oneDay + 12 * oneHour + oneMinute);
	});
});

describe('parseDurationRange', () => {
	it('parses a hyphenated range with a shared unit', () => {
		const range = parseDurationRange('1-10 minutes');
		expect(range?.minimumMilliseconds).toBe(1 * oneMinute);
		expect(range?.maximumMilliseconds).toBe(10 * oneMinute);
	});

	it('parses a "to" range with a shared unit', () => {
		const range = parseDurationRange('2 to 4 hours');
		expect(range?.minimumMilliseconds).toBe(2 * oneHour);
		expect(range?.maximumMilliseconds).toBe(4 * oneHour);
	});

	it('parses a "to" range with different units', () => {
		const range = parseDurationRange('3 hours to 5 days');
		expect(range?.minimumMilliseconds).toBe(3 * oneHour);
		expect(range?.maximumMilliseconds).toBe(5 * oneDay);
	});

	it('parses a "to" range where one side is a word amount', () => {
		const range = parseDurationRange('30 min to an hour');
		expect(range?.minimumMilliseconds).toBe(30 * oneMinute);
		expect(range?.maximumMilliseconds).toBe(1 * oneHour);
	});
});

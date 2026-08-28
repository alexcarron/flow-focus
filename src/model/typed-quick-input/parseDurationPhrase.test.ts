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

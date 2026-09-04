import parseRelativeDurationPhrase from './parseRelativeDurationPhrase';

const oneMinute = 1000 * 60;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;

const testNow = new Date(2026, 0, 5, 14, 30, 0);

describe('parseRelativeDurationPhrase', () => {
	it('parses "in <duration>" as an exact future time for sub-day units', () => {
		const parsed = parseRelativeDurationPhrase('in 10 minutes', testNow);
		expect(parsed?.date.getTime()).toBe(testNow.getTime() + 10 * oneMinute);
		expect(parsed?.timeOfDay).toEqual({ hour: testNow.getHours(), minute: 40 });
		expect(parsed?.matchedLength).toBe('in 10 minutes'.length);
	});

	it('parses "in an hour"', () => {
		const parsed = parseRelativeDurationPhrase('in an hour', testNow);
		expect(parsed?.date.getTime()).toBe(testNow.getTime() + oneHour);
	});

	it('rounds sub-minute durations up to the nearest minute', () => {
		const parsed = parseRelativeDurationPhrase('in 5 seconds', testNow);
		expect(parsed?.date.getTime()).toBe(testNow.getTime() + oneMinute);
	});

	it('parses "in <duration>" for day-or-larger units as a bare date at start of day, no explicit time', () => {
		const parsed = parseRelativeDurationPhrase('in 3 days', testNow);
		const expected = new Date(testNow.getTime() + 3 * oneDay);
		expected.setHours(0, 0, 0, 0);
		expect(parsed?.date.getTime()).toBe(expected.getTime());
		expect(parsed?.timeOfDay).toBeUndefined();
	});

	it('parses "<duration> ago" as an exact past time for sub-day units', () => {
		const parsed = parseRelativeDurationPhrase('10 hours ago', testNow);
		expect(parsed?.date.getTime()).toBe(testNow.getTime() - 10 * oneHour);
		expect(parsed?.matchedLength).toBe('10 hours ago'.length);
	});

	it('parses "a year ago" as a bare date, no explicit time', () => {
		const parsed = parseRelativeDurationPhrase('a year ago', testNow);
		const expected = new Date(testNow.getTime() - oneDay * 365);
		expected.setHours(0, 0, 0, 0);
		expect(parsed?.date.getTime()).toBe(expected.getTime());
		expect(parsed?.timeOfDay).toBeUndefined();
	});

	it('parses "2 weeks ago"', () => {
		const parsed = parseRelativeDurationPhrase('2 weeks ago', testNow);
		const expected = new Date(testNow.getTime() - 14 * oneDay);
		expected.setHours(0, 0, 0, 0);
		expect(parsed?.date.getTime()).toBe(expected.getTime());
	});

	it('does not match a bare duration without "in" or "ago"', () => {
		expect(parseRelativeDurationPhrase('3 days', testNow)).toBeNull();
	});

	it('returns null for non-matching text', () => {
		expect(parseRelativeDurationPhrase('essay', testNow)).toBeNull();
	});
});

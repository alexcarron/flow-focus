import { formatReadableDurationRange } from './timeFormatters';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatReadableDurationRange', () => {
	it.each([
		[5 * MINUTE, 5 * MINUTE, '5 min'],
		[10 * SECOND, 10 * SECOND, '10 sec'],
		[25 * HOUR, 25 * HOUR, '25 hours'],
		[1 * HOUR, 1 * HOUR, '1 hour'],
		[4 * DAY, 4 * DAY, '4 days'],
		[10 * HOUR, 12 * HOUR, '10-12 hours'],
		[5 * MINUTE, 10 * MINUTE, '5-10 min'],
		[5 * MINUTE, 12 * HOUR, '5 min - 12 hours'],
		[1 * HOUR, 3 * DAY, '1 hour - 3 days'],
	])('formats %i to %i as %s', (minimumMilliseconds, maximumMilliseconds, expectedText) => {
		expect(formatReadableDurationRange({
			minimumMilliseconds,
			maximumMilliseconds,
		})).toBe(expectedText);
	});
});

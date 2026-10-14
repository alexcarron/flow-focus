import { formatAbbreviatedDuration, formatAbbreviatedDurationRange, formatReadableDurationRange } from './timeFormatters';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatAbbreviatedDurationRange', () => {
	it.each([
		[40 * MINUTE, 59 * MINUTE, '40-59 min'],
		[65 * MINUTE, 89 * MINUTE, '1 hr 5 min-1 hr 29 min'],
		[196 * MINUTE, 890 * MINUTE, '3 hrs 16 min-14 hrs 50 min'],
		[30 * MINUTE, 90 * MINUTE, '30 min-1 hr 30 min'],
		[2 * HOUR, 3 * HOUR + 30 * MINUTE, '2 hrs-3 hrs 30 min'],
		[2 * HOUR, 4 * HOUR, '2-4 hrs'],
		[1 * HOUR, 3 * DAY, '1 hr-3 days'],
		[null, null, '—'],
	])('formats %s to %s as %s', (minMs, maxMs, expectedText) => {
		expect(formatAbbreviatedDurationRange(minMs, maxMs)).toBe(expectedText);
	});
});

const UNIT_NAME_TO_SAMPLE_MILLISECONDS = {
	seconds: 7 * SECOND,
	minutes: 13 * MINUTE,
	hours: 5 * HOUR,
	days: 2 * DAY,
	weeks: 3 * 7 * DAY,
};

function getUnitNameCombinations(unitNames: string[], size: number): string[][] {
	if (size === 0) return [[]];
	if (unitNames.length < size) return [];
	const [firstUnitName, ...remainingUnitNames] = unitNames;
	return [
		...getUnitNameCombinations(remainingUnitNames, size - 1).map(combination => [firstUnitName, ...combination]),
		...getUnitNameCombinations(remainingUnitNames, size),
	];
}

describe('formatAbbreviatedDurationRange unit combinations', () => {
	const unitNames = Object.keys(UNIT_NAME_TO_SAMPLE_MILLISECONDS) as (keyof typeof UNIT_NAME_TO_SAMPLE_MILLISECONDS)[];
	const combinationLabelToExpectedText: [string, string][] = [
		['seconds + minutes', '7 sec-13 min 7 sec'],
		['seconds + hours', '7 sec-5 hrs'],
		['seconds + days', '7 sec-2 days'],
		['seconds + weeks', '7 sec-3 wks'],
		['minutes + hours', '13 min-5 hrs 13 min'],
		['minutes + days', '13 min-2 days'],
		['minutes + weeks', '13 min-3 wks'],
		['hours + days', '5 hrs-2 days 5 hrs'],
		['hours + weeks', '5 hrs-3 wks'],
		['days + weeks', '2 days-3 wks 2 days'],
		['seconds + minutes + hours', '7 sec-5 hrs 13 min'],
		['seconds + minutes + days', '7 sec-2 days'],
		['seconds + minutes + weeks', '7 sec-3 wks'],
		['seconds + hours + days', '7 sec-2 days 5 hrs'],
		['seconds + hours + weeks', '7 sec-3 wks'],
		['seconds + days + weeks', '7 sec-3 wks 2 days'],
		['minutes + hours + days', '13 min-2 days 5 hrs'],
		['minutes + hours + weeks', '13 min-3 wks'],
		['minutes + days + weeks', '13 min-3 wks 2 days'],
		['hours + days + weeks', '5 hrs-3 wks 2 days'],
		['seconds + minutes + hours + days', '7 sec-2 days 5 hrs'],
		['seconds + minutes + hours + weeks', '7 sec-3 wks'],
		['seconds + minutes + days + weeks', '7 sec-3 wks 2 days'],
		['seconds + hours + days + weeks', '7 sec-3 wks 2 days'],
		['minutes + hours + days + weeks', '13 min-3 wks 2 days'],
		['seconds + minutes + hours + days + weeks', '7 sec-3 wks 2 days'],
	];

	it('covers every combination of two to five units', () => {
		const combinationLabels = [2, 3, 4, 5].flatMap(size => getUnitNameCombinations(unitNames, size)).map(combination => combination.join(' + '));
		expect(combinationLabelToExpectedText.map(([label]) => label)).toEqual(combinationLabels);
	});

	it.each(combinationLabelToExpectedText)('formats %s as %s', (combinationLabel, expectedText) => {
		const sampleMilliseconds = combinationLabel.split(' + ').map(unitName => UNIT_NAME_TO_SAMPLE_MILLISECONDS[unitName as typeof unitNames[number]]);
		const minMs = sampleMilliseconds[0];
		const maxMs = sampleMilliseconds.reduce((total, ms) => total + ms, 0);
		expect(formatAbbreviatedDurationRange(minMs, maxMs)).toBe(expectedText);
	});
});

describe('formatAbbreviatedDuration', () => {
	it.each([
		[59 * SECOND, '59 sec'],
		[60 * SECOND, '1 min'],
		[90 * SECOND, '1 min 30 sec'],
		[23 * HOUR + 59 * MINUTE, '23 hrs 59 min'],
		[24 * HOUR, '1 day'],
		[25 * HOUR, '1 day 1 hr'],
		[6 * DAY, '6 days'],
		[7 * DAY + 3 * HOUR, '1 week'],
		[29 * DAY, '4 wks 1 day'],
		[30 * DAY, '1 mo'],
		[45 * DAY, '1 mo 2 wks'],
		[359 * DAY, '11 mos 4 wks'],
		[360 * DAY, '1 year'],
		[364 * DAY, '1 year'],
		[365 * DAY, '1 year'],
		[400 * DAY, '1 year 1 mo'],
		[730 * DAY, '2 yrs'],
		[1500, '1 sec'],
		[500, '500 ms'],
		[0, '0 sec'],
		[45 * MINUTE, '45 min'],
		[60 * MINUTE, '1 hr'],
		[90 * MINUTE, '1 hr 30 min'],
		[135 * MINUTE, '2 hrs 15 min'],
		[3 * DAY, '3 days'],
	])('formats %i as %s', (ms, expectedText) => {
		expect(formatAbbreviatedDuration(ms)).toBe(expectedText);
	});
});

describe('formatReadableDurationRange', () => {
	it.each([
		[5 * MINUTE, 5 * MINUTE, '5 minutes'],
		[1 * MINUTE, 1 * MINUTE, '1 minute'],
		[10 * SECOND, 10 * SECOND, '10 seconds'],
		[25 * HOUR, 25 * HOUR, '1 day 1 hr'],
		[1 * HOUR, 1 * HOUR, '1 hour'],
		[4 * DAY, 4 * DAY, '4 days'],
		[975 * MINUTE, 975 * MINUTE, '16 hours 15 min'],
		[90 * SECOND, 90 * SECOND, '1 minute 30 sec'],
		[10 * HOUR, 12 * HOUR, '10-12 hours'],
		[5 * MINUTE, 10 * MINUTE, '5-10 minutes'],
		[5 * MINUTE, 12 * HOUR, '5 minutes to 12 hours'],
		[1 * HOUR, 3 * DAY, '1 hour to 3 days'],
		[4 * HOUR, 975 * MINUTE, '4 hours to 16 hours 15 min'],
		[6 * HOUR, 3 * DAY + 16 * HOUR, '6 hours to 3 days 16 hrs'],
	])('formats %i to %i as %s', (minimumMilliseconds, maximumMilliseconds, expectedText) => {
		expect(formatReadableDurationRange({
			minimumMilliseconds,
			maximumMilliseconds,
		})).toBe(expectedText);
	});
});

describe('formatReadableDurationRange with shouldOnlyShowTopUnitUnlessItIsOne', () => {
	it.each([
		[4 * HOUR + 2 * MINUTE, 16 * HOUR + 22 * MINUTE, '4-16 hours'],
		[HOUR + 23 * MINUTE + 15 * SECOND, 5 * HOUR, '1 hour 23 min to 5 hours'],
		[25 * MINUTE, HOUR + 40 * MINUTE, '25 minutes to 1 hour 40 min'],
		[2 * HOUR + 10 * MINUTE, 2 * HOUR + 50 * MINUTE, '2 hours'],
		[6 * HOUR, 3 * DAY + 16 * HOUR, '6 hours to 3 days'],
		[DAY + 5 * HOUR, 2 * DAY + 5 * HOUR, '1 day 5 hrs to 2 days'],
	])('formats %i to %i as %s', (minimumMilliseconds, maximumMilliseconds, expectedText) => {
		expect(formatReadableDurationRange({
			minimumMilliseconds,
			maximumMilliseconds,
			shouldOnlyShowTopUnitUnlessItIsOne: true,
		})).toBe(expectedText);
	});
});

import parseDatePhrase from './parseDatePhrase';
import Time from '../time-management/Time';

const testNow = new Date(2026, 0, 5, 9, 0, 0);
const testNightTime = Time.fromString('22:30');
const testMorningTime = Time.fromString('06:45');

function nextDateWithJavascriptDay(javascriptDay: number, includeToday: boolean): Date {
	const result = new Date(testNow);
	result.setHours(0, 0, 0, 0);
	let daysUntil = (javascriptDay - result.getDay() + 7) % 7;
	if (daysUntil === 0 && !includeToday) daysUntil = 7;
	result.setDate(result.getDate() + daysUntil);
	return result;
}

describe('parseDatePhrase', () => {
	it('parses today and tomorrow', () => {
		const today = parseDatePhrase({ text: 'today', now: testNow });
		expect(today?.date.getDate()).toBe(5);

		const tomorrow = parseDatePhrase({ text: 'tomorrow', now: testNow });
		expect(tomorrow?.date.getDate()).toBe(6);
	});

	it('parses a weekday as the next upcoming occurrence including today', () => {
		const friday = parseDatePhrase({ text: 'friday', now: testNow });
		expect(friday?.date.getTime()).toBe(nextDateWithJavascriptDay(5, true).getTime());
	});

	it('parses "next weekday" as the following week', () => {
		const plain = nextDateWithJavascriptDay(5, false);
		const expected = new Date(plain);
		expected.setDate(expected.getDate() + 7);
		expect(parseDatePhrase({ text: 'next friday', now: testNow })?.date.getTime()).toBe(expected.getTime());
	});

	it('parses a month, day, ordinal, and explicit year', () => {
		const parsed = parseDatePhrase({ text: 'march 24th 2026', now: testNow });
		expect(parsed?.date.getFullYear()).toBe(2026);
		expect(parsed?.date.getMonth()).toBe(2);
		expect(parsed?.date.getDate()).toBe(24);
		expect(parsed?.matchedLength).toBe('march 24th 2026'.length);
	});

	it('rolls a bare month/day that already passed into next year', () => {
		const parsed = parseDatePhrase({ text: 'jan 1', now: testNow });
		expect(parsed?.date.getFullYear()).toBe(2027);
	});

	it('returns null for non-date text', () => {
		expect(parseDatePhrase({ text: 'essay', now: testNow })).toBeNull();
	});

	it('parses "midnight" as the start of the next day at exactly 00:00', () => {
		const parsed = parseDatePhrase({ text: 'midnight', now: testNow, nightTime: testNightTime });
		expect(parsed?.date.getDate()).toBe(6);
		expect(parsed?.timeOfDay).toEqual({ hour: 0, minute: 0 });
	});

	it('parses "tonight" as today at exactly night time', () => {
		const parsed = parseDatePhrase({ text: 'tonight', now: testNow, nightTime: testNightTime });
		expect(parsed?.date.getDate()).toBe(5);
		expect(parsed?.timeOfDay).toEqual({ hour: 22, minute: 30 });
	});

	it('parses bare "night" as today at exactly night time', () => {
		const parsed = parseDatePhrase({ text: 'night', now: testNow, nightTime: testNightTime });
		expect(parsed?.date.getDate()).toBe(5);
		expect(parsed?.timeOfDay).toEqual({ hour: 22, minute: 30 });
	});

	it('parses "<weekday> midnight" as the start of the day after that weekday', () => {
		const friday = parseDatePhrase({ text: 'friday', now: testNow });
		const parsed = parseDatePhrase({ text: 'friday midnight', now: testNow });
		expect(parsed?.date.getTime()).toBe(new Date(friday!.date.getFullYear(), friday!.date.getMonth(), friday!.date.getDate() + 1).getTime());
		expect(parsed?.timeOfDay).toEqual({ hour: 0, minute: 0 });
	});

	it('parses "<weekday> night" as the next occurrence of that weekday at night time', () => {
		const friday = parseDatePhrase({ text: 'friday', now: testNow });
		const parsed = parseDatePhrase({ text: 'friday night', now: testNow, nightTime: testNightTime });
		expect(parsed?.date.getTime()).toBe(friday?.date.getTime());
		expect(parsed?.timeOfDay).toEqual({ hour: 22, minute: 30 });
	});

	it.each([
		['fri 2pm', { hour: 14, minute: 0 }],
		['fri 2 pm', { hour: 14, minute: 0 }],
		['fri at 2pm', { hour: 14, minute: 0 }],
		['fri 2:34am', { hour: 2, minute: 34 }],
		['fri 2:34 am', { hour: 2, minute: 34 }],
		['fri 14:30', { hour: 14, minute: 30 }],
		['fri noon', { hour: 12, minute: 0 }],
		['fri at noon', { hour: 12, minute: 0 }],
		['fri afternoon', { hour: 15, minute: 0 }],
		['fri evening', { hour: 18, minute: 0 }],
		['fri morning', { hour: 6, minute: 45 }],
	])('parses "%s" as the next Friday with an explicit time of day', (phrase, expectedTimeOfDay) => {
		const friday = parseDatePhrase({ text: 'friday', now: testNow });
		const parsed = parseDatePhrase({ text: phrase, now: testNow, nightTime: testNightTime, morningTime: testMorningTime });
		expect(parsed?.date.getTime()).toBe(friday?.date.getTime());
		expect(parsed?.timeOfDay).toEqual(expectedTimeOfDay);
	});

	it('parses "next tuesday at 1:00pm"', () => {
		const nextTuesday = parseDatePhrase({ text: 'next tuesday', now: testNow });
		const parsed = parseDatePhrase({ text: 'next tuesday at 1:00pm', now: testNow });
		expect(parsed?.date.getTime()).toBe(nextTuesday?.date.getTime());
		expect(parsed?.timeOfDay).toEqual({ hour: 13, minute: 0 });
	});

	it('parses "tomorrow 2:34 am"', () => {
		const parsed = parseDatePhrase({ text: 'tomorrow 2:34 am', now: testNow });
		expect(parsed?.date.getDate()).toBe(6);
		expect(parsed?.timeOfDay).toEqual({ hour: 2, minute: 34 });
	});

	it.each([
		['2pm', { hour: 14, minute: 0 }],
		['at 2pm', { hour: 14, minute: 0 }],
		['noon', { hour: 12, minute: 0 }],
		['morning', { hour: 6, minute: 45 }],
	])('parses a bare "%s" as today at that time of day', (phrase, expectedTimeOfDay) => {
		const parsed = parseDatePhrase({ text: phrase, now: testNow, nightTime: testNightTime, morningTime: testMorningTime });
		expect(parsed?.date.getDate()).toBe(5);
		expect(parsed?.timeOfDay).toEqual(expectedTimeOfDay);
	});
});

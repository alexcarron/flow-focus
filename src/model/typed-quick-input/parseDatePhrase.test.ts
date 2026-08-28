import parseDatePhrase from './parseDatePhrase';
import Time from '../time-management/Time';

const testNow = new Date(2026, 0, 5, 9, 0, 0);
const testNightTime = Time.fromString('22:30');

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
		const today = parseDatePhrase('today', testNow);
		expect(today?.date.getDate()).toBe(5);

		const tomorrow = parseDatePhrase('tomorrow', testNow);
		expect(tomorrow?.date.getDate()).toBe(6);
	});

	it('parses a weekday as the next upcoming occurrence including today', () => {
		const friday = parseDatePhrase('friday', testNow);
		expect(friday?.date.getTime()).toBe(nextDateWithJavascriptDay(5, true).getTime());
	});

	it('parses "next weekday" as the following week', () => {
		const plain = nextDateWithJavascriptDay(5, false);
		const expected = new Date(plain);
		expected.setDate(expected.getDate() + 7);
		expect(parseDatePhrase('next friday', testNow)?.date.getTime()).toBe(expected.getTime());
	});

	it('parses a month, day, ordinal, and explicit year', () => {
		const parsed = parseDatePhrase('march 24th 2026', testNow);
		expect(parsed?.date.getFullYear()).toBe(2026);
		expect(parsed?.date.getMonth()).toBe(2);
		expect(parsed?.date.getDate()).toBe(24);
		expect(parsed?.matchedLength).toBe('march 24th 2026'.length);
	});

	it('rolls a bare month/day that already passed into next year', () => {
		const parsed = parseDatePhrase('jan 1', testNow);
		expect(parsed?.date.getFullYear()).toBe(2027);
	});

	it('returns null for non-date text', () => {
		expect(parseDatePhrase('essay', testNow)).toBeNull();
	});

	it('parses "midnight" as today at exactly 00:00', () => {
		const parsed = parseDatePhrase('midnight', testNow, testNightTime);
		expect(parsed?.date.getDate()).toBe(5);
		expect(parsed?.timeOfDay).toEqual({ hour: 0, minute: 0 });
	});

	it('parses "tonight" as today at exactly night time', () => {
		const parsed = parseDatePhrase('tonight', testNow, testNightTime);
		expect(parsed?.date.getDate()).toBe(5);
		expect(parsed?.timeOfDay).toEqual({ hour: 22, minute: 30 });
	});

	it('parses bare "night" as today at exactly night time', () => {
		const parsed = parseDatePhrase('night', testNow, testNightTime);
		expect(parsed?.date.getDate()).toBe(5);
		expect(parsed?.timeOfDay).toEqual({ hour: 22, minute: 30 });
	});

	it('parses "<weekday> night" as the next occurrence of that weekday at night time', () => {
		const friday = parseDatePhrase('friday', testNow);
		const parsed = parseDatePhrase('friday night', testNow, testNightTime);
		expect(parsed?.date.getTime()).toBe(friday?.date.getTime());
		expect(parsed?.timeOfDay).toEqual({ hour: 22, minute: 30 });
	});
});

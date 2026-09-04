import parseTypedQuickInput, { escapeTokenInText } from './parseTypedQuickInput';
import Time from '../time-management/Time';

const testNow = new Date(2026, 0, 5, 9, 0, 0);
const oneMinute = 1000 * 60;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;
const oneWeek = oneDay * 7;
const testNightTime = Time.fromString('22:30');

describe('parseTypedQuickInput', () => {
	it('extracts a deadline and strips it from the name', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday', now: testNow });
		expect(result.cleanedName).toBe('finish essay');
		expect(result.timing.deadline?.getHours()).toBe(23);
		expect(result.timing.deadline?.getMinutes()).toBe(0);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('deadline');
	});

	it('clamps a deadline to night time when night time is earlier than end-of-day', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday', now: testNow, nightTime: testNightTime });
		expect(result.timing.deadline?.getHours()).toBe(22);
		expect(result.timing.deadline?.getMinutes()).toBe(30);
	});

	it('does not clamp a deadline when night time is at or after end-of-day', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday', now: testNow, nightTime: Time.fromString('23:59') });
		expect(result.timing.deadline?.getHours()).toBe(23);
		expect(result.timing.deadline?.getMinutes()).toBe(59);
	});

	it('extracts "due midnight" as the start of the next day at exactly 00:00', () => {
		const result = parseTypedQuickInput({ input: 'take out trash due midnight', now: testNow, nightTime: testNightTime });
		expect(result.cleanedName).toBe('take out trash');
		expect(result.timing.deadline?.getDate()).toBe(6);
		expect(result.timing.deadline?.getHours()).toBe(0);
		expect(result.timing.deadline?.getMinutes()).toBe(0);
	});

	it('extracts "due tonight" as today at exactly night time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due tonight', now: testNow, nightTime: testNightTime });
		expect(result.timing.deadline?.getDate()).toBe(5);
		expect(result.timing.deadline?.getHours()).toBe(22);
		expect(result.timing.deadline?.getMinutes()).toBe(30);
	});

	it('extracts "due night" as today at exactly night time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due night', now: testNow, nightTime: testNightTime });
		expect(result.timing.deadline?.getDate()).toBe(5);
		expect(result.timing.deadline?.getHours()).toBe(22);
		expect(result.timing.deadline?.getMinutes()).toBe(30);
	});

	it('extracts "due fri night" as the next Friday at exactly night time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due fri night', now: testNow, nightTime: testNightTime });
		expect(result.timing.deadline?.getDay()).toBe(5);
		expect(result.timing.deadline?.getHours()).toBe(22);
		expect(result.timing.deadline?.getMinutes()).toBe(30);
	});

	it('extracts "due fri 2pm" with the explicit clock time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due fri 2pm', now: testNow });
		expect(result.timing.deadline?.getDay()).toBe(5);
		expect(result.timing.deadline?.getHours()).toBe(14);
		expect(result.timing.deadline?.getMinutes()).toBe(0);
	});

	it('extracts "starts tomorrow 2:34 am" with the explicit clock time', () => {
		const result = parseTypedQuickInput({ input: 'call mom starts tomorrow 2:34 am', now: testNow });
		expect(result.timing.startTime?.getDate()).toBe(6);
		expect(result.timing.startTime?.getHours()).toBe(2);
		expect(result.timing.startTime?.getMinutes()).toBe(34);
	});

	it('extracts "ends next tuesday at 1:00pm" with the explicit clock time', () => {
		const result = parseTypedQuickInput({ input: 'meeting ends next tuesday at 1:00pm', now: testNow });
		expect(result.timing.endTime?.getDay()).toBe(2);
		expect(result.timing.endTime?.getHours()).toBe(13);
		expect(result.timing.endTime?.getMinutes()).toBe(0);
	});

	it('extracts "due friday morning" using the morning setting', () => {
		const result = parseTypedQuickInput({
			input: 'finish essay due friday morning',
			now: testNow,
			nightTime: testNightTime,
			morningTime: Time.fromString('06:45'),
		});
		expect(result.timing.deadline?.getDay()).toBe(5);
		expect(result.timing.deadline?.getHours()).toBe(6);
		expect(result.timing.deadline?.getMinutes()).toBe(45);
	});

	it.each([
		'mandatory', 'required', 'must do', 'must be completed', 'needs to be completed',
		'compulsory', 'obligatory', 'not optional',
	])('marks the task mandatory for "%s"', (phrase) => {
		const result = parseTypedQuickInput({ input: `clean garage ${phrase}`, now: testNow });
		expect(result.cleanedName).toBe('clean garage');
		expect(result.timing.isMandatory).toBe(true);
	});

	it.each([
		'optional', 'not required', 'not mandatory', 'do not have to complete',
		'does not need to be completed', 'may complete', 'not obligated', 'not compulsory',
		'voluntary', 'discretionary',
	])('marks the task optional for "%s"', (phrase) => {
		const result = parseTypedQuickInput({ input: `clean garage ${phrase}`, now: testNow });
		expect(result.cleanedName).toBe('clean garage');
		expect(result.timing.isMandatory).toBe(false);
	});

	it('extracts a daily repeat', () => {
		const result = parseTypedQuickInput({ input: 'water plants everyday', now: testNow });
		expect(result.cleanedName).toBe('water plants');
		expect(result.timing.repeatInterval).toBe(oneDay);
	});

	it('extracts a multi-week repeat', () => {
		const result = parseTypedQuickInput({ input: 'report every 3 weeks', now: testNow });
		expect(result.cleanedName).toBe('report');
		expect(result.timing.repeatInterval).toBe(3 * oneWeek);
	});

	it('extracts a weekly repeat anchored to a weekday', () => {
		const result = parseTypedQuickInput({ input: 'gym every monday', now: testNow });
		expect(result.cleanedName).toBe('gym');
		expect(result.timing.repeatInterval).toBe(oneWeek);
		expect(result.timing.startTime?.getDay()).toBe(1);
	});

	it('extracts a duration range from the "takes" form', () => {
		const result = parseTypedQuickInput({ input: 'task takes 3 hours to 5 days', now: testNow });
		expect(result.cleanedName).toBe('task');
		expect(result.timing.minDuration).toBe(3 * oneHour);
		expect(result.timing.maxDuration).toBe(5 * oneDay);
	});

	it('extracts a duration range from the parenthetical form', () => {
		const result = parseTypedQuickInput({ input: 'call (1-10 minutes)', now: testNow });
		expect(result.cleanedName).toBe('call');
		expect(result.timing.minDuration).toBe(oneMinute);
		expect(result.timing.maxDuration).toBe(10 * oneMinute);
	});

	it('combines several phrases in one line', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday every week takes 2 to 4 hours', now: testNow });
		expect(result.cleanedName).toBe('finish essay');
		expect(result.timing.deadline).toBeInstanceOf(Date);
		expect(result.timing.repeatInterval).toBe(oneWeek);
		expect(result.timing.minDuration).toBe(2 * oneHour);
		expect(result.timing.maxDuration).toBe(4 * oneHour);
	});

	it('treats a backslash-escaped trigger as literal text', () => {
		const result = parseTypedQuickInput({ input: 'read \\due monday book', now: testNow });
		expect(result.cleanedName).toBe('read due monday book');
		expect(result.timing.deadline).toBeUndefined();
		expect(result.tokens).toHaveLength(0);
	});

	it('treats a quoted trigger as literal text and strips the quotes', () => {
		const result = parseTypedQuickInput({ input: 'read "due monday"', now: testNow });
		expect(result.cleanedName).toBe('read due monday');
		expect(result.timing.deadline).toBeUndefined();
	});

	it('keeps quotes that do not protect a trigger', () => {
		const result = parseTypedQuickInput({ input: 'read "War and Peace"', now: testNow });
		expect(result.cleanedName).toBe('read "War and Peace"');
		expect(result.tokens).toHaveLength(0);
	});

	it('treats an abbreviated weekday at the end of the input as an implied due date', () => {
		const result = parseTypedQuickInput({ input: 'Read Chp.7 tue', now: testNow });
		expect(result.cleanedName).toBe('Read Chp.7');
		expect(result.timing.deadline?.getDay()).toBe(2);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('deadline');
	});

	it('still treats an abbreviated weekday at the end as an implied due date when followed by trailing punctuation', () => {
		const result = parseTypedQuickInput({ input: 'Read Chp.7 tue.', now: testNow });
		expect(result.timing.deadline?.getDay()).toBe(2);
	});

	it('does not treat an abbreviated weekday in the middle of the input as an implied due date', () => {
		const result = parseTypedQuickInput({ input: 'Read Chp.7 tue morning before class', now: testNow });
		expect(result.timing.deadline).toBeUndefined();
		expect(result.tokens).toHaveLength(0);
	});

	it('does not treat a word that happens to match an abbreviated weekday as an implied due date when not at the end', () => {
		const result = parseTypedQuickInput({ input: 'I sat on a chair', now: testNow });
		expect(result.timing.deadline).toBeUndefined();
		expect(result.tokens).toHaveLength(0);
	});
});

describe('escapeTokenInText', () => {
	it('inserts a backslash before the token so re-parsing keeps it literal', () => {
		const first = parseTypedQuickInput({ input: 'essay due friday', now: testNow });
		const escaped = escapeTokenInText('essay due friday', first.tokens[0]);
		expect(escaped).toBe('essay \\due friday');

		const reparsed = parseTypedQuickInput({ input: escaped, now: testNow });
		expect(reparsed.timing.deadline).toBeUndefined();
		expect(reparsed.cleanedName).toBe('essay due friday');
	});
});

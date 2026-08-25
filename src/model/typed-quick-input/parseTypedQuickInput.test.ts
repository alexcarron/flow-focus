import parseTypedQuickInput, { escapeTokenInText } from './parseTypedQuickInput';

const testNow = new Date(2026, 0, 5, 9, 0, 0);
const oneMinute = 1000 * 60;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;
const oneWeek = oneDay * 7;

describe('parseTypedQuickInput', () => {
	it('extracts a deadline and strips it from the name', () => {
		const result = parseTypedQuickInput('finish essay due friday', testNow);
		expect(result.cleanedName).toBe('finish essay');
		expect(result.timing.deadline?.getHours()).toBe(23);
		expect(result.timing.deadline?.getMinutes()).toBe(59);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('deadline');
	});

	it('extracts a daily repeat', () => {
		const result = parseTypedQuickInput('water plants everyday', testNow);
		expect(result.cleanedName).toBe('water plants');
		expect(result.timing.repeatInterval).toBe(oneDay);
	});

	it('extracts a multi-week repeat', () => {
		const result = parseTypedQuickInput('report every 3 weeks', testNow);
		expect(result.cleanedName).toBe('report');
		expect(result.timing.repeatInterval).toBe(3 * oneWeek);
	});

	it('extracts a weekly repeat anchored to a weekday', () => {
		const result = parseTypedQuickInput('gym every monday', testNow);
		expect(result.cleanedName).toBe('gym');
		expect(result.timing.repeatInterval).toBe(oneWeek);
		expect(result.timing.startTime?.getDay()).toBe(1);
	});

	it('extracts a duration range from the "takes" form', () => {
		const result = parseTypedQuickInput('task takes 3 hours to 5 days', testNow);
		expect(result.cleanedName).toBe('task');
		expect(result.timing.minDuration).toBe(3 * oneHour);
		expect(result.timing.maxDuration).toBe(5 * oneDay);
	});

	it('extracts a duration range from the parenthetical form', () => {
		const result = parseTypedQuickInput('call (1-10 minutes)', testNow);
		expect(result.cleanedName).toBe('call');
		expect(result.timing.minDuration).toBe(oneMinute);
		expect(result.timing.maxDuration).toBe(10 * oneMinute);
	});

	it('combines several phrases in one line', () => {
		const result = parseTypedQuickInput('finish essay due friday every week takes 2 to 4 hours', testNow);
		expect(result.cleanedName).toBe('finish essay');
		expect(result.timing.deadline).toBeInstanceOf(Date);
		expect(result.timing.repeatInterval).toBe(oneWeek);
		expect(result.timing.minDuration).toBe(2 * oneHour);
		expect(result.timing.maxDuration).toBe(4 * oneHour);
	});

	it('treats a backslash-escaped trigger as literal text', () => {
		const result = parseTypedQuickInput('read \\due monday book', testNow);
		expect(result.cleanedName).toBe('read due monday book');
		expect(result.timing.deadline).toBeUndefined();
		expect(result.tokens).toHaveLength(0);
	});

	it('treats a quoted trigger as literal text and strips the quotes', () => {
		const result = parseTypedQuickInput('read "due monday"', testNow);
		expect(result.cleanedName).toBe('read due monday');
		expect(result.timing.deadline).toBeUndefined();
	});

	it('keeps quotes that do not protect a trigger', () => {
		const result = parseTypedQuickInput('read "War and Peace"', testNow);
		expect(result.cleanedName).toBe('read "War and Peace"');
		expect(result.tokens).toHaveLength(0);
	});
});

describe('escapeTokenInText', () => {
	it('inserts a backslash before the token so re-parsing keeps it literal', () => {
		const first = parseTypedQuickInput('essay due friday', testNow);
		const escaped = escapeTokenInText('essay due friday', first.tokens[0]);
		expect(escaped).toBe('essay \\due friday');

		const reparsed = parseTypedQuickInput(escaped, testNow);
		expect(reparsed.timing.deadline).toBeUndefined();
		expect(reparsed.cleanedName).toBe('essay due friday');
	});
});

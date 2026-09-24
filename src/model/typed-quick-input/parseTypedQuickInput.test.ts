import parseTypedQuickInput from './parseTypedQuickInput';
import { toEscapedTokenLocation } from './TypedQuickInputToken';
import Time from '../time-management/Time';
import RecurrenceUnit from '../task/recurrence/RecurrenceUnit';

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
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Day });
	});

	it('extracts a multi-week repeat', () => {
		const result = parseTypedQuickInput({ input: 'report every 3 weeks', now: testNow });
		expect(result.cleanedName).toBe('report');
		expect(result.timing.recurrenceDuration).toEqual({ amount: 3, unit: RecurrenceUnit.Week });
	});

	it('extracts a monthly repeat as a calendar month rather than a fixed number of days', () => {
		const result = parseTypedQuickInput({ input: 'pay rent monthly', now: testNow });
		expect(result.cleanedName).toBe('pay rent');
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Month });
	});

	it('extracts an hourly repeat', () => {
		const result = parseTypedQuickInput({ input: 'stretch every 2 hours', now: testNow });
		expect(result.cleanedName).toBe('stretch');
		expect(result.timing.recurrenceDuration).toEqual({ amount: 2, unit: RecurrenceUnit.Hour });
	});

	it('extracts a weekly repeat anchored to a weekday', () => {
		const result = parseTypedQuickInput({ input: 'gym every monday', now: testNow });
		expect(result.cleanedName).toBe('gym');
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Week });
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
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Week });
		expect(result.timing.minDuration).toBe(2 * oneHour);
		expect(result.timing.maxDuration).toBe(4 * oneHour);
	});

	it('treats an escaped trigger as literal text', () => {
		const first = parseTypedQuickInput({ input: 'read due monday book', now: testNow });
		const escapedTokenLocations = [toEscapedTokenLocation(first.tokens[0])];
		const result = parseTypedQuickInput({ input: 'read due monday book', now: testNow, escapedTokenLocations });
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

	it('treats an abbreviated weekday in the middle of the input as an implied due date', () => {
		const result = parseTypedQuickInput({ input: 'Finish chapter 7 tue and chapter 8', now: testNow });
		expect(result.cleanedName).toBe('Finish chapter 7 and chapter 8');
		expect(result.timing.deadline?.getDay()).toBe(2);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('deadline');
	});

	it('treats "last weekday" as an implied due date in the past', () => {
		const result = parseTypedQuickInput({ input: 'Follow up on the call from last friday', now: testNow });
		expect(result.timing.deadline?.getDay()).toBe(5);
		expect(result.timing.deadline?.getTime()).toBeLessThan(testNow.getTime());
	});

	it('treats a word that happens to match an abbreviated weekday as an implied due date even when not at the end', () => {
		const result = parseTypedQuickInput({ input: 'I sat on a chair', now: testNow });
		expect(result.timing.deadline?.getDay()).toBe(6);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('deadline');
	});
});

describe('escapedTokenLocations', () => {
	it('keeps a specific occurrence of a repeated word literal without affecting the other occurrence', () => {
		const first = parseTypedQuickInput({ input: 'optional optional', now: testNow });
		expect(first.tokens).toHaveLength(2);

		const escapedTokenLocations = [toEscapedTokenLocation(first.tokens[0])];
		const result = parseTypedQuickInput({ input: 'optional optional', now: testNow, escapedTokenLocations });
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].startIndex).toBe(9);
		expect(result.cleanedName).toBe('optional');
	});

	it('does not let an escaped implied-due-date candidate block a later candidate from becoming the winner', () => {
		const first = parseTypedQuickInput({ input: 'I sat on a chair', now: testNow });
		expect(first.tokens).toHaveLength(1);
		expect(first.tokens[0].matchedText).toBe('sat');

		const escapedTokenLocations = [toEscapedTokenLocation(first.tokens[0])];
		const withSecondSat = parseTypedQuickInput({
			input: 'sat I sat on a chair',
			now: testNow,
			escapedTokenLocations: escapedTokenLocations.map(location => ({
				...location,
				startIndex: location.startIndex + 4,
				endIndex: location.endIndex + 4,
			})),
		});
		expect(withSecondSat.tokens).toHaveLength(1);
		expect(withSecondSat.tokens[0].matchedText).toBe('sat');
		expect(withSecondSat.tokens[0].startIndex).toBe(0);
	});
});

describe('tags', () => {
	const existingTags = [{ id: 'tag-1', name: 'Urgent' }];

	it('resolves a typed tag that matches an existing tag case-insensitively', () => {
		const result = parseTypedQuickInput({ input: 'Buy milk #urgent', now: testNow, existingTags });
		expect(result.cleanedName).toBe('Buy milk');
		expect(result.tags).toEqual([{ startIndex: 9, endIndex: 16, existingTagID: 'tag-1', newTagName: null }]);
		expect(result.tokens[0].field).toBe('tag');
	});

	it('treats a typed tag with no existing match as a new tag name', () => {
		const result = parseTypedQuickInput({ input: 'Buy milk #groceries', now: testNow, existingTags });
		expect(result.tags).toEqual([{ startIndex: 9, endIndex: 19, existingTagID: null, newTagName: 'groceries' }]);
	});

	it('resolves every tag in a comma-separated list sharing one #', () => {
		const result = parseTypedQuickInput({ input: 'Buy milk #urgent,groceries', now: testNow, existingTags });
		expect(result.cleanedName).toBe('Buy milk');
		expect(result.tags.map(tag => tag.existingTagID ?? tag.newTagName)).toEqual(['tag-1', 'groceries']);
	});

	it('resolves a quoted multi-word tag inside a comma-list without the quotes protecting it from being matched', () => {
		const result = parseTypedQuickInput({ input: 'Buy milk #"Work Project",urgent', now: testNow, existingTags });
		expect(result.cleanedName).toBe('Buy milk');
		expect(result.tags.map(tag => tag.existingTagID ?? tag.newTagName)).toEqual(['Work Project', 'tag-1']);
	});

	it('excludes an escaped tag mention from the resolved tags and keeps it as literal text', () => {
		const first = parseTypedQuickInput({ input: 'Buy milk #urgent', now: testNow, existingTags });
		const escapedTokenLocations = [toEscapedTokenLocation(first.tokens[0])];

		const result = parseTypedQuickInput({ input: 'Buy milk #urgent', now: testNow, existingTags, escapedTokenLocations });
		expect(result.tags).toEqual([]);
		expect(result.cleanedName).toBe('Buy milk #urgent');
	});
});

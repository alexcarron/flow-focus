import parseTypedQuickInput from './parseTypedQuickInput';
import { toEscapedTokenLocation } from './TypedQuickInputToken';
import Time from '../time-management/Time';
import RecurrenceUnit from '../task/recurrence/RecurrenceUnit';
import Weekday from '../time-management/Weekday';

const testNow = new Date(2026, 0, 5, 9, 0, 0);
const oneMinute = 1000 * 60;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;
const oneWeek = oneDay * 7;
const testNightTime = Time.fromString('22:30');

describe('parseTypedQuickInput', () => {
	it('extracts a due date and strips it from the name', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday', now: testNow });
		expect(result.cleanedName).toBe('finish essay');
		expect(result.timing.dueDate?.getHours()).toBe(23);
		expect(result.timing.dueDate?.getMinutes()).toBe(0);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('dueDate');
	});

	it('clamps a due date to night time when night time is earlier than end-of-day', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday', now: testNow, nightTime: testNightTime });
		expect(result.timing.dueDate?.getHours()).toBe(22);
		expect(result.timing.dueDate?.getMinutes()).toBe(30);
	});

	it('does not clamp a due date when night time is at or after end-of-day', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due friday', now: testNow, nightTime: Time.fromString('23:59') });
		expect(result.timing.dueDate?.getHours()).toBe(23);
		expect(result.timing.dueDate?.getMinutes()).toBe(59);
	});

	it('extracts "due midnight" as the start of the next day at exactly 00:00', () => {
		const result = parseTypedQuickInput({ input: 'take out trash due midnight', now: testNow, nightTime: testNightTime });
		expect(result.cleanedName).toBe('take out trash');
		expect(result.timing.dueDate?.getDate()).toBe(6);
		expect(result.timing.dueDate?.getHours()).toBe(0);
		expect(result.timing.dueDate?.getMinutes()).toBe(0);
	});

	it('extracts "due tonight" as today at exactly night time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due tonight', now: testNow, nightTime: testNightTime });
		expect(result.timing.dueDate?.getDate()).toBe(5);
		expect(result.timing.dueDate?.getHours()).toBe(22);
		expect(result.timing.dueDate?.getMinutes()).toBe(30);
	});

	it('extracts "due night" as today at exactly night time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due night', now: testNow, nightTime: testNightTime });
		expect(result.timing.dueDate?.getDate()).toBe(5);
		expect(result.timing.dueDate?.getHours()).toBe(22);
		expect(result.timing.dueDate?.getMinutes()).toBe(30);
	});

	it('extracts "due fri night" as the next Friday at exactly night time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due fri night', now: testNow, nightTime: testNightTime });
		expect(result.timing.dueDate?.getDay()).toBe(5);
		expect(result.timing.dueDate?.getHours()).toBe(22);
		expect(result.timing.dueDate?.getMinutes()).toBe(30);
	});

	it('extracts "due fri 2pm" with the explicit clock time', () => {
		const result = parseTypedQuickInput({ input: 'finish essay due fri 2pm', now: testNow });
		expect(result.timing.dueDate?.getDay()).toBe(5);
		expect(result.timing.dueDate?.getHours()).toBe(14);
		expect(result.timing.dueDate?.getMinutes()).toBe(0);
	});

	it('extracts "starts tomorrow 2:34 am" with the explicit clock time', () => {
		const result = parseTypedQuickInput({ input: 'call mom starts tomorrow 2:34 am', now: testNow });
		expect(result.timing.startDate?.getDate()).toBe(6);
		expect(result.timing.startDate?.getHours()).toBe(2);
		expect(result.timing.startDate?.getMinutes()).toBe(34);
	});

	it('extracts "ideally by next tuesday at 1:00pm" as a target date with the explicit clock time', () => {
		const result = parseTypedQuickInput({ input: 'meeting notes ideally by next tuesday at 1:00pm', now: testNow });
		expect(result.cleanedName).toBe('meeting notes');
		expect(result.timing.targetDate?.getDay()).toBe(2);
		expect(result.timing.targetDate?.getHours()).toBe(13);
		expect(result.timing.targetDate?.getMinutes()).toBe(0);
	});

	it('extracts "due friday morning" using the morning setting', () => {
		const result = parseTypedQuickInput({
			input: 'finish essay due friday morning',
			now: testNow,
			nightTime: testNightTime,
			morningTime: Time.fromString('06:45'),
		});
		expect(result.timing.dueDate?.getDay()).toBe(5);
		expect(result.timing.dueDate?.getHours()).toBe(6);
		expect(result.timing.dueDate?.getMinutes()).toBe(45);
	});

	it.each([
		'due friday',
		'deadline friday',
		'must be done by friday',
		'has to be done by friday',
		'no later than friday',
		"can't finish after friday",
		'cant do after friday',
		'cannot do after friday',
	])('sets a due date for "%s"', (phrase) => {
		const result = parseTypedQuickInput({ input: `clean garage ${phrase}`, now: testNow });
		expect(result.cleanedName).toBe('clean garage');
		expect(result.timing.dueDate?.getDay()).toBe(5);
		expect(result.timing.targetDate).toBeUndefined();
	});

	it.each([
		'by friday',
		'want to finish by friday',
		'aim for friday',
		'aim to finish by friday',
		'ideally by friday',
		'friday',
	])('sets a target date for "%s"', (phrase) => {
		const result = parseTypedQuickInput({ input: `clean garage ${phrase}`, now: testNow });
		expect(result.cleanedName).toBe('clean garage');
		expect(result.timing.targetDate?.getDay()).toBe(5);
		expect(result.timing.dueDate).toBeUndefined();
	});

	it.each([
		'starts friday',
		'starting friday',
		'from friday',
		'after friday',
		'not before friday',
	])('sets a start date for "%s"', (phrase) => {
		const result = parseTypedQuickInput({ input: `clean garage ${phrase}`, now: testNow });
		expect(result.cleanedName).toBe('clean garage');
		expect(result.timing.startDate?.getDay()).toBe(5);
	});

	it('makes "by" set a due date when the task starts with "have to"', () => {
		const result = parseTypedQuickInput({ input: 'I have to finish homework by friday', now: testNow });
		expect(result.cleanedName).toBe('finish homework');
		expect(result.timing.dueDate?.getDay()).toBe(5);
		expect(result.timing.targetDate).toBeUndefined();
	});

	it('keeps "by" setting a target date when the task starts with "want to"', () => {
		const result = parseTypedQuickInput({ input: 'want to play Celeste by sunday', now: testNow });
		expect(result.cleanedName).toBe('play Celeste');
		expect(result.timing.targetDate?.getDay()).toBe(0);
		expect(result.timing.dueDate).toBeUndefined();
	});

	it('keeps "have to" in the name when no "by" date follows it', () => {
		const result = parseTypedQuickInput({ input: 'have to call the plumber', now: testNow });
		expect(result.cleanedName).toBe('have to call the plumber');
		expect(result.tokens).toHaveLength(0);
	});

	it('makes "by" set a target date again once the "have to" lead-in is escaped', () => {
		const input = 'have to finish homework by friday';
		const first = parseTypedQuickInput({ input, now: testNow });
		const leadInToken = first.tokens.find(token => token.matchedText === 'have to')!;
		const result = parseTypedQuickInput({ input, now: testNow, escapedTokenLocations: [toEscapedTokenLocation(leadInToken)] });
		expect(result.cleanedName).toBe('have to finish homework');
		expect(result.timing.targetDate?.getDay()).toBe(5);
		expect(result.timing.dueDate).toBeUndefined();
	});

	it('sets both a target date and a due date in one line', () => {
		const result = parseTypedQuickInput({ input: 'homework 5 by friday due sunday', now: testNow });
		expect(result.cleanedName).toBe('homework 5');
		expect(result.timing.targetDate?.getDay()).toBe(5);
		expect(result.timing.dueDate?.getDay()).toBe(0);
	});

	it('ignores a target date that is after the due date and says so', () => {
		const result = parseTypedQuickInput({ input: 'homework 5 by next sunday due friday', now: testNow });
		expect(result.timing.targetDate).toBeUndefined();
		expect(result.timing.dueDate?.getDay()).toBe(5);
		const targetDateToken = result.tokens.find(token => token.field === 'targetDate')!;
		expect(targetDateToken.explanation).toBe("Ignored, it's after the due date");
	});

	it.each([
		'sort photos by date',
		'email from Bob',
		'clean up after dinner',
	])('does not find a date in "%s"', (input) => {
		const result = parseTypedQuickInput({ input, now: testNow });
		expect(result.cleanedName).toBe(input);
		expect(result.tokens).toHaveLength(0);
	});

	it('does not set a start date from a possessive date', () => {
		const result = parseTypedQuickInput({ input: "notes from monday's meeting", now: testNow });
		expect(result.timing.startDate).toBeUndefined();
		expect(result.tokens).toHaveLength(0);
	});

	it('does not set a start date in the past', () => {
		const result = parseTypedQuickInput({ input: 'Follow up on the call from last friday', now: testNow });
		expect(result.timing.startDate).toBeUndefined();
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

	it('extracts a weekly repeat on one weekday, starting at the morning time with a target date at the end of that day', () => {
		const result = parseTypedQuickInput({ input: 'gym every monday', now: testNow });
		expect(result.cleanedName).toBe('gym');
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Week, weekdays: [Weekday.MONDAY] });
		expect(result.timing.startDate).toEqual(new Date(2026, 0, 5, 7, 0));
		expect(result.timing.targetDate).toEqual(new Date(2026, 0, 5, 23, 0));
		expect(result.timing.dueDate).toBeUndefined();
	});

	it.each([
		['every tue and thu', [Weekday.TUESDAY, Weekday.THURSDAY]],
		['every monday wednesday', [Weekday.MONDAY, Weekday.WEDNESDAY]],
		['every friday, saturday, sunday', [Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY]],
		['every fri, sat, and sun', [Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY]],
		['every thu/tue', [Weekday.TUESDAY, Weekday.THURSDAY]],
		['every weekday', [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY]],
		['every weekend', [Weekday.SATURDAY, Weekday.SUNDAY]],
	])('extracts a weekly repeat on several weekdays from "%s"', (phrase, expectedWeekdays) => {
		const result = parseTypedQuickInput({ input: `stretch ${phrase}`, now: testNow });
		expect(result.cleanedName).toBe('stretch');
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Week, weekdays: expectedWeekdays });
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].explanation).toContain('Repeats every week on');
	});

	it('starts a weekday repeat on the earliest upcoming chosen weekday', () => {
		const result = parseTypedQuickInput({ input: 'stretch every sat and wed', now: testNow });
		expect(result.timing.startDate).toEqual(new Date(2026, 0, 7, 7, 0));
	});

	it('uses a typed time of day as the start of each weekday occurrence', () => {
		const result = parseTypedQuickInput({ input: 'class every tue and thu at 6pm', now: testNow, nightTime: testNightTime });
		expect(result.cleanedName).toBe('class');
		expect(result.timing.startDate).toEqual(new Date(2026, 0, 6, 18, 0));
		expect(result.timing.targetDate).toEqual(new Date(2026, 0, 6, 22, 30));
	});

	it('moves a time-only due date onto the first weekday occurrence without adding a target date', () => {
		const result = parseTypedQuickInput({ input: 'class every tue and thu due 5pm', now: testNow });
		expect(result.timing.startDate).toEqual(new Date(2026, 0, 6, 7, 0));
		expect(result.timing.dueDate).toEqual(new Date(2026, 0, 6, 17, 0));
		expect(result.timing.targetDate).toBeUndefined();
	});

	it('does not treat later weekdays in a repeat list as a target date', () => {
		const result = parseTypedQuickInput({ input: 'call mom friday every tue and thu', now: testNow });
		expect(result.cleanedName).toBe('call mom');
		expect(result.tokens.map(token => token.field)).toEqual(['targetDate', 'recurrenceDuration']);
		expect(result.timing.targetDate?.getDay()).toBe(5);
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
		expect(result.timing.dueDate).toBeInstanceOf(Date);
		expect(result.timing.recurrenceDuration).toEqual({ amount: 1, unit: RecurrenceUnit.Week });
		expect(result.timing.minDuration).toBe(2 * oneHour);
		expect(result.timing.maxDuration).toBe(4 * oneHour);
	});

	it('treats an escaped trigger as literal text', () => {
		const first = parseTypedQuickInput({ input: 'read due monday book', now: testNow });
		const escapedTokenLocations = [toEscapedTokenLocation(first.tokens[0])];
		const result = parseTypedQuickInput({ input: 'read due monday book', now: testNow, escapedTokenLocations });
		expect(result.cleanedName).toBe('read due monday book');
		expect(result.timing.dueDate).toBeUndefined();
		expect(result.tokens).toHaveLength(0);
	});

	it('treats a quoted trigger as literal text and strips the quotes', () => {
		const result = parseTypedQuickInput({ input: 'read "due monday"', now: testNow });
		expect(result.cleanedName).toBe('read due monday');
		expect(result.timing.dueDate).toBeUndefined();
	});

	it('keeps quotes that do not protect a trigger', () => {
		const result = parseTypedQuickInput({ input: 'read "War and Peace"', now: testNow });
		expect(result.cleanedName).toBe('read "War and Peace"');
		expect(result.tokens).toHaveLength(0);
	});

	it('treats an abbreviated weekday at the end of the input as an implied target date', () => {
		const result = parseTypedQuickInput({ input: 'Read Chp.7 tue', now: testNow });
		expect(result.cleanedName).toBe('Read Chp.7');
		expect(result.timing.targetDate?.getDay()).toBe(2);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('targetDate');
	});

	it('still treats an abbreviated weekday at the end as an implied target date when followed by trailing punctuation', () => {
		const result = parseTypedQuickInput({ input: 'Read Chp.7 tue.', now: testNow });
		expect(result.timing.targetDate?.getDay()).toBe(2);
	});

	it('treats an abbreviated weekday in the middle of the input as an implied target date', () => {
		const result = parseTypedQuickInput({ input: 'Finish chapter 7 tue and chapter 8', now: testNow });
		expect(result.cleanedName).toBe('Finish chapter 7 and chapter 8');
		expect(result.timing.targetDate?.getDay()).toBe(2);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('targetDate');
	});

	it('treats "last weekday" as an implied target date in the past', () => {
		const result = parseTypedQuickInput({ input: 'Follow up on the call from last friday', now: testNow });
		expect(result.timing.targetDate?.getDay()).toBe(5);
		expect(result.timing.targetDate?.getTime()).toBeLessThan(testNow.getTime());
	});

	it('treats a word that happens to match an abbreviated weekday as an implied target date even when not at the end', () => {
		const result = parseTypedQuickInput({ input: 'I sat on a chair', now: testNow });
		expect(result.timing.targetDate?.getDay()).toBe(6);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].field).toBe('targetDate');
	});
});

describe('escapedTokenLocations', () => {
	it('keeps a specific occurrence of a repeated word literal without affecting the other occurrence', () => {
		const input = 'takes 1 hour takes 1 hour';
		const first = parseTypedQuickInput({ input, now: testNow });
		expect(first.tokens).toHaveLength(2);

		const escapedTokenLocations = [toEscapedTokenLocation(first.tokens[0])];
		const result = parseTypedQuickInput({ input, now: testNow, escapedTokenLocations });
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].startIndex).toBe(13);
		expect(result.cleanedName).toBe('takes 1 hour');
	});

	it('does not let an escaped implied-target-date candidate block a later candidate from becoming the winner', () => {
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

describe('parseTypedQuickInput prerequisite tasks', () => {
	const watchD3WithFriends = { id: 'watch-d3', description: 'Watch D3 with friends' };
	const watchAMovie = { id: 'watch-movie', description: 'Watch a movie' };
	const fridayGroceries = { id: 'friday-groceries', description: 'Friday groceries' };

	it('matches the start of an existing task name after "after" and strips it from the name', () => {
		const result = parseTypedQuickInput({
			input: 'call parents after watch D3 by 10pm',
			now: testNow,
			prerequisiteTaskCandidates: [watchD3WithFriends, watchAMovie],
		});

		expect(result.cleanedName).toBe('call parents');
		expect(result.prerequisiteTaskIDs).toEqual(['watch-d3']);
		expect(result.timing.targetDate?.getHours()).toBe(22);
		expect(result.tokens[0]).toMatchObject({
			field: 'prerequisiteTask',
			matchedText: 'after watch D3',
			explanation: 'After: Watch D3 with friends',
		});
	});

	it('does not match when the typed words start more than one task name', () => {
		const result = parseTypedQuickInput({
			input: 'call parents after watch',
			now: testNow,
			prerequisiteTaskCandidates: [watchD3WithFriends, watchAMovie],
		});

		expect(result.prerequisiteTaskIDs).toEqual([]);
		expect(result.cleanedName).toBe('call parents after watch');
	});

	it('does not match when the typed words cover only part of the task name\'s first word', () => {
		const result = parseTypedQuickInput({
			input: 'call parents after wat',
			now: testNow,
			prerequisiteTaskCandidates: [watchD3WithFriends],
		});

		expect(result.prerequisiteTaskIDs).toEqual([]);
	});

	it('prefers a matching task name over a start date', () => {
		const result = parseTypedQuickInput({
			input: 'cook dinner after friday groceries',
			now: testNow,
			prerequisiteTaskCandidates: [fridayGroceries],
		});

		expect(result.prerequisiteTaskIDs).toEqual(['friday-groceries']);
		expect(result.timing.startDate).toBeUndefined();
		expect(result.cleanedName).toBe('cook dinner');
	});

	it('keeps reading "after" as a start date when no task name matches', () => {
		const result = parseTypedQuickInput({
			input: 'cook dinner after friday',
			now: testNow,
			prerequisiteTaskCandidates: [watchD3WithFriends],
		});

		expect(result.prerequisiteTaskIDs).toEqual([]);
		expect(result.timing.startDate).toBeDefined();
	});

	it('matches more than one prerequisite task', () => {
		const result = parseTypedQuickInput({
			input: 'call parents after watch D3 after friday groceries',
			now: testNow,
			prerequisiteTaskCandidates: [watchD3WithFriends, fridayGroceries],
		});

		expect(result.prerequisiteTaskIDs).toEqual(['watch-d3', 'friday-groceries']);
		expect(result.cleanedName).toBe('call parents');
	});
});

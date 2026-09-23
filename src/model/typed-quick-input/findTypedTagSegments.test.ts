import findTypedTagSegments from './findTypedTagSegments';

describe('findTypedTagSegments', () => {
	it('finds a single bare tag and strips it back to just before the #', () => {
		const input = 'Buy milk #urgent';
		const result = findTypedTagSegments(input);
		expect(result).toEqual([{ startIndex: input.indexOf('#'), endIndex: input.length, name: 'urgent' }]);
	});

	it('finds multiple space-separated tags, each with its own #', () => {
		const result = findTypedTagSegments('Buy milk #urgent #home');
		expect(result.map(segment => segment.name)).toEqual(['urgent', 'home']);
	});

	it('finds multiple comma-separated tags sharing one #', () => {
		const input = 'Buy milk #urgent,home,errands';
		const result = findTypedTagSegments(input);
		expect(result.map(segment => segment.name)).toEqual(['urgent', 'home', 'errands']);
		expect(result[0].startIndex).toBe(input.indexOf('#'));
		expect(result[1].startIndex).toBe(input.indexOf(',home') );
		expect(result[2].endIndex).toBe(input.length);
	});

	it('allows whitespace after the comma in a comma-list', () => {
		const result = findTypedTagSegments('#urgent, home, errands');
		expect(result.map(segment => segment.name)).toEqual(['urgent', 'home', 'errands']);
	});

	it('finds a quoted multi-word tag', () => {
		const input = 'Plan trip #"Work Project"';
		const result = findTypedTagSegments(input);
		expect(result).toEqual([{ startIndex: input.indexOf('#'), endIndex: input.length, name: 'Work Project' }]);
	});

	it('combines quoted multi-word tags with comma-separated shorthand', () => {
		const result = findTypedTagSegments('#"Work Project",urgent,"Other Tag"');
		expect(result.map(segment => segment.name)).toEqual(['Work Project', 'urgent', 'Other Tag']);
	});

	it('does not treat a # attached to a preceding word as a trigger', () => {
		const result = findTypedTagSegments('C#project');
		expect(result).toEqual([]);
	});

	it('ignores a trailing # with nothing typed after it', () => {
		const result = findTypedTagSegments('Buy milk #');
		expect(result).toEqual([]);
	});

	it('ignores an unclosed quote', () => {
		const result = findTypedTagSegments('#"unterminated');
		expect(result).toEqual([]);
	});
});

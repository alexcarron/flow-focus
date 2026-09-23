import findActiveTagEntryAtCaret from './findActiveTagEntryAtCaret';

describe('findActiveTagEntryAtCaret', () => {
	it('is active with an empty filter right after a bare #', () => {
		const text = 'Buy milk #';
		const result = findActiveTagEntryAtCaret(text, text.length);
		expect(result).toEqual({ segmentStartIndex: text.length, segmentEndIndex: text.length, typedText: '' });
	});

	it('filters by what has been typed after the #', () => {
		const text = 'Buy milk #ta';
		const result = findActiveTagEntryAtCaret(text, text.length);
		expect(result?.typedText).toBe('ta');
		expect(result?.segmentStartIndex).toBe(text.indexOf('ta'));
		expect(result?.segmentEndIndex).toBe(text.length);
	});

	it('is null once the caret has moved past the tag onto plain text', () => {
		const text = 'Buy milk #urgent more text';
		const caretOffset = text.length;
		expect(findActiveTagEntryAtCaret(text, caretOffset)).toBeNull();
	});

	it('reactivates for a comma-continued segment', () => {
		const text = '#urgent,ho';
		const result = findActiveTagEntryAtCaret(text, text.length);
		expect(result?.typedText).toBe('ho');
		expect(result?.segmentStartIndex).toBe(text.indexOf('ho'));
	});

	it('is active inside an open quote, including the space it would otherwise stop at', () => {
		const text = '#"Work P';
		const result = findActiveTagEntryAtCaret(text, text.length);
		expect(result?.typedText).toBe('Work P');
	});

	it('is null when the # is attached to a preceding word', () => {
		const text = 'C#project';
		expect(findActiveTagEntryAtCaret(text, text.length)).toBeNull();
	});

	it('reactivates when the caret is moved back inside an earlier mention', () => {
		const text = '#urgent more text';
		const caretOffset = text.indexOf('urgent') + 2;
		const result = findActiveTagEntryAtCaret(text, caretOffset);
		expect(result?.typedText).toBe('ur');
		expect(result?.segmentEndIndex).toBe(text.indexOf(' more'));
	});
});

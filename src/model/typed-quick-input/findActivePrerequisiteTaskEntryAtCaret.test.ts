import findActivePrerequisiteTaskEntryAtCaret from './findActivePrerequisiteTaskEntryAtCaret';

describe('findActivePrerequisiteTaskEntryAtCaret', () => {
	it('is active with nothing typed right after "after "', () => {
		const text = 'call parents after ';
		const result = findActivePrerequisiteTaskEntryAtCaret({ text, caretOffset: text.length, pinnedPrerequisiteTaskLocations: [] });
		expect(result).toEqual({ nameStartIndex: text.length, nameEndIndex: text.length, typedText: '' });
	});

	it('is not active before a space follows "after"', () => {
		const text = 'call parents after';
		const result = findActivePrerequisiteTaskEntryAtCaret({ text, caretOffset: text.length, pinnedPrerequisiteTaskLocations: [] });
		expect(result).toBeNull();
	});

	it('covers every word typed after "after" up to the caret and the rest of the word at the caret', () => {
		const text = 'call parents after watch D3 tonight';
		const caretOffset = text.indexOf('D3') + 1;
		const result = findActivePrerequisiteTaskEntryAtCaret({ text, caretOffset, pinnedPrerequisiteTaskLocations: [] });
		expect(result).toEqual({
			nameStartIndex: text.indexOf('watch'),
			nameEndIndex: text.indexOf('D3') + 2,
			typedText: 'watch D',
		});
	});

	it('is not active once the name after "after" is pinned', () => {
		const text = 'call parents after Watch D3 ';
		const nameStartIndex = text.indexOf('Watch');
		const result = findActivePrerequisiteTaskEntryAtCaret({
			text,
			caretOffset: text.length,
			pinnedPrerequisiteTaskLocations: [{ prerequisiteTaskID: 'watch-d3', matchedText: 'Watch D3', startIndex: nameStartIndex, endIndex: nameStartIndex + 8 }],
		});
		expect(result).toBeNull();
	});

	it('ignores an "after" inside a pinned task name', () => {
		const text = 'rest after Clean up after party ';
		const nameStartIndex = text.indexOf('Clean');
		const pinnedName = 'Clean up after party';
		const result = findActivePrerequisiteTaskEntryAtCaret({
			text,
			caretOffset: text.length,
			pinnedPrerequisiteTaskLocations: [{ prerequisiteTaskID: 'clean-up', matchedText: pinnedName, startIndex: nameStartIndex, endIndex: nameStartIndex + pinnedName.length }],
		});
		expect(result).toBeNull();
	});
});

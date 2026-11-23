import shortenTaskNameToInsertIntoTypedQuickInput from './shortenTaskNameToInsertIntoTypedQuickInput';

describe('shortenTaskNameToInsertIntoTypedQuickInput', () => {
	it('keeps a short task name whole', () => {
		expect(shortenTaskNameToInsertIntoTypedQuickInput('Watch D3 with friends')).toBe('Watch D3 with friends');
	});

	it('cuts a long task name at a whole word and ends it with an ellipsis', () => {
		const shortenedName = shortenTaskNameToInsertIntoTypedQuickInput('Finish the quarterly budget spreadsheet for the team');
		expect(shortenedName).toBe('Finish the quarterly budget…');
	});

	it('cuts inside the first word when that word alone is too long', () => {
		const shortenedName = shortenTaskNameToInsertIntoTypedQuickInput('Supercalifragilisticexpialidocious-and-more');
		expect(shortenedName.endsWith('…')).toBe(true);
		expect(shortenedName.length).toBe(30);
	});
});

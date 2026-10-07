import { describe, it, expect } from 'vitest';
import parsePastedTextIntoNestedListItems, { PastedListItem, isSingleListItemWithoutChildren } from './parsePastedTextIntoNestedListItems';

function getTexts(items: PastedListItem[]): string[] {
	return items.map(item => item.text);
}

describe('parsePastedTextIntoNestedListItems', () => {
	it('splits each line into its own item', () => {
		const items = parsePastedTextIntoNestedListItems('Drink Water\nTurn off AC\nGo to Bathroom');
		expect(getTexts(items)).toEqual(['Drink Water', 'Turn off AC', 'Go to Bathroom']);
	});

	it('ignores blank lines', () => {
		const items = parsePastedTextIntoNestedListItems('Drink Water\n\n   \nTurn off AC');
		expect(getTexts(items)).toEqual(['Drink Water', 'Turn off AC']);
	});

	it('handles carriage returns from Windows clipboards', () => {
		const items = parsePastedTextIntoNestedListItems('Drink Water\r\nTurn off AC');
		expect(getTexts(items)).toEqual(['Drink Water', 'Turn off AC']);
	});

	it('strips markdown checkbox markers and keeps whether each one was checked', () => {
		const items = parsePastedTextIntoNestedListItems('- [x] Wake Up\n- [X] Shower\n- [ ] Get Ready\n- [-] Cancelled\nNo Checkbox');
		expect(items).toEqual([
			{ text: 'Wake Up', isChecked: true, children: [] },
			{ text: 'Shower', isChecked: true, children: [] },
			{ text: 'Get Ready', isChecked: false, children: [] },
			{ text: 'Cancelled', isChecked: false, children: [] },
			{ text: 'No Checkbox', isChecked: false, children: [] },
		]);
	});

	it('strips bullet and ordered list markers', () => {
		const items = parsePastedTextIntoNestedListItems('- Drink Water\n* Turn off AC\n+ Stretch\n1. Eat Breakfast\n2) Drink Coffee');
		expect(getTexts(items)).toEqual(['Drink Water', 'Turn off AC', 'Stretch', 'Eat Breakfast', 'Drink Coffee']);
	});

	it('nests indented items under the closest less indented item above them', () => {
		const pasted = '- [x] Go to Bathroom\n    - [x] Brush Teeth\n        - [ ] Shampoo\n        - [x] Conditioner\n    - [ ] Floss\n- [ ] Get Dressed';
		const items = parsePastedTextIntoNestedListItems(pasted);
		expect(items).toEqual([
			{
				text: 'Go to Bathroom',
				isChecked: true,
				children: [
					{
						text: 'Brush Teeth',
						isChecked: true,
						children: [
							{ text: 'Shampoo', isChecked: false, children: [] },
							{ text: 'Conditioner', isChecked: true, children: [] },
						],
					},
					{ text: 'Floss', isChecked: false, children: [] },
				],
			},
			{ text: 'Get Dressed', isChecked: false, children: [] },
		]);
	});

	it('nests two space indentation', () => {
		const items = parsePastedTextIntoNestedListItems('- [ ] Add "Standup"\n  - [ ] What have you finished?\n  - [ ] Is anything blocking you?\n- [ ] Share the agenda');
		expect(getTexts(items)).toEqual(['Add "Standup"', 'Share the agenda']);
		expect(getTexts(items[0].children)).toEqual(['What have you finished?', 'Is anything blocking you?']);
	});

	it('nests tab indentation', () => {
		const items = parsePastedTextIntoNestedListItems('- Parent\n\t- Child\n\t\t- Grandchild');
		expect(getTexts(items)).toEqual(['Parent']);
		expect(getTexts(items[0].children)).toEqual(['Child']);
		expect(getTexts(items[0].children[0].children)).toEqual(['Grandchild']);
	});

	it('keeps items at the top level when the whole paste is indented the same amount', () => {
		const items = parsePastedTextIntoNestedListItems('    - First\n    - Second');
		expect(getTexts(items)).toEqual(['First', 'Second']);
	});

	it('removes bold and italic emphasis while keeping the text', () => {
		const items = parsePastedTextIntoNestedListItems('- [x] **7AM** - Wake Up\n- *Stretch* now');
		expect(getTexts(items)).toEqual(['7AM - Wake Up', 'Stretch now']);
	});

	it('replaces wikilinks with their visible text', () => {
		const items = parsePastedTextIntoNestedListItems('Review Weekly [[Goals]]\nClean up tasks [[To Do]]');
		expect(getTexts(items)).toEqual(['Review Weekly Goals', 'Clean up tasks To Do']);
	});

	it('uses the alias side of an aliased wikilink', () => {
		const items = parsePastedTextIntoNestedListItems('Open [[daily-note|Today]]');
		expect(getTexts(items)).toEqual(['Open Today']);
	});

	it('keeps emoji and parenthetical content intact', () => {
		const items = parsePastedTextIntoNestedListItems('- [ ] ⏭ Check for Upcoming Tasks (School, TickTick)');
		expect(getTexts(items)).toEqual(['⏭ Check for Upcoming Tasks (School, TickTick)']);
	});

	it('returns no items for empty or whitespace-only input', () => {
		expect(parsePastedTextIntoNestedListItems('')).toEqual([]);
		expect(parsePastedTextIntoNestedListItems('\n   \n')).toEqual([]);
	});
});

describe('isSingleListItemWithoutChildren', () => {
	it('is true only for exactly one item with no children', () => {
		expect(isSingleListItemWithoutChildren(parsePastedTextIntoNestedListItems('- [ ] Only'))).toBe(true);
		expect(isSingleListItemWithoutChildren(parsePastedTextIntoNestedListItems('- [ ] Parent\n  - [ ] Child'))).toBe(false);
		expect(isSingleListItemWithoutChildren(parsePastedTextIntoNestedListItems('First\nSecond'))).toBe(false);
		expect(isSingleListItemWithoutChildren([])).toBe(false);
	});
});

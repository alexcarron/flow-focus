import { describe, it, expect } from 'vitest';
import parsePastedTextIntoListItems from './parsePastedTextIntoListItems';

describe('parsePastedTextIntoListItems', () => {
	it('splits each line into its own item', () => {
		const items = parsePastedTextIntoListItems('Drink Water\nTurn off AC\nGo to Bathroom');
		expect(items).toEqual(['Drink Water', 'Turn off AC', 'Go to Bathroom']);
	});

	it('ignores blank lines', () => {
		const items = parsePastedTextIntoListItems('Drink Water\n\n   \nTurn off AC');
		expect(items).toEqual(['Drink Water', 'Turn off AC']);
	});

	it('handles carriage returns from Windows clipboards', () => {
		const items = parsePastedTextIntoListItems('Drink Water\r\nTurn off AC');
		expect(items).toEqual(['Drink Water', 'Turn off AC']);
	});

	it('strips markdown checkbox markers regardless of checked state', () => {
		const items = parsePastedTextIntoListItems('- [x] Wake Up\n- [ ] Get Ready');
		expect(items).toEqual(['Wake Up', 'Get Ready']);
	});

	it('strips bullet and ordered list markers', () => {
		const items = parsePastedTextIntoListItems('- Drink Water\n* Turn off AC\n+ Stretch\n1. Eat Breakfast\n2) Drink Coffee');
		expect(items).toEqual(['Drink Water', 'Turn off AC', 'Stretch', 'Eat Breakfast', 'Drink Coffee']);
	});

	it('flattens indented sub-items into individual items', () => {
		const pasted = '- [x] Go to Bathroom\n    - [x] Brush Teeth\n        - [x] Shampoo\n        - [x] Conditioner';
		const items = parsePastedTextIntoListItems(pasted);
		expect(items).toEqual(['Go to Bathroom', 'Brush Teeth', 'Shampoo', 'Conditioner']);
	});

	it('removes bold and italic emphasis while keeping the text', () => {
		const items = parsePastedTextIntoListItems('- [x] **7AM** - Wake Up\n- *Stretch* now');
		expect(items).toEqual(['7AM - Wake Up', 'Stretch now']);
	});

	it('replaces wikilinks with their visible text', () => {
		const items = parsePastedTextIntoListItems('Review Weekly [[Goals]]\nClean up tasks [[To Do]]');
		expect(items).toEqual(['Review Weekly Goals', 'Clean up tasks To Do']);
	});

	it('uses the alias side of an aliased wikilink', () => {
		const items = parsePastedTextIntoListItems('Open [[daily-note|Today]]');
		expect(items).toEqual(['Open Today']);
	});

	it('keeps emoji and parenthetical content intact', () => {
		const items = parsePastedTextIntoListItems('- [ ] ⏭ Check for Upcoming Tasks (School, TickTick)');
		expect(items).toEqual(['⏭ Check for Upcoming Tasks (School, TickTick)']);
	});

	it('returns no items for empty or whitespace-only input', () => {
		expect(parsePastedTextIntoListItems('')).toEqual([]);
		expect(parsePastedTextIntoListItems('\n   \n')).toEqual([]);
	});
});

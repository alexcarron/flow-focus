import { describe, it, expect } from 'vitest';
import parsePastedTextIntoSteps from './parsePastedTextIntoSteps';

describe('parsePastedTextIntoSteps', () => {
	it('splits each line into its own step', () => {
		const steps = parsePastedTextIntoSteps('Drink Water\nTurn off AC\nGo to Bathroom');
		expect(steps).toEqual(['Drink Water', 'Turn off AC', 'Go to Bathroom']);
	});

	it('ignores blank lines', () => {
		const steps = parsePastedTextIntoSteps('Drink Water\n\n   \nTurn off AC');
		expect(steps).toEqual(['Drink Water', 'Turn off AC']);
	});

	it('handles carriage returns from Windows clipboards', () => {
		const steps = parsePastedTextIntoSteps('Drink Water\r\nTurn off AC');
		expect(steps).toEqual(['Drink Water', 'Turn off AC']);
	});

	it('strips markdown checkbox markers regardless of checked state', () => {
		const steps = parsePastedTextIntoSteps('- [x] Wake Up\n- [ ] Get Ready');
		expect(steps).toEqual(['Wake Up', 'Get Ready']);
	});

	it('strips bullet and ordered list markers', () => {
		const steps = parsePastedTextIntoSteps('- Drink Water\n* Turn off AC\n+ Stretch\n1. Eat Breakfast\n2) Drink Coffee');
		expect(steps).toEqual(['Drink Water', 'Turn off AC', 'Stretch', 'Eat Breakfast', 'Drink Coffee']);
	});

	it('flattens indented sub-items into individual steps', () => {
		const pasted = '- [x] Go to Bathroom\n    - [x] Brush Teeth\n        - [x] Shampoo\n        - [x] Conditioner';
		const steps = parsePastedTextIntoSteps(pasted);
		expect(steps).toEqual(['Go to Bathroom', 'Brush Teeth', 'Shampoo', 'Conditioner']);
	});

	it('removes bold and italic emphasis while keeping the text', () => {
		const steps = parsePastedTextIntoSteps('- [x] **7AM** - Wake Up\n- *Stretch* now');
		expect(steps).toEqual(['7AM - Wake Up', 'Stretch now']);
	});

	it('replaces wikilinks with their visible text', () => {
		const steps = parsePastedTextIntoSteps('Review Weekly [[Goals]]\nClean up tasks [[To Do]]');
		expect(steps).toEqual(['Review Weekly Goals', 'Clean up tasks To Do']);
	});

	it('uses the alias side of an aliased wikilink', () => {
		const steps = parsePastedTextIntoSteps('Open [[daily-note|Today]]');
		expect(steps).toEqual(['Open Today']);
	});

	it('keeps emoji and parenthetical content intact', () => {
		const steps = parsePastedTextIntoSteps('- [ ] ⏭ Check for Upcoming Tasks (School, TickTick)');
		expect(steps).toEqual(['⏭ Check for Upcoming Tasks (School, TickTick)']);
	});

	it('returns no steps for empty or whitespace-only input', () => {
		expect(parsePastedTextIntoSteps('')).toEqual([]);
		expect(parsePastedTextIntoSteps('\n   \n')).toEqual([]);
	});
});

import updateEscapedTokenLocationsAfterTextChange from './updateEscapedTokenLocationsAfterTextChange';
import { EscapedTokenLocation } from './TypedQuickInputToken';

const satLocation: EscapedTokenLocation = { field: 'deadline', matchedText: 'sat', startIndex: 2, endIndex: 5 };

describe('updateEscapedTokenLocationsAfterTextChange', () => {
	it('shifts a location forward when text is inserted before it', () => {
		const result = updateEscapedTokenLocationsAfterTextChange('I sat on a chair', 'sat I sat on a chair', [satLocation]);
		expect(result).toEqual([{ ...satLocation, startIndex: 6, endIndex: 9 }]);
	});

	it('shifts a location backward when text is removed before it', () => {
		const result = updateEscapedTokenLocationsAfterTextChange('I sat on a chair', 'sat on a chair', [satLocation]);
		expect(result).toEqual([{ ...satLocation, startIndex: 0, endIndex: 3 }]);
	});

	it('leaves a location untouched when the edit happens after it', () => {
		const result = updateEscapedTokenLocationsAfterTextChange('I sat on a chair', 'I sat on a comfy chair', [satLocation]);
		expect(result).toEqual([satLocation]);
	});

	it('drops a location when the edit overlaps it', () => {
		const result = updateEscapedTokenLocationsAfterTextChange('I sat on a chair', 'I swat on a chair', [satLocation]);
		expect(result).toEqual([]);
	});

	it('returns the same array reference when the text is unchanged', () => {
		const locations = [satLocation];
		expect(updateEscapedTokenLocationsAfterTextChange('I sat on a chair', 'I sat on a chair', locations)).toBe(locations);
	});
});

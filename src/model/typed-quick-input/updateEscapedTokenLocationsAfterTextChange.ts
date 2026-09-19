import { EscapedTokenLocation } from './TypedQuickInputToken';

function findCommonPrefixLength(oldText: string, newText: string): number {
	const maxLength = Math.min(oldText.length, newText.length);
	let length = 0;
	while (length < maxLength && oldText[length] === newText[length]) length++;
	return length;
}

function findCommonSuffixLength(oldText: string, newText: string, maxLength: number): number {
	let length = 0;
	while (
		length < maxLength &&
		oldText[oldText.length - 1 - length] === newText[newText.length - 1 - length]
	) length++;
	return length;
}

export default function updateEscapedTokenLocationsAfterTextChange(
	oldText: string,
	newText: string,
	escapedTokenLocations: EscapedTokenLocation[]
): EscapedTokenLocation[] {
	if (oldText === newText || escapedTokenLocations.length === 0) return escapedTokenLocations;

	const prefixLength = findCommonPrefixLength(oldText, newText);
	const suffixLength = findCommonSuffixLength(oldText, newText, Math.min(oldText.length, newText.length) - prefixLength);

	const editStart = prefixLength;
	const editOldEnd = oldText.length - suffixLength;
	const editNewEnd = newText.length - suffixLength;
	const lengthDelta = editNewEnd - editOldEnd;

	const updatedLocations: EscapedTokenLocation[] = [];
	for (const location of escapedTokenLocations) {
		if (location.endIndex <= editStart) {
			updatedLocations.push(location);
		} else if (location.startIndex >= editOldEnd) {
			updatedLocations.push({
				...location,
				startIndex: location.startIndex + lengthDelta,
				endIndex: location.endIndex + lengthDelta,
			});
		}
	}
	return updatedLocations;
}

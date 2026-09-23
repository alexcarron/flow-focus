const onesWordToValue: Record<string, number> = {
	zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};

const teenWordToValue: Record<string, number> = {
	ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
	fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const tensWordToValue: Record<string, number> = {
	twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const tensAlternation = Object.keys(tensWordToValue).join('|');
const teenAlternation = Object.keys(teenWordToValue).join('|');
const onesAlternation = Object.keys(onesWordToValue).join('|');

export type ParsedWordNumber = {
	value: number;
	matchedLength: number;
};

export function parseWordNumber(text: string): ParsedWordNumber | null {
	const compoundMatch = new RegExp(`^\\s*(${tensAlternation})(?:[\\s-]+(${onesAlternation}))?\\b`, 'i').exec(text);
	if (compoundMatch) {
		const tensValue = tensWordToValue[compoundMatch[1].toLowerCase()];
		const onesValue = compoundMatch[2] ? onesWordToValue[compoundMatch[2].toLowerCase()] : 0;
		return { value: tensValue + onesValue, matchedLength: compoundMatch[0].length };
	}

	const teenMatch = new RegExp(`^\\s*(${teenAlternation})\\b`, 'i').exec(text);
	if (teenMatch) return { value: teenWordToValue[teenMatch[1].toLowerCase()], matchedLength: teenMatch[0].length };

	const onesMatch = new RegExp(`^\\s*(${onesAlternation})\\b`, 'i').exec(text);
	if (onesMatch) return { value: onesWordToValue[onesMatch[1].toLowerCase()], matchedLength: onesMatch[0].length };

	return null;
}

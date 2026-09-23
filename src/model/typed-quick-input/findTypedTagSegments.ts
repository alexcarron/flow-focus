export type TypedTagSegment = {
	startIndex: number;
	endIndex: number;
	name: string;
};

const TRIGGER_REGEX = /(^|\s)#/g;

function readSegmentName(input: string, nameStartIndex: number): { nameEndIndex: number; name: string } | null {
	if (input[nameStartIndex] === '"') {
		const closingQuoteIndex = input.indexOf('"', nameStartIndex + 1);
		if (closingQuoteIndex === -1) return null;
		const name = input.slice(nameStartIndex + 1, closingQuoteIndex).trim();
		if (name === '') return null;
		return { nameEndIndex: closingQuoteIndex + 1, name };
	}

	const bareWordMatch = /^[^\s,]+/.exec(input.slice(nameStartIndex));
	if (!bareWordMatch) return null;
	return { nameEndIndex: nameStartIndex + bareWordMatch[0].length, name: bareWordMatch[0] };
}

export default function findTypedTagSegments(input: string): TypedTagSegment[] {
	const segments: TypedTagSegment[] = [];

	TRIGGER_REGEX.lastIndex = 0;
	let triggerMatch: RegExpExecArray | null;
	while ((triggerMatch = TRIGGER_REGEX.exec(input)) !== null) {
		const hashIndex = triggerMatch.index + triggerMatch[1].length;
		const firstSegment = readSegmentName(input, hashIndex + 1);
		if (!firstSegment) {
			TRIGGER_REGEX.lastIndex = hashIndex + 1;
			continue;
		}

		segments.push({ startIndex: hashIndex, endIndex: firstSegment.nameEndIndex, name: firstSegment.name });
		let cursor = firstSegment.nameEndIndex;

		while (input[cursor] === ',') {
			const commaIndex = cursor;
			let nextNameStartIndex = commaIndex + 1;
			while (input[nextNameStartIndex] === ' ') nextNameStartIndex++;

			const nextSegment = readSegmentName(input, nextNameStartIndex);
			if (!nextSegment) break;

			segments.push({ startIndex: commaIndex, endIndex: nextSegment.nameEndIndex, name: nextSegment.name });
			cursor = nextSegment.nameEndIndex;
		}

		TRIGGER_REGEX.lastIndex = cursor;
	}

	return segments;
}

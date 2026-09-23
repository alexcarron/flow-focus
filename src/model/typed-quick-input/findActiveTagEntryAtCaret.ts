export type ActiveTagEntry = {
	segmentStartIndex: number;
	segmentEndIndex: number;
	typedText: string;
};

function scanGroupFromHash(text: string, hashIndex: number, caretOffset: number): ActiveTagEntry | null {
	let cursor = hashIndex + 1;
	let segmentStartIndex = cursor;
	let isInsideQuotes = false;

	if (text[cursor] === '"') {
		isInsideQuotes = true;
		segmentStartIndex = cursor + 1;
		cursor++;
	}

	function withinSegment(segmentEndIndex: number): ActiveTagEntry | null {
		if (caretOffset < segmentStartIndex || caretOffset > segmentEndIndex) return null;
		return { segmentStartIndex, segmentEndIndex, typedText: text.slice(segmentStartIndex, caretOffset) };
	}

	function advanceToNextSegment(afterIndex: number): boolean {
		let nextCursor = afterIndex + 1;
		while (text[nextCursor] === ' ') nextCursor++;
		segmentStartIndex = nextCursor;
		cursor = nextCursor;
		if (text[cursor] === '"') {
			isInsideQuotes = true;
			segmentStartIndex = cursor + 1;
			cursor++;
		}
		return true;
	}

	while (cursor <= text.length) {
		const character = text[cursor];

		if (isInsideQuotes) {
			if (character === '"' || character === undefined) {
				const result = withinSegment(cursor);
				if (result) return result;
				if (character === undefined) return null;

				isInsideQuotes = false;
				if (text[cursor + 1] === ',') {
					advanceToNextSegment(cursor + 1);
					continue;
				}
				return null;
			}
			cursor++;
			continue;
		}

		if (character === undefined || /\s/.test(character)) {
			return withinSegment(cursor);
		}

		if (character === ',') {
			const result = withinSegment(cursor);
			if (result) return result;
			advanceToNextSegment(cursor);
			continue;
		}

		cursor++;
	}

	return null;
}

export default function findActiveTagEntryAtCaret(text: string, caretOffset: number): ActiveTagEntry | null {
	if (caretOffset < 0 || caretOffset > text.length) return null;

	for (let index = 0; index < text.length; index++) {
		if (text[index] !== '#') continue;
		if (index !== 0 && !/\s/.test(text[index - 1])) continue;

		const result = scanGroupFromHash(text, index, caretOffset);
		if (result) return result;
	}

	return null;
}

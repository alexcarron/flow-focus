import { PinnedPrerequisiteTaskLocation } from './TypedQuickInputToken';

const AFTER_TRIGGER_REGEX = /\bafter\s+/gi;

export type ActivePrerequisiteTaskEntry = {
	nameStartIndex: number;
	nameEndIndex: number;
	typedText: string;
};

function findEndOfWordAt({ text, index }: { text: string; index: number }): number {
	let endIndex = index;
	while (endIndex < text.length && !/\s/.test(text[endIndex])) endIndex++;
	return endIndex;
}

export default function findActivePrerequisiteTaskEntryAtCaret({ text, caretOffset, pinnedPrerequisiteTaskLocations }: {
	text: string;
	caretOffset: number;
	pinnedPrerequisiteTaskLocations: PinnedPrerequisiteTaskLocation[];
}): ActivePrerequisiteTaskEntry | null {
	if (caretOffset < 0 || caretOffset > text.length) return null;

	const isIndexInsidePinnedLocation = (index: number) => pinnedPrerequisiteTaskLocations.some(location =>
		index >= location.startIndex && index < location.endIndex
	);

	const triggerRegex = new RegExp(AFTER_TRIGGER_REGEX.source, 'gi');
	let nameStartIndex: number | null = null;
	let triggerMatch: RegExpExecArray | null;
	while ((triggerMatch = triggerRegex.exec(text)) !== null) {
		const triggerNameStartIndex = triggerMatch.index + triggerMatch[0].length;
		if (triggerNameStartIndex > caretOffset) break;
		if (isIndexInsidePinnedLocation(triggerMatch.index)) continue;
		nameStartIndex = triggerNameStartIndex;
	}
	if (nameStartIndex === null) return null;

	const startOfName = nameStartIndex;
	const isNameAlreadyPinned = pinnedPrerequisiteTaskLocations.some(location => location.startIndex === startOfName);
	if (isNameAlreadyPinned) return null;

	return {
		nameStartIndex,
		nameEndIndex: findEndOfWordAt({ text, index: caretOffset }),
		typedText: text.slice(nameStartIndex, caretOffset),
	};
}

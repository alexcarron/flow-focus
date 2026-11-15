import TaskTimingOptions from '../task/TaskTimingOptions';

export type TypedQuickInputField =
	| 'dueDate'
	| 'targetDate'
	| 'startDate'
	| 'recurrenceDuration'
	| 'duration'
	| 'ignoredDate'
	| 'steps'
	| 'tag';

export type TypedQuickInputToken = {
	field: TypedQuickInputField;
	matchedText: string;
	startIndex: number;
	endIndex: number;
	explanation: string;
	colorClass: string;
};

export type EscapedTokenLocation = {
	field: TypedQuickInputField;
	matchedText: string;
	startIndex: number;
	endIndex: number;
};

export type TypedQuickInputTagMatch = {
	startIndex: number;
	endIndex: number;
	existingTagID: string | null;
	newTagName: string | null;
};

export type TypedQuickInputParseResult = {
	cleanedName: string;
	timing: Partial<TaskTimingOptions>;
	steps: string[] | null;
	tags: TypedQuickInputTagMatch[];
	tokens: TypedQuickInputToken[];
	escapedTokens: TypedQuickInputToken[];
};

const fieldToBecomeLabel: Record<TypedQuickInputField, string> = {
	dueDate: 'due date',
	targetDate: 'target date',
	startDate: 'start date',
	recurrenceDuration: 'repeat interval',
	duration: 'duration',
	ignoredDate: 'date',
	steps: 'step',
	tag: 'tag',
};

export function getTokenBecomeLabel(token: TypedQuickInputToken): string {
	return fieldToBecomeLabel[token.field];
}

export function toEscapedTokenLocation(token: TypedQuickInputToken): EscapedTokenLocation {
	return { field: token.field, matchedText: token.matchedText, startIndex: token.startIndex, endIndex: token.endIndex };
}

const fieldsThatCanSwapBetweenDateKinds: TypedQuickInputField[] = ['ignoredDate', 'targetDate', 'dueDate'];

function getCanonicalFieldForEscapeIdentity(field: TypedQuickInputField): TypedQuickInputField {
	if (fieldsThatCanSwapBetweenDateKinds.includes(field)) return 'targetDate';
	return field;
}

export function isTokenEscapedByLocation({ token, location }: { token: EscapedTokenLocation; location: EscapedTokenLocation }): boolean {
	return (
		getCanonicalFieldForEscapeIdentity(token.field) === getCanonicalFieldForEscapeIdentity(location.field) &&
		token.startIndex === location.startIndex &&
		token.matchedText.startsWith(location.matchedText)
	);
}

export function isTokenEscapedByAnyLocation(token: EscapedTokenLocation, escapedTokenLocations: EscapedTokenLocation[]): boolean {
	return escapedTokenLocations.some(location => isTokenEscapedByLocation({ token, location }));
}

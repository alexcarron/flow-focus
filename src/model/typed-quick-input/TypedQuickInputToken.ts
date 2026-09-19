import TaskTimingOptions from '../task/TaskTimingOptions';

export type TypedQuickInputField =
	| 'deadline'
	| 'startTime'
	| 'endTime'
	| 'recurrenceDuration'
	| 'duration'
	| 'isMandatory'
	| 'ignoredDate'
	| 'steps';

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

export type TypedQuickInputParseResult = {
	cleanedName: string;
	timing: Partial<TaskTimingOptions>;
	steps: string[] | null;
	tokens: TypedQuickInputToken[];
	escapedTokens: TypedQuickInputToken[];
};

const fieldToBecomeLabel: Record<TypedQuickInputField, string> = {
	deadline: 'deadline',
	startTime: 'start time',
	endTime: 'end time',
	recurrenceDuration: 'repeat interval',
	duration: 'duration',
	isMandatory: 'mandatory',
	ignoredDate: 'date',
	steps: 'step',
};

export function getTokenBecomeLabel(token: TypedQuickInputToken): string {
	if (token.field === 'isMandatory') {
		return token.explanation.includes('optional') ? 'optional' : 'mandatory';
	}
	return fieldToBecomeLabel[token.field];
}

export function toEscapedTokenLocation(token: TypedQuickInputToken): EscapedTokenLocation {
	return { field: token.field, matchedText: token.matchedText, startIndex: token.startIndex, endIndex: token.endIndex };
}

function getCanonicalFieldForEscapeIdentity(field: TypedQuickInputField): TypedQuickInputField {
	return field === 'ignoredDate' ? 'deadline' : field;
}

export function serializeEscapedTokenLocation(location: EscapedTokenLocation): string {
	return JSON.stringify([getCanonicalFieldForEscapeIdentity(location.field), location.matchedText, location.startIndex]);
}

import TaskTimingOptions from '../task/TaskTimingOptions';

export type TypedQuickInputField =
	| 'deadline'
	| 'startTime'
	| 'endTime'
	| 'repeatInterval'
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
};

export function toEscapedTokenLocation(token: TypedQuickInputToken): EscapedTokenLocation {
	return { field: token.field, matchedText: token.matchedText, startIndex: token.startIndex, endIndex: token.endIndex };
}

export function serializeEscapedTokenLocation(location: EscapedTokenLocation): string {
	return JSON.stringify([location.field, location.matchedText, location.startIndex]);
}

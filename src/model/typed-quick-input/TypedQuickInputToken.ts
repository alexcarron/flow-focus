import TaskTimingOptions from '../task/TaskTimingOptions';

export type TypedQuickInputField =
	| 'deadline'
	| 'startTime'
	| 'endTime'
	| 'repeatInterval'
	| 'duration'
	| 'isMandatory';

export type TypedQuickInputToken = {
	field: TypedQuickInputField;
	matchedText: string;
	startIndex: number;
	endIndex: number;
	explanation: string;
	colorClass: string;
};

export type TypedQuickInputParseResult = {
	cleanedName: string;
	timing: Partial<TaskTimingOptions>;
	tokens: TypedQuickInputToken[];
};

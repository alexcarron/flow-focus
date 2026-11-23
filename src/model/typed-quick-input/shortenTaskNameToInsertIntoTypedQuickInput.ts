const MAXIMUM_INSERTED_TASK_NAME_LENGTH = 30;
const ELLIPSIS = '…';

export default function shortenTaskNameToInsertIntoTypedQuickInput(taskName: string): string {
	const normalizedTaskName = taskName.trim().replace(/\s+/g, ' ');
	if (normalizedTaskName.length <= MAXIMUM_INSERTED_TASK_NAME_LENGTH) return normalizedTaskName;

	const maximumLengthBeforeEllipsis = MAXIMUM_INSERTED_TASK_NAME_LENGTH - ELLIPSIS.length;
	let shortenedTaskName = '';
	for (const word of normalizedTaskName.split(' ')) {
		const shortenedTaskNameWithWord = shortenedTaskName === '' ? word : `${shortenedTaskName} ${word}`;
		if (shortenedTaskNameWithWord.length > maximumLengthBeforeEllipsis) break;
		shortenedTaskName = shortenedTaskNameWithWord;
	}
	if (shortenedTaskName === '') shortenedTaskName = normalizedTaskName.slice(0, maximumLengthBeforeEllipsis);
	return `${shortenedTaskName}${ELLIPSIS}`;
}

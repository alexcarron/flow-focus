import type Task from './Task';
import { formatDate } from '../../utilities/dateFormatting';

const MINIMUM_SHOWN_ID_LENGTH = 8;

function describeDate({ date, label, textWhenMissing }: { date: Date | null; label: string; textWhenMissing: string }): string {
	if (date === null) return textWhenMissing;
	const formattedDate = formatDate(date);
	return `${label} ${formattedDate}`;
}

const detailGetters: ((task: Task) => string)[] = [
	task => describeDate({
		date: task.getDueDate(),
		label: 'Due',
		textWhenMissing: 'No due date',
	}),
	task => describeDate({
		date: task.getTargetDate(),
		label: 'Ideally',
		textWhenMissing: 'No target date',
	}),
	task => describeDate({
		date: task.getStartDate(),
		label: 'Starts',
		textWhenMissing: 'No start date',
	}),
	task => describeDate({
		date: task.createdAt,
		label: 'Added',
		textWhenMissing: '',
	}),
];

function normalizeTaskName(taskName: string): string {
	return taskName.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getShortestUniqueIDOfTask({ task, sameNamedTasks }: { task: Task; sameNamedTasks: Task[] }): string {
	let shownIDLength = MINIMUM_SHOWN_ID_LENGTH;
	const isShownIDShared = () => sameNamedTasks.some(otherTask => otherTask.id.startsWith(task.id.slice(0, shownIDLength)));
	while (shownIDLength < task.id.length && isShownIDShared()) shownIDLength++;
	return task.id.slice(0, shownIDLength);
}

export default function getDetailDistinguishingTaskFromSameNamedTasks({ task, tasks }: { task: Task; tasks: Task[] }): string | null {
	const normalizedTaskName = normalizeTaskName(task.getDescription());
	const sameNamedTasks = tasks.filter(otherTask =>
		otherTask.id !== task.id &&
		normalizeTaskName(otherTask.getDescription()) === normalizedTaskName
	);
	if (sameNamedTasks.length === 0) return null;

	for (const getDetail of detailGetters) {
		const detail = getDetail(task);
		const isDetailUnique = sameNamedTasks.every(otherTask => getDetail(otherTask) !== detail);
		if (isDetailUnique) return detail;
	}

	const shortestUniqueID = getShortestUniqueIDOfTask({
		task,
		sameNamedTasks,
	});
	return `ID ${shortestUniqueID}`;
}

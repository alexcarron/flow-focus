import { useShallow } from 'zustand/react/shallow';
import { useTasksStore, selectRemainingTasksSummary } from '../stores/tasksStore';
import { RemainingTasksSummary as RemainingTasksSummaryData } from '../model/task/calculateRemainingTasksSummary';
import { formatReadableDurationRange } from '../utilities/timeFormatters';
import styles from './RemainingTasksSummary.module.css';

function formatTotalDurationRange({ totalMinRequiredTime, totalAssumedMaxRequiredTime }: RemainingTasksSummaryData): string {
	const formattedDurationRange = formatReadableDurationRange({
		minimumMilliseconds: totalMinRequiredTime,
		maximumMilliseconds: totalAssumedMaxRequiredTime,
	});
	return `${formattedDurationRange} of work`;
}

function formatRemainingTasksSummary(summary: RemainingTasksSummaryData): string {
	const taskCountText = `${summary.remainingTaskCount} ${summary.remainingTaskCount === 1 ? 'task' : 'tasks'} remaining`;
	const hasAnyDuration = summary.totalAssumedMaxRequiredTime > 0;
	if (!hasAnyDuration) 
		return taskCountText;
	
	return `${taskCountText} (${formatTotalDurationRange(summary)})`;
}

export default function RemainingTasksSummary() {
	const summary = useTasksStore(useShallow(selectRemainingTasksSummary));

	if (summary.remainingTaskCount === 0) return null;

	return <p className={styles.summary}>{formatRemainingTasksSummary(summary)}</p>;
}

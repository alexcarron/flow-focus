import { useShallow } from 'zustand/react/shallow';
import { useTasksStore, selectRemainingTasksSummary } from '../stores/tasksStore';
import { RemainingTasksSummary as RemainingTasksSummaryData } from '../model/task/calculateRemainingTasksSummary';
import { formatReadableDurationRange } from '../utilities/timeFormatters';
import styles from './RemainingTasksSummary.module.css';

function formatTotalDurationRange({ totalMinRequiredTime, totalAssumedMaxRequiredTime }: RemainingTasksSummaryData): string {
	const formattedDurationRange = formatReadableDurationRange({
		minimumMilliseconds: totalMinRequiredTime,
		maximumMilliseconds: totalAssumedMaxRequiredTime,
		shouldOnlyShowTopUnitUnlessItIsOne: true,
	});
	return `(about ${formattedDurationRange} of work)`;
}

function formatRemainingTaskCount(summary: RemainingTasksSummaryData): string {
	return `${summary.remainingTaskCount} ${summary.remainingTaskCount === 1 ? 'task' : 'tasks'} remaining`;
}

export default function RemainingTasksSummary() {
	const summary = useTasksStore(useShallow(selectRemainingTasksSummary));

	if (summary.remainingTaskCount === 0) return null;

	const hasAnyDuration = summary.totalAssumedMaxRequiredTime > 0;

	return (
		<div className={styles.summary}>
			<p>{formatRemainingTaskCount(summary)}</p>
			{hasAnyDuration && <p>{formatTotalDurationRange(summary)}</p>}
		</div>
	);
}

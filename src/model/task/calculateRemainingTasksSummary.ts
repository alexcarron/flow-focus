import Task from './Task';

export interface RemainingTasksSummary {
	remainingTaskCount: number;
	totalMinRequiredTime: number;
	totalAssumedMaxRequiredTime: number;
}

export function calculateRemainingTasksSummary(remainingTasks: Task[]): RemainingTasksSummary {
	const remainingTaskCount = remainingTasks.length;
	const totalMinRequiredTime = remainingTasks.reduce(
		(prevTotalMinRequiredTime, currentTask) => prevTotalMinRequiredTime + currentTask.getMinRequiredTime(), 
		0
	);
	const totalAssumedMaxRequiredTime = remainingTasks.reduce(
		(prevTotalMaxRequiredTime, currentTask) => prevTotalMaxRequiredTime + currentTask.getAssumedMaxRequiredTime(), 
		0
	)
	
	return {
		remainingTaskCount,
		totalMinRequiredTime,
		totalAssumedMaxRequiredTime,
	};
}

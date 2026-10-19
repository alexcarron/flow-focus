import Task from './Task';
import { getStepLeavesInOrder } from './step/stepTree';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
export const LEAF_STEP_COUNT_FOR_FULL_TASK_EFFORT = 20;
export const DURATION_MINUTES_FOR_FULL_TASK_EFFORT = 4 * 60;
const DURATION_MINUTES_PER_EFFORT_CURVE_UNIT = 5;

function calculateEffortOnFlatteningCurve({ amount, amountForFullEffort }: {
	amount: number,
	amountForFullEffort: number,
}): number {
	const effort = Math.log1p(amount) / Math.log1p(amountForFullEffort);
	return Math.min(1, Math.max(0, effort));
}

export function calculateTaskEffort(task: Task): number {
	const leafStepCount = getStepLeavesInOrder(task.getSteps()).length;
	const durationMinutes = task.getAssumedMaxRequiredTime() / MILLISECONDS_PER_MINUTE;

	const leafStepCountEffort = calculateEffortOnFlatteningCurve({
		amount: leafStepCount,
		amountForFullEffort: LEAF_STEP_COUNT_FOR_FULL_TASK_EFFORT,
	});
	const durationEffort = calculateEffortOnFlatteningCurve({
		amount: durationMinutes / DURATION_MINUTES_PER_EFFORT_CURVE_UNIT,
		amountForFullEffort: DURATION_MINUTES_FOR_FULL_TASK_EFFORT / DURATION_MINUTES_PER_EFFORT_CURVE_UNIT,
	});
	return Math.max(leafStepCountEffort, durationEffort);
}

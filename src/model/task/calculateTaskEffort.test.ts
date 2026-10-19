import TasksManager from '../TasksManager';
import Task from './Task';
import Step from './step/Step';
import StepStatus from './step/StepStatus';
import {
	calculateTaskEffort,
	DURATION_MINUTES_FOR_FULL_TASK_EFFORT,
	LEAF_STEP_COUNT_FOR_FULL_TASK_EFFORT,
} from './calculateTaskEffort';

const MILLISECONDS_PER_MINUTE = 60 * 1000;

function createLeafSteps(leafStepCount: number): Step[] {
	return Array.from({ length: leafStepCount }, (_, stepIndex) => ({
		id: crypto.randomUUID(),
		text: `Step ${stepIndex + 1}`,
		status: StepStatus.COMPLETED,
		children: [],
	}));
}

describe('calculateTaskEffort', () => {
	let task: Task;

	beforeEach(() => {
		task = new Task(new TasksManager(), 'Write report');
	});

	it('is zero for a task with no steps and no duration', () => {
		expect(calculateTaskEffort(task)).toBe(0);
	});

	it('increases with every added leaf step', () => {
		task.replaceAllSteps(createLeafSteps(1));
		const oneStepEffort = calculateTaskEffort(task);
		task.replaceAllSteps(createLeafSteps(5));
		const fiveStepEffort = calculateTaskEffort(task);

		expect(oneStepEffort).toBeGreaterThan(0);
		expect(fiveStepEffort).toBeGreaterThan(oneStepEffort);
	});

	it('counts only leaf steps, not their parent steps', () => {
		task.replaceAllSteps([{
			id: crypto.randomUUID(),
			text: 'Parent',
			status: StepStatus.COMPLETED,
			children: createLeafSteps(3),
		}]);
		const nestedEffort = calculateTaskEffort(task);
		task.replaceAllSteps(createLeafSteps(3));

		expect(nestedEffort).toBe(calculateTaskEffort(task));
	});

	it('increases with a longer duration', () => {
		task.setMinRequiredTime(15 * MILLISECONDS_PER_MINUTE);
		const fifteenMinuteEffort = calculateTaskEffort(task);
		task.setMinRequiredTime(90 * MILLISECONDS_PER_MINUTE);

		expect(calculateTaskEffort(task)).toBeGreaterThan(fifteenMinuteEffort);
	});

	it('uses the max duration when one is set', () => {
		task.setMinRequiredTime(10 * MILLISECONDS_PER_MINUTE);
		const minDurationOnlyEffort = calculateTaskEffort(task);
		task.setMaxRequiredTime(60 * MILLISECONDS_PER_MINUTE);

		expect(calculateTaskEffort(task)).toBeGreaterThan(minDurationOnlyEffort);
	});

	it('gives each added step less effort than the step before it', () => {
		const leafStepCountToEffort = [0, 1, 2].map(leafStepCount => {
			task.replaceAllSteps(createLeafSteps(leafStepCount));
			return calculateTaskEffort(task);
		});

		expect(leafStepCountToEffort[1] - leafStepCountToEffort[0]).toBeGreaterThan(leafStepCountToEffort[2] - leafStepCountToEffort[1]);
	});

	it('is the larger of the step effort and the duration effort', () => {
		task.replaceAllSteps(createLeafSteps(2));
		const stepEffort = calculateTaskEffort(task);
		task.replaceAllSteps([]);
		task.setMinRequiredTime(2 * 60 * MILLISECONDS_PER_MINUTE);
		const durationEffort = calculateTaskEffort(task);
		task.replaceAllSteps(createLeafSteps(2));

		expect(calculateTaskEffort(task)).toBe(Math.max(stepEffort, durationEffort));
	});

	it('reaches full effort at the full effort step count and stays there', () => {
		task.replaceAllSteps(createLeafSteps(LEAF_STEP_COUNT_FOR_FULL_TASK_EFFORT));
		expect(calculateTaskEffort(task)).toBeCloseTo(1);

		task.replaceAllSteps(createLeafSteps(LEAF_STEP_COUNT_FOR_FULL_TASK_EFFORT * 3));
		expect(calculateTaskEffort(task)).toBe(1);
	});

	it('reaches full effort at the full effort duration and stays there', () => {
		task.setMinRequiredTime(DURATION_MINUTES_FOR_FULL_TASK_EFFORT * MILLISECONDS_PER_MINUTE);
		expect(calculateTaskEffort(task)).toBeCloseTo(1);

		task.setMinRequiredTime(DURATION_MINUTES_FOR_FULL_TASK_EFFORT * 3 * MILLISECONDS_PER_MINUTE);
		expect(calculateTaskEffort(task)).toBe(1);
	});
});

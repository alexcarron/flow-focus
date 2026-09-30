import TasksManager from '../TasksManager';
import Task from './Task';
import Step from './step/Step';
import StepStatus from './step/StepStatus';
import RecurrenceUnit from './recurrence/RecurrenceUnit';
import { convertTaskToMarkdown } from './convertTaskToMarkdown';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const now = new Date(2026, 8, 30, 12, 0);

function createStepWithChildren({ text, status = StepStatus.UNCOMPLETE, children = [] }: { text: string; status?: StepStatus; children?: Step[] }): Step {
	return { id: crypto.randomUUID(), text, status, children };
}

describe('convertTaskToMarkdown', () => {
	let task: Task;

	beforeEach(() => {
		task = new Task(new TasksManager(), 'Write report');
	});

	it('outputs only the heading when the task has no details or steps', () => {
		expect(convertTaskToMarkdown({ task, tags: [], now })).toBe('# Write report');
	});

	it('outputs nested steps as task-list items with completion and skipped states', () => {
		task.replaceAllSteps([
			createStepWithChildren({ text: 'Outline', status: StepStatus.COMPLETED }),
			createStepWithChildren({ text: 'Research', status: StepStatus.SKIPPED }),
			createStepWithChildren({
				text: 'Draft',
				children: [
					createStepWithChildren({ text: 'Intro', status: StepStatus.COMPLETED }),
					createStepWithChildren({ text: 'Body' }),
				],
			}),
		]);

		expect(convertTaskToMarkdown({ task, tags: [], now })).toBe([
			'# Write report',
			'',
			'- [x] Outline',
			'- [ ] ~~Research~~',
			'- [ ] Draft',
			'  - [x] Intro',
			'  - [ ] Body',
		].join('\n'));
	});

	it('outputs attached tags in order on one line and ignores unknown tag ids', () => {
		task = new Task(new TasksManager(), 'Write report', 'task-id', ['writing-tag-id', 'missing-tag-id', 'work-tag-id']);
		const tags = [
			{ id: 'work-tag-id', name: 'work' },
			{ id: 'writing-tag-id', name: 'writing' },
		];

		expect(convertTaskToMarkdown({ task, tags, now })).toBe('# Write report\n\n(writing) (work)');
	});

	it('outputs every set detail in order between the tags and the steps', () => {
		task = new Task(new TasksManager(), 'Write report', 'task-id', ['work-tag-id']);
		task.setMandatory(true);
		task.setStartTime(new Date(2026, 9, 1, 9, 0));
		task.setDeadline(new Date(2026, 9, 3, 17, 0));
		task.setEndTime(new Date(2026, 9, 3, 18, 30));
		task.setRecurrenceDuration({ amount: 2, unit: RecurrenceUnit.Week });
		task.setMinRequiredTime(30 * MILLISECONDS_PER_MINUTE);
		task.setMaxRequiredTime(60 * MILLISECONDS_PER_MINUTE);
		task.setSkippedUntil(new Date(2026, 9, 2, 8, 0));
		task.replaceAllSteps([createStepWithChildren({ text: 'Outline' })]);

		expect(convertTaskToMarkdown({ task, tags: [{ id: 'work-tag-id', name: 'work' }], now })).toBe([
			'# Write report',
			'',
			'(work)',
			'',
			'Mandatory',
			'Starts Oct 1, 2026 9:00 AM',
			'Due Oct 3, 2026 5:00 PM',
			'Ends Oct 3, 2026 6:30 PM',
			'Repeats every 2 weeks',
			'Duration: 30 min-1 hr',
			'Skipped until Oct 2, 2026 8:00 AM',
			'',
			'- [ ] Outline',
		].join('\n'));
	});

	it('marks a minimum-only duration as open-ended', () => {
		task.setMinRequiredTime(30 * MILLISECONDS_PER_MINUTE);

		expect(convertTaskToMarkdown({ task, tags: [], now })).toBe('# Write report\n\nDuration: 30 min+');
	});

	it('leaves out a skip that has already ended', () => {
		task.setSkippedUntil(new Date(2026, 8, 29, 8, 0));

		expect(convertTaskToMarkdown({ task, tags: [], now })).toBe('# Write report');
	});
});

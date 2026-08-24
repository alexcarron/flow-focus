import { useState } from 'react';
import { useTasksStore, selectTasksInPriorityOrder } from '../stores/tasksStore';
import Task from '../model/task/Task';
import Duration from '../model/time-management/Duration';
import { formatDate, formatTime } from '../utils/formatters';
import TextInput from '../components/inputs/TextInput';
import CheckboxInput from '../components/inputs/CheckboxInput';
import TimingOptionsPopup from '../components/TimingOptionsPopup';
import styles from './TasksManagerPage.module.css';

enum Filter { None, Active, MustStartToday }
enum SortBy { Priority, Name, Steps, TimeAvailable, Duration, RepeatInterval }
enum SortDir { Asc, Desc }

const FILTER_LABELS: Record<Filter, string> = {
	[Filter.None]: 'All',
	[Filter.Active]: 'Active',
	[Filter.MustStartToday]: 'Must Start Today',
};

const SORT_LABELS: Record<SortBy, string> = {
	[SortBy.Priority]: 'Priority',
	[SortBy.Name]: 'Name',
	[SortBy.Steps]: 'Steps',
	[SortBy.TimeAvailable]: 'Time Available',
	[SortBy.Duration]: 'Duration',
	[SortBy.RepeatInterval]: 'Repeat',
};

function applyFilter(tasks: Task[], filter: Filter): Task[] {
	const now = new Date();
	if (filter === Filter.Active)
		return tasks.filter(t => t.isActive(now) && t.getDeadline() !== null);
	if (filter === Filter.MustStartToday)
		return tasks.filter(t => t.mustStartToday(now));
	return tasks;
}

function applySort(tasks: Task[], sortBy: SortBy, dir: SortDir): Task[] {
	const now = new Date();
	let sorted = [...tasks];

	if (sortBy === SortBy.Name)
		sorted.sort((a, b) => a.getDescription().localeCompare(b.getDescription()));
	else if (sortBy === SortBy.Steps)
		sorted.sort((a, b) => a.getSteps().length - b.getSteps().length);
	else if (sortBy === SortBy.TimeAvailable)
		sorted.sort((a, b) => a.getTimeToComplete(now) - b.getTimeToComplete(now));
	else if (sortBy === SortBy.Duration)
		sorted.sort((a, b) => a.getMaxRequiredTime(now) - b.getMaxRequiredTime(now));
	else if (sortBy === SortBy.RepeatInterval)
		sorted.sort((a, b) => {
			if (a.getRepeatInterval() === null) return -1;
			if (b.getRepeatInterval() === null) return 1;
			return a.getRepeatInterval()! - b.getRepeatInterval()!;
		});

	if (dir === SortDir.Desc) sorted.reverse();
	return sorted;
}

function toDurationString(ms: number): string {
	const d = Duration.fromMilliseconds(ms);
	const amount = d.getAmountOfUnits();
	const unit = d.getTimeUnit().name;
	return amount === 1 ? unit.slice(0, -1) : `${amount} ${unit}`;
}

function getDurationRange(minMs: number | null, maxMs: number | null, now: Date): string {
	if (minMs === null && maxMs === null) return '—';
	const start = Duration.fromMilliseconds(minMs ?? 0);
	const end = Duration.fromMilliseconds(maxMs ?? 0);
	const [s, e] = Duration.getDurationRangeStrings(start, end);
	return e ? `${s}–${e}` : s;
}

export default function TasksManagerPage() {
	const tasks = useTasksStore(selectTasksInPriorityOrder);
	const setStep = useTasksStore(s => s.setStep);
	const setDescription = useTasksStore(s => s.setDescription);
	const setStepComplete = useTasksStore(s => s.setStepComplete);
	const setComplete = useTasksStore(s => s.setComplete);
	const setMandatory = useTasksStore(s => s.setMandatory);
	const deleteTask = useTasksStore(s => s.deleteTask);
	const refreshTasks = useTasksStore(s => s.refreshTasks);
	const persistChangedTasks = useTasksStore(s => s.persistChangedTasks);
	const store: RowActions = { setStep, setDescription, setStepComplete, setComplete, setMandatory, deleteTask, refreshTasks, persistChangedTasks };
	const [filter, setFilter] = useState<Filter>(Filter.None);
	const [sortBy, setSortBy] = useState<SortBy>(SortBy.Priority);
	const [sortDir, setSortDir] = useState<SortDir>(SortDir.Asc);
	const [timingTask, setTimingTask] = useState<Task | null>(null);

	const now = new Date();
	const displayed = applyFilter(applySort(tasks, sortBy, sortDir), filter);

	function toggleFilter() {
		setFilter(f => ((f + 1) % 3) as Filter);
	}

	function toggleSort(col: SortBy) {
		if (sortBy === col) {
			setSortDir(d => d === SortDir.Asc ? SortDir.Desc : SortDir.Asc);
		} else {
			setSortBy(col);
			setSortDir(SortDir.Asc);
		}
	}

	function sortIcon(col: SortBy): string {
		if (sortBy !== col) return '↕';
		return sortDir === SortDir.Asc ? '↑' : '↓';
	}

	return (
		<div className={styles.page}>
			<div className={styles.toolbar}>
				<button onClick={toggleFilter} className="button small outlined">
					Filter: {FILTER_LABELS[filter]}
				</button>
			</div>

			<table className={styles.table}>
				<thead>
					<tr className={styles.headerRow}>
						{(Object.entries(SORT_LABELS) as [string, string][]).map(([key, label]) => (
							<th
								key={key}
								className={`${styles.columnHeader} ${styles.sortableHeader}`}
								onClick={() => toggleSort(parseInt(key) as SortBy)}
							>
								{label} <span className={styles.sortIndicator}>{sortIcon(parseInt(key) as SortBy)}</span>
							</th>
						))}
						<th className={styles.columnHeader}>Done</th>
						<th className={styles.columnHeader}>Mandatory</th>
						<th className={styles.columnHeader}>Deadline</th>
						<th className={styles.columnHeader}>Start</th>
						<th className={styles.columnHeader}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{displayed.map((task, idx) => (
						<TaskRow
							key={task.dbId ?? idx}
							task={task}
							now={now}
							store={store}
							onOpenTiming={() => setTimingTask(task)}
						/>
					))}
				</tbody>
			</table>

			{displayed.length === 0 && (
				<p className={styles.emptyMessage}>No tasks match the current filter</p>
			)}

			<TimingOptionsPopup
				task={timingTask}
				isOpen={timingTask !== null}
				onClose={() => setTimingTask(null)}
			/>
		</div>
	);
}

interface RowActions {
	setStep: (task: Task, old: string, n: string) => void;
	setDescription: (task: Task, v: string) => void;
	setStepComplete: (task: Task, step: string, v: boolean) => void;
	setComplete: (task: Task, v: boolean) => void;
	setMandatory: (task: Task, v: boolean) => void;
	deleteTask: (task: Task) => Promise<void>;
	refreshTasks: () => void;
	persistChangedTasks: (tasks: Task[]) => Promise<void>;
}

interface RowProps {
	task: Task;
	now: Date;
	store: RowActions;
	onOpenTiming: () => void;
}

function TaskRow({ task, now, store, onOpenTiming }: RowProps) {
	const steps = task.getSteps();
	const minMs = task.getMinRequiredTime() ?? null;
	const maxMs = task.hasMaxRequiredTime() ? task.getMaxRequiredTime(now) : null;
	const startTime = task.getStartTime();
	const displayStartTime = startTime && startTime > now ? startTime : null;

	function onStepChange(oldStep: string, newStep: string) {
		if (newStep !== oldStep) store.setStep(task, oldStep, newStep);
	}

	function onStepKeyDown(step: string, e: React.KeyboardEvent) {
		if (e.altKey && e.key === 'ArrowLeft') {
			e.preventDefault();
			task.createStepLeftOfStep(step);
			store.refreshTasks();
			store.persistChangedTasks([task]);
		} else if (e.altKey && e.key === 'ArrowRight') {
			e.preventDefault();
			task.createStepRightOfStep(step);
			store.refreshTasks();
			store.persistChangedTasks([task]);
		}
	}

	return (
		<tr className={styles.row}>
			<td className={styles.cell}>
				—
			</td>

			<td className={styles.descriptionCell}>
				<TextInput
					value={task.getDescription()}
					onChange={v => store.setDescription(task, v)}
					className={styles.descriptionInput}
				/>
			</td>

			<td className={styles.stepsCell}>
				<div className={styles.stepList}>
					{steps.map(step => (
						<div key={step} className={styles.stepRow}>
							<CheckboxInput
								value={task.isStepComplete(step)}
								onChange={v => store.setStepComplete(task, step, v)}
							/>
							<TextInput
								value={step}
								onChange={newVal => onStepChange(step, newVal)}
								onKeyDown={e => onStepKeyDown(step, e)}
								className={styles.stepInput}
							/>
						</div>
					))}
				</div>
			</td>

			<td className={styles.cell}>
				{task.getDeadline()
					? formatTime(task.getTimeToComplete(now))
					: '∞'}
			</td>

			<td className={styles.cell}>
				{minMs !== null || maxMs !== null
					? getDurationRange(minMs, maxMs, now)
					: '—'}
			</td>

			<td className={styles.cell}>
				{task.getRepeatInterval() !== null
					? toDurationString(task.getRepeatInterval()!)
					: '—'}
			</td>

			<td className={styles.checkboxCell}>
				<CheckboxInput
					value={task.getIsComplete()}
					onChange={v => store.setComplete(task, v)}
				/>
			</td>

			<td className={styles.checkboxCell}>
				<CheckboxInput
					value={task.getIsMandatory()}
					onChange={v => store.setMandatory(task, v)}
				/>
			</td>

			<td className={styles.cell}>
				{formatDate(task.getDeadline(), '—')}
			</td>

			<td className={styles.cell}>
				{displayStartTime ? formatDate(displayStartTime) : '—'}
			</td>

			<td className={styles.actionsCell}>
				<div className={styles.rowActions}>
					<button
						onClick={onOpenTiming}
						className="button tiny"
						title="Edit timing"
					>
						⏱
					</button>
					<button
						onClick={() => store.deleteTask(task)}
						className="button tiny danger"
						title="Delete task"
					>
						✕
					</button>
				</div>
			</td>
		</tr>
	);
}

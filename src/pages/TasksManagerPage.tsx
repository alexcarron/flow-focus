import { useEffect, useState } from 'react';
import { useTasksStore, selectTasksInPriorityOrder } from '../stores/tasksStore';
import Task from '../model/task/Task';
import FilterDropdown from '../components/FilterDropdown';
import SelectionCheckbox from '../components/SelectionCheckbox';
import TaskManagerRow, { TaskManagerRowActions } from '../components/TaskManagerRow';
import TimingOptionsPopup from '../components/TimingOptionsPopup';
import ConfirmModal from '../components/ConfirmModal';
import styles from './TasksManagerPage.module.css';

enum Filter { Active, MustStartToday, Recurring, All }
enum SortBy { Priority, Name, Steps, TimeAvailable, Duration, RepeatInterval, Deadline }
enum SortDir { Asc, Desc }

const FILTER_OPTIONS: { value: Filter; label: string; description: string }[] = [
	{
		value: Filter.Active,
		label: 'Active',
		description: 'Tasks that are open right now (started, not finished, not completed) and have a deadline',
	},
	{
		value: Filter.MustStartToday,
		label: 'Must Start Today',
		description: 'Active tasks that need to be started today to still meet their deadline',
	},
	{
		value: Filter.Recurring,
		label: 'Recurring',
		description: 'Tasks that repeat on a schedule',
	},
	{
		value: Filter.All,
		label: 'All Tasks',
		description: 'Every task, regardless of status, deadline, or completion',
	},
];

const SORT_LABELS: Record<Exclude<SortBy, SortBy.Deadline>, string> = {
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
	if (filter === Filter.Recurring)
		return tasks.filter(t => t.isRecurring());
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
	else if (sortBy === SortBy.Deadline)
		sorted.sort((a, b) => {
			const deadlineA = a.getDeadline();
			const deadlineB = b.getDeadline();
			if (deadlineA === null) return 1;
			if (deadlineB === null) return -1;
			return deadlineA.getTime() - deadlineB.getTime();
		});

	if (dir === SortDir.Desc) sorted.reverse();
	return sorted;
}

function getRowID(task: Task, index: number): string {
	return task.dbId !== undefined ? `id-${task.dbId}` : `idx-${index}`;
}

export default function TasksManagerPage() {
	const tasks = useTasksStore(selectTasksInPriorityOrder);
	const setSteps = useTasksStore(s => s.setSteps);
	const setDescription = useTasksStore(s => s.setDescription);
	const setStepComplete = useTasksStore(s => s.setStepComplete);
	const setComplete = useTasksStore(s => s.setComplete);
	const setMandatory = useTasksStore(s => s.setMandatory);
	const deleteTask = useTasksStore(s => s.deleteTask);
	const refreshTasks = useTasksStore(s => s.refreshTasks);
	const persistChangedTasks = useTasksStore(s => s.persistChangedTasks);
	const store: TaskManagerRowActions = { setDescription, setSteps, setStepComplete, setComplete, setMandatory, deleteTask, refreshTasks, persistChangedTasks };

	const [filter, setFilter] = useState<Filter>(Filter.Active);
	const [sortBy, setSortBy] = useState<SortBy>(SortBy.Priority);
	const [sortDir, setSortDir] = useState<SortDir>(SortDir.Asc);
	const [timingTask, setTimingTask] = useState<Task | null>(null);
	const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);
	const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
	const [selectedRowIDs, setSelectedRowIDs] = useState<Set<string>>(new Set());
	const [isDragSelecting, setIsDragSelecting] = useState(false);
	const [dragSelectValue, setDragSelectValue] = useState(true);

	const now = new Date();
	const displayed = applyFilter(applySort(tasks, sortBy, sortDir), filter);

	useEffect(() => {
		setSelectedRowIDs(new Set());
	}, [filter]);

	useEffect(() => {
		if (!isDragSelecting) return;
		function stopDragSelecting() {
			setIsDragSelecting(false);
		}
		window.addEventListener('mouseup', stopDragSelecting);
		return () => window.removeEventListener('mouseup', stopDragSelecting);
	}, [isDragSelecting]);

	function setRowSelected(rowID: string, isSelected: boolean) {
		setSelectedRowIDs(current => {
			const next = new Set(current);
			if (isSelected) next.add(rowID);
			else next.delete(rowID);
			return next;
		});
	}

	function onRowSelectMouseDown(rowID: string) {
		const nextValue = !selectedRowIDs.has(rowID);
		setIsDragSelecting(true);
		setDragSelectValue(nextValue);
		setRowSelected(rowID, nextValue);
	}

	function onRowSelectMouseEnter(rowID: string) {
		if (isDragSelecting) setRowSelected(rowID, dragSelectValue);
	}

	function toggleSelectAll() {
		const rowIDs = displayed.map((task, idx) => getRowID(task, idx));
		const areAllSelected = rowIDs.length > 0 && rowIDs.every(id => selectedRowIDs.has(id));
		setSelectedRowIDs(areAllSelected ? new Set() : new Set(rowIDs));
	}

	const selectedTasks = displayed.filter((task, idx) => selectedRowIDs.has(getRowID(task, idx)));

	function requestDeleteSelectedTasks() {
		if (selectedTasks.length === 0) return;
		setIsDeleteSelectedConfirmOpen(true);
	}

	async function confirmDeleteSelectedTasks() {
		await Promise.all(selectedTasks.map(task => deleteTask(task)));
		setSelectedRowIDs(new Set());
		setIsDeleteSelectedConfirmOpen(false);
	}

	async function confirmDeletePendingTask() {
		if (taskPendingDeletion === null) return;
		await deleteTask(taskPendingDeletion);
		setTaskPendingDeletion(null);
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

	const rowIDs = displayed.map((task, idx) => getRowID(task, idx));
	const areAllDisplayedSelected = rowIDs.length > 0 && rowIDs.every(id => selectedRowIDs.has(id));

	return (
		<div className={styles.page}>
			<div className={styles.toolbar}>
				<FilterDropdown value={filter} options={FILTER_OPTIONS} onChange={setFilter} />

				{selectedRowIDs.size > 0 && (
					<button
						onClick={requestDeleteSelectedTasks}
						className={`button small danger ${styles.deleteSelectedButton}`}
					>
						Delete {selectedRowIDs.size} Selected
					</button>
				)}
			</div>

			<table className={styles.table}>
				<thead>
					<tr className={styles.headerRow}>
						<th className={styles.columnHeader}>
							<SelectionCheckbox isSelected={areAllDisplayedSelected} onMouseDown={toggleSelectAll} />
						</th>
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
						<th
							className={`${styles.columnHeader} ${styles.sortableHeader}`}
							onClick={() => toggleSort(SortBy.Deadline)}
						>
							Deadline <span className={styles.sortIndicator}>{sortIcon(SortBy.Deadline)}</span>
						</th>
						<th className={styles.columnHeader}>Start</th>
						<th className={styles.columnHeader}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{displayed.map((task, idx) => {
						const rowID = getRowID(task, idx);
						return (
							<TaskManagerRow
								key={rowID}
								task={task}
								now={now}
								store={store}
								isSelected={selectedRowIDs.has(rowID)}
								onSelectMouseDown={() => onRowSelectMouseDown(rowID)}
								onSelectMouseEnter={() => onRowSelectMouseEnter(rowID)}
								onOpenTiming={() => setTimingTask(task)}
								onRequestDelete={() => setTaskPendingDeletion(task)}
							/>
						);
					})}
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

			<ConfirmModal
				headingText="Delete task?"
				descriptionText={`"${taskPendingDeletion?.getDescription() ?? ''}" will be permanently deleted. This cannot be undone.`}
				confirmButtonLabel="Delete"
				isOpen={taskPendingDeletion !== null}
				onClose={() => setTaskPendingDeletion(null)}
				onConfirm={confirmDeletePendingTask}
			/>

			<ConfirmModal
				headingText={selectedTasks.length === 1 ? 'Delete task?' : 'Delete tasks?'}
				descriptionText={
					selectedTasks.length === 1
						? `"${selectedTasks[0].getDescription()}" will be permanently deleted. This cannot be undone.`
						: `${selectedTasks.length} selected tasks will be permanently deleted. This cannot be undone.`
				}
				confirmButtonLabel="Delete"
				isOpen={isDeleteSelectedConfirmOpen}
				onClose={() => setIsDeleteSelectedConfirmOpen(false)}
				onConfirm={confirmDeleteSelectedTasks}
			/>
		</div>
	);
}

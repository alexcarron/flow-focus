import { useEffect, useState } from 'react';
import { useTasksStore, selectTasksInPriorityOrder } from '../stores/tasksStore';
import Task from '../model/task/Task';
import FilterDropdown from '../components/FilterDropdown';
import TextInput from '../components/inputs/TextInput';
import SelectionCheckbox from '../components/SelectionCheckbox';
import TaskManagerRow, { TaskManagerRowActions, HidableColumnKey } from '../components/TaskManagerRow';
import TimingOptionsPopup from '../components/TimingOptionsPopup';
import ConfirmModal from '../components/ConfirmModal';
import CheckIcon from '../components/svg-icons/CheckIcon';
import MandatoryIcon from '../components/svg-icons/MandatoryIcon';
import SortAscIcon from '../components/svg-icons/SortAscIcon';
import SortDescIcon from '../components/svg-icons/SortDescIcon';
import SortUnsortedIcon from '../components/svg-icons/SortUnsortedIcon';
import { useRowSelectionDrag } from '../hooks/useRowSelectionDrag';
import { useOverflowAwareTableColumns } from '../hooks/useOverflowAwareTableColumns';
import { mergeRefs } from '../utilities/mergeRefs';
import styles from './TasksManagerPage.module.css';

enum Filter { Active, MustStartToday, Recurring, All, Uncompleted }
enum SortBy { Priority, Name, Steps, TimeAvailable, Duration, RepeatInterval, StartTime, Deadline }
enum SortDir { Asc, Desc }

const HIDE_COLUMN_PRIORITY_ORDER: readonly HidableColumnKey[] = ['repeat', 'start', 'deadline', 'duration'];

const FILTER_OPTIONS: { value: Filter; label: string; description: string }[] = [
	{
		value: Filter.All,
		label: 'All Tasks',
		description: 'Every task',
	},
	{
		value: Filter.Uncompleted,
		label: 'Unfinished Tasks',
		description: 'Every task that has not been completed',
	},
	{
		value: Filter.Active,
		label: 'Active Tasks',
		description: 'Tasks that have started, haven\'t ended, are not completed, and have a deadline',
	},
	{
		value: Filter.MustStartToday,
		label: 'Today\'s Tasks',
		description: 'Active tasks that need to be started today to still meet their deadline',
	},
	{
		value: Filter.Recurring,
		label: 'Recurring Tasks',
		description: 'Tasks that repeat on a schedule',
	},
];

const SORT_LABELS: Record<Exclude<SortBy, SortBy.Deadline | SortBy.Priority | SortBy.StartTime>, string> = {
	[SortBy.Name]: 'Name',
	[SortBy.Steps]: 'Steps',
	[SortBy.TimeAvailable]: 'Time Available',
	[SortBy.Duration]: 'Duration',
	[SortBy.RepeatInterval]: 'Repeat',
};

function applySearch(tasks: Task[], searchText: string): Task[] {
	const normalizedSearchText = searchText.trim().toLowerCase();
	if (normalizedSearchText === '') return tasks;
	return tasks.filter(t => t.getDescription().toLowerCase().includes(normalizedSearchText));
}

function applyFilter(tasks: Task[], filter: Filter): Task[] {
	const now = new Date();

	switch (filter) {
		case Filter.All:
			return tasks;

		case Filter.Uncompleted:
			return tasks.filter(task => !task.getIsComplete())
			
		case Filter.Active:
			return tasks.filter(task => task.isActive(now) && task.getDeadline() !== null);
			
		case Filter.MustStartToday:
			return tasks.filter(task => task.mustStartToday(now));
	
		case Filter.Recurring:
			return tasks.filter(task => task.isRecurring());
			
		default:
			throw new Error(`Task manager filter does not handle filter of type: ${filter}`);
	}
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
	else if (sortBy === SortBy.StartTime)
		sorted.sort((a, b) => {
			const startTimeA = a.getStartTime();
			const startTimeB = b.getStartTime();
			if (startTimeA === null) return 1;
			if (startTimeB === null) return -1;
			return startTimeA.getTime() - startTimeB.getTime();
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

function getRowID(task: Task): string {
	return task.id;
}

export default function TasksManagerPage() {
	const tasks = useTasksStore(selectTasksInPriorityOrder);
	const setSteps = useTasksStore(s => s.setSteps);
	const setDescription = useTasksStore(s => s.setDescription);
	const setStepComplete = useTasksStore(s => s.setStepComplete);
	const completeStepAndPrecedingSteps = useTasksStore(s => s.completeStepAndPrecedingSteps);
	const uncompleteStepAndFollowingSteps = useTasksStore(s => s.uncompleteStepAndFollowingSteps);
	const moveStepUp = useTasksStore(s => s.moveStepUp);
	const moveStepDown = useTasksStore(s => s.moveStepDown);
	const reorderSteps = useTasksStore(s => s.reorderSteps);
	const insertStepBeforeStep = useTasksStore(s => s.insertStepBeforeStep);
	const insertStepAfterStep = useTasksStore(s => s.insertStepAfterStep);
	const setComplete = useTasksStore(s => s.setComplete);
	const setMandatory = useTasksStore(s => s.setMandatory);
	const deleteTask = useTasksStore(s => s.deleteTask);
	const refreshTasks = useTasksStore(s => s.refreshTasks);
	const persistChangedTasks = useTasksStore(s => s.persistChangedTasks);
	const store: TaskManagerRowActions = { setDescription, setSteps, setStepComplete, completeStepAndPrecedingSteps, uncompleteStepAndFollowingSteps, moveStepUp, moveStepDown, reorderSteps, insertStepBeforeStep, insertStepAfterStep, setComplete, setMandatory, deleteTask, refreshTasks, persistChangedTasks };

	const [filter, setFilter] = useState<Filter>(Filter.All);
	const [searchText, setSearchText] = useState('');
	const [sortBy, setSortBy] = useState<SortBy>(SortBy.Priority);
	const [sortDir, setSortDir] = useState<SortDir>(SortDir.Asc);
	const [timingTask, setTimingTask] = useState<Task | null>(null);
	const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);
	const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
	const [selectedRowIDs, setSelectedRowIDs] = useState<Set<string>>(new Set());

	const now = new Date();
	const displayedTasks = applySearch(applyFilter(applySort(tasks, sortBy, sortDir), filter), searchText);

	useEffect(() => {
		setSelectedRowIDs(new Set());
	}, [filter, searchText]);

	function setRowSelected(rowID: string, isSelected: boolean) {
		setSelectedRowIDs(current => {
			const next = new Set(current);
			if (isSelected) next.add(rowID);
			else next.delete(rowID);
			return next;
		});
	}

	const { rowsContainerRef, getRowSelectionDragHandlers } = useRowSelectionDrag<HTMLTableElement>({
		isRowSelected: rowID => selectedRowIDs.has(rowID),
		setRowSelected,
	});

	const { scrollContainerRef, tableRef, hiddenColumnKeys } = useOverflowAwareTableColumns(HIDE_COLUMN_PRIORITY_ORDER);

	function toggleRowSelected(rowID: string) {
		setRowSelected(rowID, !selectedRowIDs.has(rowID));
	}

	function toggleSelectAll() {
		const rowIDs = displayedTasks.map((task) => getRowID(task));
		const areAllSelected = rowIDs.length > 0 && rowIDs.every(id => selectedRowIDs.has(id));
		setSelectedRowIDs(areAllSelected ? new Set() : new Set(rowIDs));
	}

	const selectedTasks = displayedTasks.filter((task) => selectedRowIDs.has(getRowID(task)));

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

	function renderSortIcon(col: SortBy) {
		if (sortBy !== col) return <SortUnsortedIcon className={styles.sortIndicatorIcon} />;

		if (sortDir === SortDir.Asc) return <SortAscIcon className={`${styles.sortIndicatorIcon} ${styles.sortIndicatorIconActive}`} />;

		return <SortDescIcon className={`${styles.sortIndicatorIcon} ${styles.sortIndicatorIconActive}`} />;
	}

	const rowIDs = displayedTasks.map((task) => getRowID(task));
	const areAllDisplayedSelected = rowIDs.length > 0 && rowIDs.every(id => selectedRowIDs.has(id));

	return (
		<div className={styles.page}>
			<div className={styles.toolbar}>
				<FilterDropdown value={filter} options={FILTER_OPTIONS} onChange={setFilter} />

				<TextInput
					value={searchText}
					onChange={setSearchText}
					placeholder="Search tasks..."
					className={`field ${styles.searchInput}`}
				/>

				{selectedRowIDs.size > 0 && (
					<button
						onClick={requestDeleteSelectedTasks}
						className={`button danger ${styles.deleteSelectedButton}`}
					>
						Delete {selectedRowIDs.size} Selected
					</button>
				)}
			</div>

			<div ref={scrollContainerRef} className={styles.tableScrollContainer}>
				<table ref={mergeRefs(rowsContainerRef, tableRef)} className={styles.table}>
					<thead>
						<tr className={styles.headerRow}>
							<th className={`${styles.columnHeader} ${styles.iconColumn} ${styles.selectionColumnHeader}`}>
								<SelectionCheckbox isSelected={areAllDisplayedSelected} onMouseDown={toggleSelectAll} onToggle={toggleSelectAll} />
							</th>
							<th className={`${styles.columnHeader} ${styles.iconColumn}`} title="Done">
								<CheckIcon className={styles.columnHeaderIcon} />
								<span className={styles.srOnly}>Done</span>
							</th>
							<th className={`${styles.columnHeader} ${styles.iconColumn}`} title="Mandatory">
								<MandatoryIcon className={styles.columnHeaderIcon} />
								<span className={styles.srOnly}>Mandatory</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}`}
								onClick={() => toggleSort(SortBy.Name)}
							>
								{SORT_LABELS[SortBy.Name]} <span className={styles.sortIndicator}>{renderSortIcon(SortBy.Name)}</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}`}
								onClick={() => toggleSort(SortBy.Steps)}
							>
								{SORT_LABELS[SortBy.Steps]} <span className={styles.sortIndicator}>{renderSortIcon(SortBy.Steps)}</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}`}
								onClick={() => toggleSort(SortBy.TimeAvailable)}
							>
								{SORT_LABELS[SortBy.TimeAvailable]} <span className={styles.sortIndicator}>{renderSortIcon(SortBy.TimeAvailable)}</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}${hiddenColumnKeys.has('duration') ? ` ${styles.hiddenColumn}` : ''}`}
								onClick={() => toggleSort(SortBy.Duration)}
							>
								{SORT_LABELS[SortBy.Duration]} <span className={styles.sortIndicator}>{renderSortIcon(SortBy.Duration)}</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}${hiddenColumnKeys.has('start') ? ` ${styles.hiddenColumn}` : ''}`}
								onClick={() => toggleSort(SortBy.StartTime)}
							>
								Start <span className={styles.sortIndicator}>{renderSortIcon(SortBy.StartTime)}</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}${hiddenColumnKeys.has('repeat') ? ` ${styles.hiddenColumn}` : ''}`}
								onClick={() => toggleSort(SortBy.RepeatInterval)}
							>
								{SORT_LABELS[SortBy.RepeatInterval]} <span className={styles.sortIndicator}>{renderSortIcon(SortBy.RepeatInterval)}</span>
							</th>
							<th
								className={`${styles.columnHeader} ${styles.sortableHeader}${hiddenColumnKeys.has('deadline') ? ` ${styles.hiddenColumn}` : ''}`}
								onClick={() => toggleSort(SortBy.Deadline)}
							>
								Deadline <span className={styles.sortIndicator}>{renderSortIcon(SortBy.Deadline)}</span>
							</th>
							<th className={styles.columnHeader}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{displayedTasks.map((task) => {
							const rowID = getRowID(task);
							return (
								<TaskManagerRow
									key={rowID}
									rowID={rowID}
									task={task}
									now={now}
									store={store}
									isSelected={selectedRowIDs.has(rowID)}
									selectionDragHandlers={getRowSelectionDragHandlers(rowID)}
									hiddenColumnKeys={hiddenColumnKeys}
									onToggleSelected={() => toggleRowSelected(rowID)}
									onOpenTiming={() => setTimingTask(task)}
									onRequestDelete={() => setTaskPendingDeletion(task)}
								/>
							);
						})}
					</tbody>
				</table>
			</div>

			{displayedTasks.length === 0 && (
				<p className={styles.emptyMessage}>No tasks match the current filter or search</p>
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

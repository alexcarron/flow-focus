import Task from '../model/task/Task';
import Duration from '../model/time-management/Duration';
import { formatDate, formatTime } from '../utils/formatters';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import TextInput from './inputs/TextInput';
import CheckboxInput from './inputs/CheckboxInput';
import ArrayInput from './inputs/ArrayInput';
import SelectionCheckbox from './SelectionCheckbox';
import StepCheckbox from './StepCheckbox';
import DeleteIcon from './svg-icons/DeleteIcon';
import TimingIcon from './svg-icons/TimingIcon';
import checkboxInputStyles from './inputs/CheckboxInput.module.css';
import styles from './TaskManagerRow.module.css';

function toDurationString(ms: number): string {
	const duration = Duration.fromMilliseconds(ms);
	const amount = duration.getAmountOfUnits();
	const unit = duration.getTimeUnit().name;
	return amount === 1 ? unit.slice(0, -1) : `${amount} ${unit}`;
}

function getDurationRange(minMs: number | null, maxMs: number | null): string {
	if (minMs === null && maxMs === null) return '—';
	const start = Duration.fromMilliseconds(minMs ?? 0);
	const end = Duration.fromMilliseconds(maxMs ?? 0);
	const [startLabel, endLabel] = Duration.getDurationRangeStrings(start, end);
	return endLabel ? `${startLabel}–${endLabel}` : startLabel;
}

export interface TaskManagerRowActions {
	setDescription: (task: Task, description: string) => void;
	setSteps: (task: Task, steps: string[]) => void;
	setStepComplete: (task: Task, step: string, isComplete: boolean) => void;
	completeStepAndPrecedingSteps: (task: Task, step: string) => void;
	uncompleteStepAndFollowingSteps: (task: Task, step: string) => void;
	setComplete: (task: Task, isComplete: boolean) => void;
	setMandatory: (task: Task, isMandatory: boolean) => void;
	deleteTask: (task: Task) => Promise<void>;
	refreshTasks: () => void;
	persistChangedTasks: (tasks: Task[]) => Promise<void>;
}

interface Props {
	task: Task;
	now: Date;
	store: TaskManagerRowActions;
	isSelected: boolean;
	onSelectMouseDown: () => void;
	onSelectMouseEnter: () => void;
	onOpenTiming: () => void;
	onRequestDelete: () => void;
}

export default function TaskManagerRow({ task, now, store, isSelected, onSelectMouseDown, onSelectMouseEnter, onOpenTiming, onRequestDelete }: Props) {
	const steps = task.getSteps();
	const minMs = task.getMinRequiredTime() ?? null;
	const maxMs = task.hasMaxRequiredTime() ? task.getMaxRequiredTime(now) : null;
	const startTime = task.getStartTime();
	const displayStartTime = startTime && startTime > now ? startTime : null;

	const { stepsContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag<HTMLTableCellElement>({
		isStepChecked: step => task.isStepComplete(step),
		setStepChecked: (step, isChecked) => store.setStepComplete(task, step, isChecked),
	});

	function onStepToggle(step: string, isChecked: boolean, isShiftClick: boolean) {
		if (isShiftClick) {
			if (isChecked) store.completeStepAndPrecedingSteps(task, step);
			else store.uncompleteStepAndFollowingSteps(task, step);
		}
		else {
			store.setStepComplete(task, step, isChecked);
		}
	}

	function onStepReorderKeyDown(step: string, e: React.KeyboardEvent) {
		if (!step) return;

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
		<tr className={isSelected ? `${styles.row} ${styles.rowSelected}` : styles.row}>
			<td className={styles.selectionCell}>
				<SelectionCheckbox
					isSelected={isSelected}
					onMouseDown={onSelectMouseDown}
					onMouseEnter={onSelectMouseEnter}
				/>
			</td>

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

			<td ref={stepsContainerRef} className={styles.stepsCell}>
				<ArrayInput
					value={steps}
					onChange={newSteps => store.setSteps(task, newSteps)}
					onItemKeyDown={(_, step, e) => onStepReorderKeyDown(step, e)}
					renderRowPrefix={(_, step) => {
						const isCompleted = task.isStepComplete(step);
						return (
							<StepCheckbox
								step={step}
								isChecked={isCompleted}
								onToggle={onStepToggle}
								dragHandlers={getCheckboxDragHandlers(step)}
								className={isCompleted ? `${checkboxInputStyles.box} ${checkboxInputStyles.boxChecked}` : checkboxInputStyles.box}
								checkmarkClassName={checkboxInputStyles.checkmark}
							/>
						);
					}}
					placeholder="Add a step…"
					className={styles.stepsArrayInput}
				/>
			</td>

			<td className={styles.cell}>
				{task.getDeadline()
					? formatTime(task.getTimeToComplete(now))
					: '∞'}
			</td>

			<td className={styles.cell}>
				{minMs !== null || maxMs !== null
					? getDurationRange(minMs, maxMs)
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
						className={`button icon ${styles.rowActionButton}`}
						aria-label="Timing options"
						title="Timing options"
					>
						<TimingIcon className={styles.rowActionIcon} />
					</button>
					<button
						onClick={onRequestDelete}
						className={`button icon danger ${styles.rowActionButton}`}
						aria-label="Delete task"
						title="Delete task"
					>
						<DeleteIcon className={styles.rowActionIcon} />
					</button>
				</div>
			</td>
		</tr>
	);
}

import { useState } from 'react';
import Task from '../model/task/Task';
import Duration from '../model/time-management/Duration';
import { formatDate, formatTime } from '../utils/formatters';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import { useStepReorderDrag, getDraggingRowOverlayStyle } from '../hooks/useStepReorderDrag';
import { mergeRefs } from '../utils/mergeRefs';
import { SHORTCUTS, matchesShortcut, getShortcutKeyParts } from '../config/shortcuts';
import TextInput from './inputs/TextInput';
import CheckboxInput from './inputs/CheckboxInput';
import ArrayInput from './inputs/ArrayInput';
import SelectionCheckbox from './SelectionCheckbox';
import StepCheckbox from './StepCheckbox';
import ContextMenu from './context-menu/ContextMenu';
import DeleteIcon from './svg-icons/DeleteIcon';
import TimingIcon from './svg-icons/TimingIcon';
import checkboxInputStyles from './inputs/CheckboxInput.module.css';
import arrayInputStyles from './inputs/ArrayInput.module.css';
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
	moveStepUp: (task: Task, step: string) => void;
	moveStepDown: (task: Task, step: string) => void;
	insertStepBeforeStep: (task: Task, step: string) => void;
	insertStepAfterStep: (task: Task, step: string) => void;
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

	const [stepContextMenu, setStepContextMenu] = useState<{ step: string; x: number; y: number } | null>(null);

	const { stepsContainerRef: checkboxDragContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag<HTMLTableCellElement>({
		isStepChecked: step => task.isStepComplete(step),
		setStepChecked: (step, isChecked) => store.setStepComplete(task, step, isChecked),
	});

	const { stepsContainerRef: reorderDragContainerRef, getRowDragHandlers, registerRowElement, draggingStep, displaySteps, dragOffsetY, draggingRowRect } = useStepReorderDrag<HTMLTableCellElement>({
		steps,
		onReorder: newSteps => store.setSteps(task, newSteps),
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

	function onStepInsertKeyDown(step: string, e: React.KeyboardEvent) {
		if (!step) return;

		if (e.altKey && e.key === 'ArrowLeft') {
			e.preventDefault();
			store.insertStepBeforeStep(task, step);
		} else if (e.altKey && e.key === 'ArrowRight') {
			e.preventDefault();
			store.insertStepAfterStep(task, step);
		}
	}

	function onStepReorderKeyDown(step: string, e: React.KeyboardEvent) {
		if (matchesShortcut(e, SHORTCUTS.stepReorder.moveUp)) {
			e.preventDefault();
			store.moveStepUp(task, step);
		} else if (matchesShortcut(e, SHORTCUTS.stepReorder.moveDown)) {
			e.preventDefault();
			store.moveStepDown(task, step);
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

			<td ref={mergeRefs(checkboxDragContainerRef, reorderDragContainerRef)} className={styles.stepsCell}>
				<ArrayInput
					value={displaySteps}
					onChange={newSteps => store.setSteps(task, newSteps)}
					onItemKeyDown={(_, step, e) => {
						onStepInsertKeyDown(step, e);
						onStepReorderKeyDown(step, e);
					}}
					getRowProps={(_, step) => ({
						'data-step-row': step,
						ref: rowElement => registerRowElement(step, rowElement),
						className: step === draggingStep ? styles.stepRowPlaceholder : undefined,
						onMouseDown: getRowDragHandlers(step).onMouseDown,
					})}
					onRowContextMenu={(_, step, event) => {
						event.preventDefault();
						setStepContextMenu({ step, x: event.clientX, y: event.clientY });
					}}
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
				{draggingStep !== null && draggingRowRect !== null && (() => {
					const isCompleted = task.isStepComplete(draggingStep);
					return (
						<div
							className={`${arrayInputStyles.row} ${styles.stepRowElevated}`}
							style={getDraggingRowOverlayStyle(draggingRowRect, dragOffsetY)}
						>
							<StepCheckbox
								step={draggingStep}
								isChecked={isCompleted}
								onToggle={() => {}}
								dragHandlers={{ onMouseDown: () => {}, onMouseEnter: () => {} }}
								className={isCompleted ? `${checkboxInputStyles.box} ${checkboxInputStyles.boxChecked}` : checkboxInputStyles.box}
								checkmarkClassName={checkboxInputStyles.checkmark}
							/>
							<input
								type="text"
								readOnly
								tabIndex={-1}
								value={draggingStep}
								className={`field ${arrayInputStyles.input}`}
							/>
						</div>
					);
				})()}
				<ContextMenu
					position={stepContextMenu !== null ? { x: stepContextMenu.x, y: stepContextMenu.y } : null}
					onClose={() => setStepContextMenu(null)}
					items={stepContextMenu !== null ? [
						{ label: 'Move step up', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveUp), onClick: () => store.moveStepUp(task, stepContextMenu.step) },
						{ label: 'Move step down', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveDown), onClick: () => store.moveStepDown(task, stepContextMenu.step) },
					] : []}
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

import { useRef, useState } from 'react';
import Task from '../model/task/Task';
import Duration from '../model/time-management/Duration';
import { formatTime, formatAbbreviatedDurationRange } from '../utilities/timeFormatters';
import { formatDate } from '../utilities/dateFormatting';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import { useStepReorderDrag, getDraggingRowOverlayStyle } from '../hooks/useStepReorderDrag';
import { mergeRefs } from '../utilities/mergeRefs';
import { SHORTCUTS, matchesShortcut, matchesShortcutIgnoringShift, getShortcutKeyParts } from '../config/shortcuts';
import TextInput from './inputs/TextInput';
import CheckboxInput from './inputs/CheckboxInput';
import ArrayInput, { ArrayInputHandle } from './inputs/ArrayInput';
import SelectionCheckbox from './SelectionCheckbox';
import StepCheckbox from './StepCheckbox';
import ContextMenu from './context-menu/ContextMenu';
import DeleteIcon from './svg-icons/DeleteIcon';
import TimingIcon from './svg-icons/TimingIcon';
import checkboxInputStyles from './inputs/CheckboxInput.module.css';
import arrayInputStyles from './inputs/ArrayInput.module.css';
import styles from './TaskManagerRow.module.css';

export type HidableColumnKey = 'repeat' | 'start' | 'duration' | 'deadline';

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
	setSteps: (task: Task, stepTexts: string[]) => void;
	setStepComplete: (task: Task, stepID: string, isComplete: boolean) => void;
	completeStepAndPrecedingSteps: (task: Task, stepID: string) => void;
	uncompleteStepAndFollowingSteps: (task: Task, stepID: string) => void;
	moveStepUp: (task: Task, stepID: string) => void;
	moveStepDown: (task: Task, stepID: string) => void;
	reorderSteps: (task: Task, newStepIDOrder: string[]) => void;
	insertStepBeforeStep: (task: Task, stepID: string) => string;
	insertStepAfterStep: (task: Task, stepID: string) => string;
	setComplete: (task: Task, isComplete: boolean) => void;
	setMandatory: (task: Task, isMandatory: boolean) => void;
	deleteTask: (task: Task) => Promise<void>;
	refreshTasks: () => void;
	persistChangedTasks: (tasks: Task[]) => Promise<void>;
}

interface RowSelectionDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: (event: React.MouseEvent) => void;
}

interface Props {
	rowID: string;
	task: Task;
	now: Date;
	store: TaskManagerRowActions;
	isSelected: boolean;
	selectionDragHandlers: RowSelectionDragHandlers;
	hiddenColumnKeys: Set<HidableColumnKey>;
	onToggleSelected: () => void;
	onOpenTiming: () => void;
	onRequestDelete: () => void;
}

export default function TaskManagerRow({ rowID, task, now, store, isSelected, selectionDragHandlers, hiddenColumnKeys, onToggleSelected, onOpenTiming, onRequestDelete }: Props) {
	const steps = task.getSteps();
	const isCompactRow = steps.length === 0;
	const minMs = task.getMinRequiredTime() ?? null;
	const maxMs = task.hasMaxRequiredTime() ? task.getMaxRequiredTime(now) : null;
	const startTime = task.getStartTime();
	const displayStartTime = startTime && startTime > now ? startTime : null;

	const [stepContextMenu, setStepContextMenu] = useState<{ stepID: string; index: number; x: number; y: number } | null>(null);
	const arrayInputRef = useRef<ArrayInputHandle>(null);

	const { stepsContainerRef: checkboxDragContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag<HTMLTableCellElement>({
		isStepChecked: stepID => task.isStepComplete(stepID),
		setStepChecked: (stepID, isChecked) => store.setStepComplete(task, stepID, isChecked),
	});

	const { stepsContainerRef: reorderDragContainerRef, getRowDragHandlers, registerRowElement, draggingStepID, displaySteps, dragOffsetY, draggingRowRect } = useStepReorderDrag<HTMLTableCellElement>({
		steps,
		onReorder: newStepIDOrder => store.reorderSteps(task, newStepIDOrder),
	});

	function onStepToggle(stepID: string, isChecked: boolean, isShiftClick: boolean) {
		if (isShiftClick) {
			if (isChecked) store.completeStepAndPrecedingSteps(task, stepID);
			else store.uncompleteStepAndFollowingSteps(task, stepID);
		}
		else {
			store.setStepComplete(task, stepID, isChecked);
		}
	}

	function onStepInsertKeyDown(index: number, e: React.KeyboardEvent) {
		const step = displaySteps[index];
		if (!step) return;

		if (matchesShortcutIgnoringShift(e, SHORTCUTS.stepInsert.insertBefore)) {
			e.preventDefault();
			store.insertStepBeforeStep(task, step.id);
			arrayInputRef.current?.focusRow(index);
		}
	}

	function onStepReorderKeyDown(index: number, e: React.KeyboardEvent) {
		const step = displaySteps[index];
		if (!step) return;

		if (matchesShortcut(e, SHORTCUTS.stepReorder.moveUp)) {
			if (index === 0) return;
			e.preventDefault();
			const cursorPosition = (e.target as HTMLInputElement).selectionStart ?? undefined;
			store.moveStepUp(task, step.id);
			arrayInputRef.current?.focusRowAtPosition(index - 1, cursorPosition);
		} else if (matchesShortcut(e, SHORTCUTS.stepReorder.moveDown)) {
			if (index === displaySteps.length - 1) return;
			e.preventDefault();
			const cursorPosition = (e.target as HTMLInputElement).selectionStart ?? undefined;
			store.moveStepDown(task, step.id);
			arrayInputRef.current?.focusRowAtPosition(index + 1, cursorPosition);
		}
	}

	return (
		<tr className={isSelected ? `${styles.row} ${styles.rowSelected}` : styles.row}>
			<td className={`${styles.selectionCell} ${styles.iconColumn}`}>
				<SelectionCheckbox
					isSelected={isSelected}
					rowID={rowID}
					onMouseDown={selectionDragHandlers.onMouseDown}
					onMouseEnter={selectionDragHandlers.onMouseEnter}
					onToggle={onToggleSelected}
				/>
			</td>

			<td className={`${styles.checkboxCell} ${styles.iconColumn}`}>
				<CheckboxInput
					value={task.getIsComplete()}
					onChange={v => store.setComplete(task, v)}
				/>
			</td>

			<td className={`${styles.checkboxCell} ${styles.iconColumn}`}>
				<CheckboxInput
					value={task.getIsMandatory()}
					onChange={v => store.setMandatory(task, v)}
				/>
			</td>

			<td className={styles.descriptionCell}>
				<TextInput
					value={task.getDescription()}
					onChange={v => store.setDescription(task, v)}
					className={styles.descriptionInput}
				/>
			</td>

			<td ref={mergeRefs(checkboxDragContainerRef, reorderDragContainerRef)} className={isCompactRow ? `${styles.stepsCell} ${styles.stepsCellCompact}` : styles.stepsCell}>
				<ArrayInput
					ref={arrayInputRef}
					value={displaySteps.map(step => step.text)}
					onChange={newStepTexts => store.setSteps(task, newStepTexts)}
					onItemKeyDown={(index, _, e) => {
						onStepInsertKeyDown(index, e);
						onStepReorderKeyDown(index, e);
					}}
					getRowProps={index => {
						const step = displaySteps[index];
						return {
							'data-step-row': step.id,
							ref: rowElement => registerRowElement(step.id, rowElement),
							className: step.id === draggingStepID ? styles.stepRowPlaceholder : undefined,
							onMouseDown: getRowDragHandlers(step.id).onMouseDown,
						};
					}}
					onRowContextMenu={(index, _, event) => {
						const step = displaySteps[index];
						event.preventDefault();
						setStepContextMenu({ stepID: step.id, index, x: event.clientX, y: event.clientY });
					}}
					renderRowPrefix={index => {
						const step = displaySteps[index];
						const isCompleted = task.isStepComplete(step.id);
						return (
							<StepCheckbox
								stepID={step.id}
								isChecked={isCompleted}
								onToggle={onStepToggle}
								dragHandlers={getCheckboxDragHandlers(step.id)}
								className={isCompleted ? `${checkboxInputStyles.box} ${checkboxInputStyles.boxChecked}` : checkboxInputStyles.box}
								checkmarkClassName={checkboxInputStyles.checkmark}
							/>
						);
					}}
					placeholder="Add a step…"
					className={styles.stepsArrayInput}
				/>
				{draggingStepID !== null && draggingRowRect !== null && (() => {
					const draggingStep = displaySteps.find(step => step.id === draggingStepID);
					if (!draggingStep) return null;
					const isCompleted = task.isStepComplete(draggingStep.id);
					return (
						<div
							className={`${arrayInputStyles.row} ${styles.stepRowElevated}`}
							style={getDraggingRowOverlayStyle(draggingRowRect, dragOffsetY)}
						>
							<StepCheckbox
								stepID={draggingStep.id}
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
								value={draggingStep.text}
								className={`field ${arrayInputStyles.input}`}
							/>
						</div>
					);
				})()}
				<ContextMenu
					position={stepContextMenu !== null ? { x: stepContextMenu.x, y: stepContextMenu.y } : null}
					onClose={() => setStepContextMenu(null)}
					items={stepContextMenu !== null ? [
						{ label: 'Move step up', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveUp), onClick: () => store.moveStepUp(task, stepContextMenu.stepID) },
						{ label: 'Move step down', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveDown), onClick: () => store.moveStepDown(task, stepContextMenu.stepID) },
						{ label: 'Add step above', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertBefore), onClick: () => { store.insertStepBeforeStep(task, stepContextMenu.stepID); arrayInputRef.current?.focusRow(stepContextMenu.index); } },
						{ label: 'Add step below', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertAfter), onClick: () => { store.insertStepAfterStep(task, stepContextMenu.stepID); arrayInputRef.current?.focusRow(stepContextMenu.index + 1); } },
					] : []}
				/>
			</td>

			<td className={styles.cell}>
				{task.getDeadline()
					? formatTime(task.getTimeToComplete(now))
					: '∞'}
			</td>

			<td className={hiddenColumnKeys.has('duration') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{minMs !== null || maxMs !== null
					? (hiddenColumnKeys.size > 0
						? formatAbbreviatedDurationRange(minMs, maxMs)
						: getDurationRange(minMs, maxMs))
					: <span className={styles.emptyValue}>—</span>}
			</td>

			<td className={hiddenColumnKeys.has('start') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{displayStartTime ? formatDate(displayStartTime) : <span className={styles.emptyValue}>—</span>}
			</td>

			<td className={hiddenColumnKeys.has('repeat') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{task.getRepeatInterval() !== null
					? toDurationString(task.getRepeatInterval()!)
					: <span className={styles.emptyValue}>—</span>}
			</td>

			<td className={hiddenColumnKeys.has('deadline') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{task.getDeadline() ? formatDate(task.getDeadline(), '—') : <span className={styles.emptyValue}>—</span>}
			</td>

			<td className={isCompactRow ? `${styles.actionsCell} ${styles.actionsCellCompact}` : styles.actionsCell}>
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

import { useRef, useState } from 'react';
import Task from '../model/task/Task';
import Tag from '../model/tag/Tag';
import Duration from '../model/time-management/Duration';
import { formatRecurrenceDuration } from '../model/task/recurrence/RecurrenceDuration';
import { formatTime, formatAbbreviatedDurationRange } from '../utilities/timeFormatters';
import { formatDate } from '../utilities/dateFormatting';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import { SHORTCUTS, getShortcutKeyParts } from '../utilities/shortcuts';
import StepsTreeEditor, { StepsTreeEditorHandle } from './StepsTreeEditor';
import TextInput from './inputs/TextInput';
import CheckboxInput from './inputs/CheckboxInput';
import SelectionCheckbox from './SelectionCheckbox';
import ContextMenu from './context-menu/ContextMenu';
import TagChip from './TagChip';
import AddTagPopover from './AddTagPopover';
import CloseIcon from './svg-icons/CloseIcon';
import DeleteIcon from './svg-icons/DeleteIcon';
import MandatoryIcon from './svg-icons/MandatoryIcon';
import TimingIcon from './svg-icons/TimingIcon';
import styles from './TaskManagerRow.module.css';

export type HidableColumnKey = 'repeat' | 'start' | 'duration' | 'timeAvailable' | 'deadline';

function getDurationRange(minMs: number | null, maxMs: number | null): string {
	if (minMs === null && maxMs === null) return '—';
	const start = Duration.fromMilliseconds(minMs ?? 0);
	const end = Duration.fromMilliseconds(maxMs ?? 0);
	const [startLabel, endLabel] = Duration.getDurationRangeStrings(start, end);
	return endLabel ? `${startLabel}–${endLabel}` : startLabel;
}

export interface TaskManagerRowActions {
	setDescription: (task: Task, description: string) => void;
	setStepText: (task: Task, stepID: string, newText: string) => void;
	setStepComplete: (task: Task, stepID: string, isComplete: boolean) => void;
	completeStepAndPrecedingSteps: (task: Task, stepID: string) => void;
	uncompleteStepAndFollowingSteps: (task: Task, stepID: string) => void;
	moveStepUp: (task: Task, stepID: string) => void;
	moveStepDown: (task: Task, stepID: string) => void;
	reparentStep: (task: Task, stepID: string, newParentID: string | null, newIndexAmongSiblings: number) => void;
	indentStep: (task: Task, stepID: string) => void;
	unindentStep: (task: Task, stepID: string) => void;
	insertStepBeforeStep: (task: Task, stepID: string) => string;
	insertStepAfterStep: (task: Task, stepID: string) => string;
	addFirstStep: (task: Task) => string;
	deleteStep: (task: Task, stepID: string) => void;
	setComplete: (task: Task, isComplete: boolean) => void;
	setMandatory: (task: Task, isMandatory: boolean) => void;
	cancelSkip: (task: Task) => void;
	deleteTask: (task: Task) => Promise<void>;
	refreshTasks: () => void;
	persistChangedTasks: (tasks: Task[]) => Promise<void>;
	addTagToTask: (task: Task, tagName: string) => Promise<void>;
	removeTagFromTask: (task: Task, tagID: string) => Promise<void>;
	renameTag: (tagID: string, newName: string) => Promise<void>;
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
	tags: Tag[];
	isSelected: boolean;
	selectionDragHandlers: RowSelectionDragHandlers;
	hiddenColumnKeys: Set<HidableColumnKey>;
	onToggleSelected: () => void;
	onOpenTiming: () => void;
	onRequestDelete: () => void;
}

export default function TaskManagerRow({ rowID, task, now, store, tags, isSelected, selectionDragHandlers, hiddenColumnKeys, onToggleSelected, onOpenTiming, onRequestDelete }: Props) {
	const steps = task.getSteps();
	const alreadyAddedTagIDs = task.getTagIDs();
	const alreadyAddedTags = alreadyAddedTagIDs
		.map(tagID => tags.find(tag => tag.id === tagID))
		.filter((tag): tag is Tag => tag !== undefined);
	const minMs = task.getMinRequiredTime() ?? null;
	const maxMs = task.hasMaxRequiredTime() ? task.getMaxRequiredTime(now) : null;
	const startTime = task.getStartTime();
	const displayStartTime = startTime && startTime > now ? startTime : null;
	const endTime = task.getEndTime();
	const skippedUntil = task.getSkippedUntil();
	const isSkipActive = skippedUntil !== null && skippedUntil > now;
	const isCompactRow = steps.length === 0 && alreadyAddedTags.length === 0 && !isSkipActive;

	const [stepContextMenu, setStepContextMenu] = useState<{ stepID: string; x: number; y: number } | null>(null);
	const stepsEditorRef = useRef<StepsTreeEditorHandle>(null);
	const isTouchDevice = useIsTouchDevice();

	function addStepAndFocus(newStepID: string) {
		stepsEditorRef.current?.focusStep(newStepID);
	}

	return (
		<tr className={isSelected ? `${styles.row} ${styles.rowSelected}` : styles.row}>
			<td className={isCompactRow ? `${styles.selectionCell} ${styles.iconColumn} ${styles.iconColumnCompact}` : `${styles.selectionCell} ${styles.iconColumn}`}>
				<SelectionCheckbox
					isSelected={isSelected}
					rowID={rowID}
					onMouseDown={selectionDragHandlers.onMouseDown}
					onMouseEnter={selectionDragHandlers.onMouseEnter}
					onToggle={onToggleSelected}
				/>
			</td>

			<td className={isCompactRow ? `${styles.checkboxCell} ${styles.iconColumn} ${styles.iconColumnCompact}` : `${styles.checkboxCell} ${styles.iconColumn}`}>
				<CheckboxInput
					value={task.getIsComplete()}
					onChange={v => store.setComplete(task, v)}
				/>
			</td>

			<td className={isCompactRow ? `${styles.checkboxCell} ${styles.iconColumn} ${styles.iconColumnCompact}` : `${styles.checkboxCell} ${styles.iconColumn}`}>
				<CheckboxInput
					value={task.getIsMandatory()}
					onChange={v => store.setMandatory(task, v)}
					icon={<MandatoryIcon />}
					accentColor="var(--color-mandatory)"
				/>
			</td>

			<td className={styles.descriptionCell}>
				<div className={styles.nameRow}>
					<TextInput
						value={task.getDescription()}
						onCommit={newDescription => store.setDescription(task, newDescription)}
						className={styles.descriptionInput}
					/>
					{alreadyAddedTags.length === 0 && (
						<span className={styles.hoverRevealTagButton}>
							<AddTagPopover
								existingTags={tags}
								alreadyAddedTagIDs={alreadyAddedTagIDs}
								notYetAddedTagNames={[]}
								onSelectExisting={tagID => store.addTagToTask(task, tags.find(existingTag => existingTag.id === tagID)!.name)}
								onCreateAndAdd={tagName => store.addTagToTask(task, tagName)}
								isCompact
							/>
						</span>
					)}
				</div>
				{isSkipActive && (
					<div className={styles.skippedBadge}>
						Skipped until {formatDate(skippedUntil)}
						<button
							onClick={() => store.cancelSkip(task)}
							className={styles.cancelSkipButton}
							aria-label="Cancel skip"
							title="Cancel skip"
						>
							<CloseIcon className={styles.cancelSkipIcon} />
						</button>
					</div>
				)}
				{alreadyAddedTags.length > 0 && (
					<div className={styles.tagsRow}>
						{alreadyAddedTags.map(tag => (
							<TagChip
								key={tag.id}
								name={tag.name}
								onRename={newName => store.renameTag(tag.id, newName)}
								onRemove={() => store.removeTagFromTask(task, tag.id)}
							/>
						))}
						<span className={styles.hoverRevealTagButton}>
							<AddTagPopover
								existingTags={tags}
								alreadyAddedTagIDs={alreadyAddedTagIDs}
								notYetAddedTagNames={[]}
								onSelectExisting={tagID => store.addTagToTask(task, tags.find(existingTag => existingTag.id === tagID)!.name)}
								onCreateAndAdd={tagName => store.addTagToTask(task, tagName)}
								isCompact
							/>
						</span>
					</div>
				)}
			</td>

			<td data-mobile-label="Steps" className={isCompactRow ? `${styles.stepsCell} ${styles.stepsCellCompact}` : styles.stepsCell}>
				{steps.length > 0 && (
					<StepsTreeEditor
						ref={stepsEditorRef}
						steps={steps}
						isTouchDevice={isTouchDevice}
						showCheckboxes={true}
						hasOverallLeftMargin={false}
						getIsStepCompleted={stepID => task.isStepComplete(stepID)}
						onSetStepCompleted={(stepID, isCompleted) => store.setStepComplete(task, stepID, isCompleted)}
						onCheckUpToHere={(stepID, isChecked) => {
							if (isChecked) store.completeStepAndPrecedingSteps(task, stepID);
							else store.uncompleteStepAndFollowingSteps(task, stepID);
						}}
						onSetStepText={(stepID, text) => store.setStepText(task, stepID, text)}
						onReparentStep={(stepID, newParentID, index) => store.reparentStep(task, stepID, newParentID, index)}
						onIndentStep={stepID => store.indentStep(task, stepID)}
						onUnindentStep={stepID => store.unindentStep(task, stepID)}
						onMoveStepUp={stepID => store.moveStepUp(task, stepID)}
						onMoveStepDown={stepID => store.moveStepDown(task, stepID)}
						onInsertStepBefore={stepID => store.insertStepBeforeStep(task, stepID)}
						onInsertStepAfter={stepID => store.insertStepAfterStep(task, stepID)}
						onRequestDeleteStep={stepID => store.deleteStep(task, stepID)}
						onBackspaceDeleteEmptyStep={stepID => { store.deleteStep(task, stepID); return true; }}
						onStepContextMenu={(stepID, x, y) => setStepContextMenu({ stepID, x, y })}
					/>
				)}
				{steps.length === 0 && (
					<button
						type="button"
						className={`button small ${styles.addStepButton}`}
						onClick={() => addStepAndFocus(store.addFirstStep(task))}
					>
						+ Add step
					</button>
				)}
				<ContextMenu
					position={stepContextMenu !== null ? { x: stepContextMenu.x, y: stepContextMenu.y } : null}
					onClose={() => setStepContextMenu(null)}
					items={stepContextMenu !== null ? [
						{ label: 'Move step up', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveUp), hintGesture: 'Hold & drag', onClick: () => store.moveStepUp(task, stepContextMenu.stepID) },
						{ label: 'Move step down', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveDown), hintGesture: 'Hold & drag', onClick: () => store.moveStepDown(task, stepContextMenu.stepID) },
						{ label: 'Indent', hintKeys: ['Tab'], hintGesture: 'Swipe right', onClick: () => store.indentStep(task, stepContextMenu.stepID) },
						{ label: 'Unindent', hintKeys: ['Shift', 'Tab'], hintGesture: 'Swipe left', onClick: () => store.unindentStep(task, stepContextMenu.stepID) },
						{ label: 'Add step above', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertBefore), onClick: () => addStepAndFocus(store.insertStepBeforeStep(task, stepContextMenu.stepID)) },
						{ label: 'Add step below', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertAfter), onClick: () => addStepAndFocus(store.insertStepAfterStep(task, stepContextMenu.stepID)) },
						{ label: 'Delete', isDanger: true, hintKeys: ['Delete'], onClick: () => store.deleteStep(task, stepContextMenu.stepID) },
					] : []}
				/>
			</td>

			<td data-mobile-label="Time Left to Complete" data-mobile-empty={task.getIsComplete() ? 'true' : 'false'} className={hiddenColumnKeys.has('timeAvailable') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{task.getDeadline()
					? formatTime(task.getTimeToComplete(now))
					: '∞'}
			</td>

			<td data-mobile-label="Duration" data-mobile-empty={minMs === null && maxMs === null ? 'true' : 'false'} className={hiddenColumnKeys.has('duration') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{minMs !== null || maxMs !== null
					? (hiddenColumnKeys.size > 0
						? formatAbbreviatedDurationRange(minMs, maxMs)
						: getDurationRange(minMs, maxMs))
					: <span className={styles.emptyValue}>—</span>}
			</td>

			<td data-mobile-label="Start" data-mobile-empty={displayStartTime ? 'false' : 'true'} className={hiddenColumnKeys.has('start') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{displayStartTime ? formatDate(displayStartTime) : <span className={styles.emptyValue}>—</span>}
			</td>

			<td data-mobile-label="End" data-mobile-empty={endTime ? 'false' : 'true'} className={`${styles.cell} ${styles.endCell}`}>
				{endTime ? formatDate(endTime) : <span className={styles.emptyValue}>—</span>}
			</td>

			<td data-mobile-label="Repeat" data-mobile-empty={task.getRecurrenceDuration() === null ? 'true' : 'false'} className={hiddenColumnKeys.has('repeat') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{task.getRecurrenceDuration() !== null
					? formatRecurrenceDuration(task.getRecurrenceDuration()!)
					: <span className={styles.emptyValue}>—</span>}
			</td>

			<td data-mobile-label="Deadline" data-mobile-empty={task.getDeadline() ? 'false' : 'true'} className={hiddenColumnKeys.has('deadline') ? `${styles.cell} ${styles.hiddenColumn}` : styles.cell}>
				{task.getDeadline() ? formatDate(task.getDeadline(), '—') : <span className={styles.emptyValue}>—</span>}
			</td>

			<td className={isCompactRow ? `${styles.actionsCell} ${styles.actionsCellCompact}` : styles.actionsCell}>
				<div className={styles.rowActions}>
					<button
						onClick={onOpenTiming}
						className={`button icon touch-hit-area ${styles.rowActionButton}`}
						aria-label="Timing options"
						title="Timing options"
					>
						<TimingIcon className={styles.rowActionIcon} />
					</button>
					<button
						onClick={onRequestDelete}
						className={`button icon danger touch-hit-area ${styles.rowActionButton}`}
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

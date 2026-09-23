import { useState, useEffect, useRef } from 'react';
import Task from '../model/task/Task';
import Tag from '../model/tag/Tag';
import { useTasksStore } from '../stores/tasksStore';
import { useTagsStore } from '../stores/tagsStore';
import { useShrinkToFit } from '../hooks/useShrinkToFit';
import { useCommitOnEnter } from '../hooks/useCommitOnEnter';
import { usePlainTextContentEditable } from '../hooks/usePlainTextContentEditable';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import StepsTreeEditor, { StepsTreeEditorHandle } from './StepsTreeEditor';
import { findNodeWithParent } from '../utilities/tree/orderedTree';
import { formatDate } from '../utilities/dateFormatting';
import { SHORTCUTS, matchesShortcut, getShortcutKeyParts } from '../utilities/shortcuts';
import SkipPopup from './SkipPopup';
import TimingOptionsPopup from './TimingOptionsPopup';
import ContextMenu from './context-menu/ContextMenu';
import ConfirmModal from './ConfirmModal';
import TagChip from './TagChip';
import AddTagPopover from './AddTagPopover';
import DeleteIcon from './svg-icons/DeleteIcon';
import TimingIcon from './svg-icons/TimingIcon';
import styles from './TaskCard.module.css';

interface Props {
	task: Task;
}

function getTimeString(ms: number): string {
	const isNegative = ms < 0;
	const abs = Math.abs(ms);

	const timeUnits = [
		{ ms: 52.1775 * 7 * 24 * 3600000, name: 'year' },
		{ ms: 7 * 24 * 3600000, name: 'week' },
		{ ms: 24 * 3600000, name: 'day' },
		{ ms: 3600000, name: 'hour' },
		{ ms: 60000, name: 'minute' },
	];

	for (const unit of timeUnits) {
		if (abs >= unit.ms) {
			const count = Math.floor(abs / unit.ms);
			return `${count} ${unit.name}${count !== 1 ? 's' : ''} ${isNegative ? 'ago' : 'left'}`;
		}
	}

	return '';
}

export default function TaskCard({ task }: Props) {
	const store = useTasksStore();
	const tags = useTagsStore(s => s.tags);
	const renameTag = useTagsStore(s => s.renameTag);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [isSkipOpen, setIsSkipOpen] = useState(false);
	const [isTimingOpen, setIsTimingOpen] = useState(false);
	const [stepContextMenu, setStepContextMenu] = useState<{ stepID: string; x: number; y: number } | null>(null);
	const [cardContextMenu, setCardContextMenu] = useState<{ x: number; y: number } | null>(null);
	const [stepPendingDeletionID, setStepPendingDeletionID] = useState<string | null>(null);
	const [stepIDToFocusAfterDeletion, setStepIDToFocusAfterDeletion] = useState<string | null>(null);
	const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
	const timeRef = useShrinkToFit<HTMLSpanElement>();

	const descRef = useRef<HTMLHeadingElement>(null);
	const stepsEditorRef = useRef<StepsTreeEditorHandle>(null);
	const isTouchDevice = useIsTouchDevice();
	const { onKeyDown: onPlainTextKeyDown, onPaste: onPlainTextPaste } = usePlainTextContentEditable();

	useEffect(() => {
		const id = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	const commitDescriptionOnEnterRef = useCommitOnEnter<HTMLDivElement>({ targetSelector: '[data-task-description]' });

	useEffect(() => {
		const el = descRef.current;
		if (el && el.textContent !== task.getDescription()) {
			el.textContent = task.getDescription();
		}
	}, [task.getDescription()]);

	const deadline = task.getDeadline();
	const startTime = task.getStartTime();
	const timeUntilDeadline = task.getTimeUntilDeadline(currentTime);
	const timeLeftStr = timeUntilDeadline === Number.POSITIVE_INFINITY ? null : getTimeString(timeUntilDeadline);
	const progress = task.getProgress();
	const progressPct = progress * 94 + 3;
	const skippedUntil = task.getSkippedUntil();
	const isSkipActive = skippedUntil !== null && skippedUntil > currentTime;
	const steps = task.getSteps();
	const currentAndAncestorStepIDs = task.getCurrentAndAncestorStepIDs();
	const alreadyAddedTagIDs = task.getTagIDs();
	const alreadyAddedTags = alreadyAddedTagIDs
		.map(tagID => tags.find(tag => tag.id === tagID))
		.filter((tag): tag is Tag => tag !== undefined);

	function onDescriptionBlur(event: React.FocusEvent<HTMLHeadingElement>) {
		const newDesc = event.currentTarget.textContent ?? '';
		if (newDesc !== task.getDescription()) {
			store.setDescription(task, newDesc);
		}
	}

	function onDeleteClick() {
		setIsDeleteTaskConfirmOpen(true);
	}

	function addStepAndFocus(newStepID: string) {
		stepsEditorRef.current?.focusStep(newStepID);
	}

	const stepPendingDeletion = stepPendingDeletionID === null ? null : findNodeWithParent(steps, stepPendingDeletionID)?.node ?? null;

	return (
		<div
			ref={commitDescriptionOnEnterRef}
			className={styles.card}
			onContextMenu={event => {
				if (steps.length === 0) {
					event.preventDefault();
					setCardContextMenu({ x: event.clientX, y: event.clientY });
				}
			}}
			onKeyDown={event => {
				if (steps.length === 0 && matchesShortcut(event, SHORTCUTS.stepInsert.insertFirst)) {
					event.preventDefault();
					addStepAndFocus(store.addFirstStep(task));
				}
			}}
		>
			<div className={styles.progressTrack}>
				<div
					className={styles.progressBar}
					style={{ width: `${progressPct}%` }}
				/>
			</div>

			<div className={styles.heading}>
				<div className={styles.nameRow}>
					<h2
						ref={descRef}
						data-task-description
						contentEditable
						suppressContentEditableWarning
						spellCheck={false}
						onBlur={onDescriptionBlur}
						onPaste={onPlainTextPaste}
						onKeyDown={onPlainTextKeyDown}
						className={styles.description}
					/>
					{alreadyAddedTags.length === 0 && (
						<span className={styles.hoverRevealTagButton}>
							<AddTagPopover
								existingTags={tags}
								alreadyAddedTagIDs={alreadyAddedTagIDs}
								notYetAddedTagNames={[]}
								onSelectExisting={tagID => store.addTagToTask(task, tags.find(existingTag => existingTag.id === tagID)!.name)}
								onCreateAndAdd={tagName => store.addTagToTask(task, tagName)}
							/>
						</span>
					)}
				</div>
				{alreadyAddedTags.length > 0 && (
					<div className={styles.tagsRow}>
						{alreadyAddedTags.map(tag => (
							<TagChip
								key={tag.id}
								name={tag.name}
								onRename={newName => renameTag(tag.id, newName)}
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
							/>
						</span>
					</div>
				)}
			</div>

			{steps.length > 0 && (
				<StepsTreeEditor
					ref={stepsEditorRef}
					steps={steps}
					isTouchDevice={isTouchDevice}
					showCheckboxes={true}
					hasOverallLeftMargin={true}
					getIsStepCompleted={stepID => task.isStepComplete(stepID)}
					currentAndAncestorStepIDs={currentAndAncestorStepIDs}
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
					onRequestDeleteStep={stepID => { setStepPendingDeletionID(stepID); setStepIDToFocusAfterDeletion(null); }}
					onBackspaceDeleteEmptyStep={(stepID, previousStepID) => {
						setStepPendingDeletionID(stepID);
						setStepIDToFocusAfterDeletion(previousStepID);
						return false;
					}}
					onStepContextMenu={(stepID, x, y) => setStepContextMenu({ stepID, x, y })}
				/>
			)}

			<div className={styles.meta}>
				<div className={styles.metaRow}>
					{startTime && startTime > currentTime && (
						<span>Starts {formatDate(startTime)}</span>
					)}
					{deadline && (
						<span>Due {formatDate(deadline)}</span>
					)}
					{timeLeftStr && (
						<span ref={timeRef} className={styles.timeLeft}>
							{timeLeftStr}
						</span>
					)}
				</div>
				{isSkipActive && (
					<span className={styles.skippedIndicator}>
						Skipped until {formatDate(skippedUntil)}
						<button
							onClick={() => store.cancelSkip(task)}
							className={styles.cancelSkipButton}
						>
							Cancel
						</button>
					</span>
				)}
			</div>

			<div className={styles.actions}>
				<button
					onClick={() => setIsSkipOpen(true)}
					className={`button ${styles.actionButton} ${styles.actionGrows}`}
				>
					Skip
				</button>
				<button
					onClick={() => store.completeAllSteps(task)}
					className={`button button--primary ${styles.actionButton} ${styles.actionGrows}`}
				>
					Complete Task
				</button>
				<button
					onClick={() => setIsTimingOpen(true)}
					className={`button icon touch-hit-area ${styles.actionButton} ${styles.actionButtonSquare}`}
					aria-label="Timing options"
					title="Timing options"
				>
					<TimingIcon className={styles.timingIcon} />
				</button>
				<button
					onClick={onDeleteClick}
					className={`button icon danger touch-hit-area ${styles.actionButton} ${styles.actionButtonSquare}`}
					aria-label="Delete task"
					title="Delete task"
				>
					<DeleteIcon className={styles.deleteIcon} />
				</button>
			</div>

			<SkipPopup task={task} isOpen={isSkipOpen} onClose={() => setIsSkipOpen(false)} />
			<TimingOptionsPopup task={task} isOpen={isTimingOpen} onClose={() => setIsTimingOpen(false)} />

			<ContextMenu
				position={stepContextMenu !== null ? { x: stepContextMenu.x, y: stepContextMenu.y } : null}
				onClose={() => setStepContextMenu(null)}
				items={stepContextMenu !== null ? [
					{ label: 'Check all up to here', hintKeys: ['Shift', 'Click'], hintGesture: 'Double tap', onClick: () => store.completeStepAndPrecedingSteps(task, stepContextMenu.stepID) },
					{ label: 'Uncheck all from here', hintKeys: ['Shift', 'Click'], hintGesture: 'Double tap', onClick: () => store.uncompleteStepAndFollowingSteps(task, stepContextMenu.stepID) },
					{ label: 'Add step above', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertBefore), onClick: () => addStepAndFocus(store.insertStepBeforeStep(task, stepContextMenu.stepID)) },
					{ label: 'Add step below', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertAfter), onClick: () => addStepAndFocus(store.insertStepAfterStep(task, stepContextMenu.stepID)) },
					{ label: 'Move step up', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveUp), hintGesture: 'Hold & drag', onClick: () => store.moveStepUp(task, stepContextMenu.stepID) },
					{ label: 'Move step down', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveDown), hintGesture: 'Hold & drag', onClick: () => store.moveStepDown(task, stepContextMenu.stepID) },
					{ label: 'Delete', isDanger: true, hintKeys: ['Delete'], onClick: () => { setStepPendingDeletionID(stepContextMenu.stepID); setStepIDToFocusAfterDeletion(null); } },
				] : []}
			/>

			<ContextMenu
				position={cardContextMenu}
				onClose={() => setCardContextMenu(null)}
				items={[
					{ label: 'Add a step', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertFirst), onClick: () => addStepAndFocus(store.addFirstStep(task)) },
				]}
			/>

			<ConfirmModal
				headingText="Delete step?"
				descriptionText={`"${stepPendingDeletion?.text ?? ''}" will be permanently deleted. This cannot be undone.`}
				confirmButtonLabel="Delete"
				isOpen={stepPendingDeletionID !== null}
				onClose={() => {
					setStepPendingDeletionID(null);
					setStepIDToFocusAfterDeletion(null);
				}}
				onConfirm={() => {
					if (stepPendingDeletionID !== null) {
						store.deleteStep(task, stepPendingDeletionID);
						if (stepIDToFocusAfterDeletion !== null) stepsEditorRef.current?.focusStep(stepIDToFocusAfterDeletion);
					}
					setStepPendingDeletionID(null);
					setStepIDToFocusAfterDeletion(null);
				}}
			/>

			<ConfirmModal
				headingText="Delete task?"
				descriptionText={`"${task.getDescription()}" will be permanently deleted. This cannot be undone.`}
				confirmButtonLabel="Delete"
				isOpen={isDeleteTaskConfirmOpen}
				onClose={() => setIsDeleteTaskConfirmOpen(false)}
				onConfirm={() => {
					store.deleteTask(task);
					setIsDeleteTaskConfirmOpen(false);
				}}
			/>
		</div>
	);
}

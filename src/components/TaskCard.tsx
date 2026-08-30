import { useState, useEffect, useRef } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import { useShrinkToFit } from '../hooks/useShrinkToFit';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import { useStepReorderDrag, getDraggingRowOverlayStyle } from '../hooks/useStepReorderDrag';
import StepCheckbox from './StepCheckbox';
import { formatDate } from '../utils/formatters';
import { mergeRefs } from '../utils/mergeRefs';
import { SHORTCUTS, matchesShortcut, getShortcutKeyParts } from '../config/shortcuts';
import SkipPopup from './SkipPopup';
import TimingOptionsPopup from './TimingOptionsPopup';
import ContextMenu from './context-menu/ContextMenu';
import ConfirmModal from './ConfirmModal';
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

function focusStepTextAtEnd(element: HTMLElement) {
	element.focus();
	const range = document.createRange();
	range.selectNodeContents(element);
	range.collapse(false);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

export default function TaskCard({ task }: Props) {
	const store = useTasksStore();
	const [currentTime, setCurrentTime] = useState(new Date());
	const [isSkipOpen, setIsSkipOpen] = useState(false);
	const [isTimingOpen, setIsTimingOpen] = useState(false);
	const [stepContextMenu, setStepContextMenu] = useState<{ stepID: string; x: number; y: number } | null>(null);
	const [stepPendingFocusID, setStepPendingFocusID] = useState<string | null>(null);
	const [stepPendingDeletionID, setStepPendingDeletionID] = useState<string | null>(null);
	const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
	const timeRef = useShrinkToFit<HTMLSpanElement>();

	const descRef = useRef<HTMLHeadingElement>(null);
	const stepSpanElementsByStepIDRef = useRef<Map<string, HTMLSpanElement>>(new Map());

	const { stepsContainerRef: checkboxDragContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag({
		isStepChecked: stepID => task.isStepComplete(stepID),
		setStepChecked: (stepID, isChecked) => store.setStepComplete(task, stepID, isChecked),
	});

	const { stepsContainerRef: reorderDragContainerRef, getRowDragHandlers, registerRowElement, draggingStepID, displaySteps, dragOffsetY, draggingRowRect } = useStepReorderDrag({
		steps: task.getSteps(),
		onReorder: newStepIDOrder => store.reorderSteps(task, newStepIDOrder),
	});

	useEffect(() => {
		const id = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

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
	const isSkippable = !task.isUrgent(currentTime);
	const nextStep = task.getNextStep();
	const steps = task.getSteps();
	const nextStepIndex = nextStep === null ? -1 : task.getStepIndex(nextStep.id);

	const allStepsKey = steps.map(step => `${step.id}:${step.text}`).join(' ');
	useEffect(() => {
		steps.forEach(step => {
			const stepSpanElement = stepSpanElementsByStepIDRef.current.get(step.id);
			if (stepSpanElement && stepSpanElement.textContent !== step.text) {
				stepSpanElement.textContent = step.text;
			}
		});
	}, [allStepsKey]);

	useEffect(() => {
		if (stepPendingFocusID === null) return;
		const stepSpanElement = stepSpanElementsByStepIDRef.current.get(stepPendingFocusID);
		if (stepSpanElement) {
			focusStepTextAtEnd(stepSpanElement);
			setStepPendingFocusID(null);
		}
	}, [stepPendingFocusID, allStepsKey]);

	function onDescriptionBlur(event: React.FocusEvent<HTMLHeadingElement>) {
		const newDesc = event.currentTarget.textContent ?? '';
		if (newDesc !== task.getDescription()) {
			store.setDescription(task, newDesc);
		}
	}

	function onStepBlur(event: React.FocusEvent<HTMLSpanElement>, stepID: string, currentText: string) {
		const newText = event.currentTarget.textContent ?? '';
		if (newText !== currentText) {
			store.setStepText(task, stepID, newText);
		}
	}

	function onDeleteClick() {
		setIsDeleteTaskConfirmOpen(true);
	}

	function onStepCheckboxChange(stepID: string, isChecked: boolean, isShiftClick: boolean) {
		if (isShiftClick) {
			if (isChecked) {
				store.completeStepAndPrecedingSteps(task, stepID);
			}
			else {
				store.uncompleteStepAndFollowingSteps(task, stepID);
			}
		}
		else {
			store.setStepComplete(task, stepID, isChecked);
		}
	}

	const stepPendingDeletion = stepPendingDeletionID === null ? null : displaySteps.find(step => step.id === stepPendingDeletionID) ?? null;

	return (
		<div className={styles.card}>
			<div className={styles.progressTrack}>
				<div
					className={styles.progressBar}
					style={{ width: `${progressPct}%` }}
				/>
			</div>

			<h2
				ref={descRef}
				contentEditable
				suppressContentEditableWarning
				onBlur={onDescriptionBlur}
				className={styles.description}
			/>

			{task.hasNextStep() && (
				<div ref={mergeRefs(checkboxDragContainerRef, reorderDragContainerRef)} className={draggingStepID !== null ? `${styles.steps} ${styles.stepsDragging}` : styles.steps}>
					{displaySteps.map(step => {
						const isCompleted = task.isStepComplete(step.id);
						const isCurrentStep = step.id === nextStep?.id;
						const isPreviousStep = nextStepIndex !== -1 && task.getStepIndex(step.id) < nextStepIndex;
						const isPlaceholder = step.id === draggingStepID;

						return (
							<div
								key={step.id}
								ref={rowElement => registerRowElement(step.id, rowElement)}
								data-step-row={step.id}
								className={[
									styles.stepRow,
									isCurrentStep ? styles.stepRowCurrent : '',
									isPlaceholder ? styles.stepRowPlaceholder : '',
								].filter(Boolean).join(' ')}
								onMouseDown={getRowDragHandlers(step.id).onMouseDown}
								onClick={event => {
									if ((event.target as HTMLElement).closest('[data-step]')) return;
									const stepSpanElement = stepSpanElementsByStepIDRef.current.get(step.id);
									if (stepSpanElement) focusStepTextAtEnd(stepSpanElement);
								}}
								onContextMenu={event => {
									event.preventDefault();
									setStepContextMenu({ stepID: step.id, x: event.clientX, y: event.clientY });
								}}
							>
								<StepCheckbox
									stepID={step.id}
									isChecked={isCompleted}
									onToggle={onStepCheckboxChange}
									dragHandlers={getCheckboxDragHandlers(step.id)}
									className={isCompleted ? `${styles.stepCheckbox} ${styles.stepCheckboxChecked}` : styles.stepCheckbox}
									checkmarkClassName={styles.stepCheckmark}
								/>

								<span
									ref={stepSpanElement => {
										if (stepSpanElement) stepSpanElementsByStepIDRef.current.set(step.id, stepSpanElement);
										else stepSpanElementsByStepIDRef.current.delete(step.id);
									}}
									contentEditable
									suppressContentEditableWarning
									onBlur={event => onStepBlur(event, step.id, step.text)}
									onKeyDown={event => {
										if (matchesShortcut(event, SHORTCUTS.stepReorder.moveUp)) {
											event.preventDefault();
											store.moveStepUp(task, step.id);
										}
										else if (matchesShortcut(event, SHORTCUTS.stepReorder.moveDown)) {
											event.preventDefault();
											store.moveStepDown(task, step.id);
										}
										else if (matchesShortcut(event, SHORTCUTS.stepNavigate.toPreviousStep)) {
											const previousStep = displaySteps[displaySteps.findIndex(s => s.id === step.id) - 1];
											if (previousStep) {
												event.preventDefault();
												const stepSpanElement = stepSpanElementsByStepIDRef.current.get(previousStep.id);
												if (stepSpanElement) focusStepTextAtEnd(stepSpanElement);
											}
										}
										else if (matchesShortcut(event, SHORTCUTS.stepNavigate.toNextStep)) {
											const followingStep = displaySteps[displaySteps.findIndex(s => s.id === step.id) + 1];
											if (followingStep) {
												event.preventDefault();
												const stepSpanElement = stepSpanElementsByStepIDRef.current.get(followingStep.id);
												if (stepSpanElement) focusStepTextAtEnd(stepSpanElement);
											}
										}
										else if (matchesShortcut(event, SHORTCUTS.stepInsert.insertBefore)) {
											event.preventDefault();
											const typedText = event.currentTarget.textContent ?? '';
											if (typedText !== step.text) store.setStepText(task, step.id, typedText);
											setStepPendingFocusID(store.insertStepBeforeStep(task, step.id));
										}
										else if (matchesShortcut(event, SHORTCUTS.stepInsert.insertAfter)) {
											event.preventDefault();
											const typedText = event.currentTarget.textContent ?? '';
											if (typedText !== step.text) store.setStepText(task, step.id, typedText);
											setStepPendingFocusID(store.insertStepAfterStep(task, step.id));
										}
										else if (event.key === 'Enter') {
											event.preventDefault();
										}
									}}
									className={
										isCurrentStep
											? styles.currentStep
											: isPreviousStep
												? styles.previousStep
												: styles.upcomingStep
									}
								/>
							</div>
						);
					})}

					{draggingStepID !== null && draggingRowRect !== null && (() => {
						const draggingStep = displaySteps.find(step => step.id === draggingStepID);
						if (!draggingStep) return null;
						const isCompleted = task.isStepComplete(draggingStep.id);
						const isCurrentStep = draggingStep.id === nextStep?.id;
						const isPreviousStep = nextStepIndex !== -1 && task.getStepIndex(draggingStep.id) < nextStepIndex;

						return (
							<div
								className={`${styles.stepRow} ${styles.stepRowElevated}`}
								style={getDraggingRowOverlayStyle(draggingRowRect, dragOffsetY)}
							>
								<StepCheckbox
									stepID={draggingStep.id}
									isChecked={isCompleted}
									onToggle={() => {}}
									dragHandlers={{ onMouseDown: () => {}, onMouseEnter: () => {} }}
									className={isCompleted ? `${styles.stepCheckbox} ${styles.stepCheckboxChecked}` : styles.stepCheckbox}
									checkmarkClassName={styles.stepCheckmark}
								/>
								<span
									className={
										isCurrentStep
											? styles.currentStep
											: isPreviousStep
												? styles.previousStep
												: styles.upcomingStep
									}
								>
									{draggingStep.text}
								</span>
							</div>
						);
					})()}
				</div>
			)}

			<div className={styles.meta}>
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

			<div className={styles.actions}>
				{isSkippable && (
					<button
						onClick={() => setIsSkipOpen(true)}
						className={`button ${styles.actionButton} ${styles.actionGrows}`}
					>
						Skip
					</button>
				)}
				<button
					onClick={() => store.completeAllSteps(task)}
					className={`button button--primary ${styles.actionButton} ${styles.actionGrows}`}
				>
					Complete Task
				</button>
				<button
					onClick={() => setIsTimingOpen(true)}
					className={`button icon ${styles.actionButton} ${styles.actionButtonSquare}`}
					aria-label="Timing options"
					title="Timing options"
				>
					<TimingIcon className={styles.timingIcon} />
				</button>
				<button
					onClick={onDeleteClick}
					className={`button icon danger ${styles.actionButton} ${styles.actionButtonSquare}`}
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
					{ label: 'Move step up', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveUp), onClick: () => store.moveStepUp(task, stepContextMenu.stepID) },
					{ label: 'Move step down', hintKeys: getShortcutKeyParts(SHORTCUTS.stepReorder.moveDown), onClick: () => store.moveStepDown(task, stepContextMenu.stepID) },
					{ label: 'Add step above', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertBefore), onClick: () => setStepPendingFocusID(store.insertStepBeforeStep(task, stepContextMenu.stepID)) },
					{ label: 'Add step below', hintKeys: getShortcutKeyParts(SHORTCUTS.stepInsert.insertAfter), onClick: () => setStepPendingFocusID(store.insertStepAfterStep(task, stepContextMenu.stepID)) },
					{ label: 'Check all up to here', hintKeys: ['Shift', 'Click'], onClick: () => store.completeStepAndPrecedingSteps(task, stepContextMenu.stepID) },
					{ label: 'Uncheck all from here', hintKeys: ['Shift', 'Click'], onClick: () => store.uncompleteStepAndFollowingSteps(task, stepContextMenu.stepID) },
					{ label: 'Delete', isDanger: true, onClick: () => setStepPendingDeletionID(stepContextMenu.stepID) },
				] : []}
			/>

			<ConfirmModal
				headingText="Delete step?"
				descriptionText={`"${stepPendingDeletion?.text ?? ''}" will be permanently deleted. This cannot be undone.`}
				confirmButtonLabel="Delete"
				isOpen={stepPendingDeletionID !== null}
				onClose={() => setStepPendingDeletionID(null)}
				onConfirm={() => {
					if (stepPendingDeletionID !== null) {
						store.deleteStep(task, stepPendingDeletionID);
					}
					setStepPendingDeletionID(null);
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

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Step from '../model/task/step/Step';
import { flattenForDisplay, findNodeWithParent } from '../utilities/tree/orderedTree';
import { useNestedListDrag, getDraggingRowOverlayStyle } from '../hooks/useNestedListDrag';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import { useStepSwipeIndent } from '../hooks/useStepSwipeIndent';
import { useCommitOnEnter } from '../hooks/useCommitOnEnter';
import { usePlainTextContentEditable } from '../hooks/usePlainTextContentEditable';
import { SHORTCUTS, matchesAnyShortcut, matchesShortcut, matchesShortcutIgnoringShift } from '../utilities/shortcuts';
import { mergeRefs } from '../utilities/mergeRefs';
import StepCheckbox from './StepCheckbox';
import ContextMenuButton from './context-menu/ContextMenuButton';
import styles from './TaskCard.module.css';

const STEP_INDENT_WIDTH_PX = 24;
const STEP_REORDER_HOLD_DELAY_MS = 200;

function getStepRowPaddingLeft(depth: number, hasOverallLeftMargin: boolean): string {
	if (hasOverallLeftMargin) return `calc(${depth} * var(--space-large) + var(--space-small))`;
	return `calc(${depth} * var(--space-large))`;
}

export interface StepsTreeEditorHandle {
	focusStep: (stepID: string) => void;
}

interface Props {
	steps: Step[];
	isTouchDevice: boolean;
	showCheckboxes: boolean;
	hasOverallLeftMargin: boolean;
	getIsStepCompleted?: (stepID: string) => boolean;
	currentAndAncestorStepIDs?: Set<string>;
	onSetStepCompleted?: (stepID: string, isCompleted: boolean) => void;
	onCheckUpToHere?: (stepID: string, isChecked: boolean) => void;
	onSetStepText: (stepID: string, text: string) => void;
	onReparentStep: (stepID: string, newParentID: string | null, newIndexAmongSiblings: number) => void;
	onIndentStep: (stepID: string) => void;
	onUnindentStep: (stepID: string) => void;
	onMoveStepUp: (stepID: string) => void;
	onMoveStepDown: (stepID: string) => void;
	onInsertStepBefore: (stepID: string) => string;
	onInsertStepAfter: (stepID: string) => string;
	onRequestDeleteStep: (stepID: string) => void;
	onBackspaceDeleteEmptyStep: (stepID: string, previousStepID: string | null) => boolean;
	onStepContextMenu?: (stepID: string, x: number, y: number) => void;
}

type CaretPosition = 'start' | 'end';

interface PendingFocus {
	stepID: string;
	caretPosition: CaretPosition;
}

function focusStepText(element: HTMLElement, caretPosition: CaretPosition) {
	element.focus();
	const range = document.createRange();
	range.selectNodeContents(element);
	range.collapse(caretPosition === 'start');
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

function getSelectionOffsetsWithinElement(element: HTMLElement): { start: number; end: number } | null {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;
	const range = selection.getRangeAt(0);
	if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return null;

	const startRange = range.cloneRange();
	startRange.selectNodeContents(element);
	startRange.setEnd(range.startContainer, range.startOffset);

	const endRange = range.cloneRange();
	endRange.selectNodeContents(element);
	endRange.setEnd(range.endContainer, range.endOffset);

	return { start: startRange.toString().length, end: endRange.toString().length };
}

const StepsTreeEditor = forwardRef<StepsTreeEditorHandle, Props>(function StepsTreeEditor(props, ref) {
	const {
		steps,
		isTouchDevice,
		showCheckboxes,
		hasOverallLeftMargin,
		getIsStepCompleted,
		currentAndAncestorStepIDs,
		onSetStepCompleted,
		onCheckUpToHere,
		onSetStepText,
		onReparentStep,
		onIndentStep,
		onUnindentStep,
		onMoveStepUp,
		onMoveStepDown,
		onInsertStepBefore,
		onInsertStepAfter,
		onRequestDeleteStep,
		onBackspaceDeleteEmptyStep,
		onStepContextMenu,
	} = props;

	const [stepPendingFocus, setStepPendingFocus] = useState<PendingFocus | null>(null);
	const stepSpanElementsByStepIDRef = useRef<Map<string, HTMLSpanElement>>(new Map());
	const { onKeyDown: onPlainTextKeyDown, onPaste: onPlainTextPaste } = usePlainTextContentEditable();

	function commitFocusedStepTextIfChanged() {
		const focusedStepSpanEntry = [...stepSpanElementsByStepIDRef.current.entries()]
			.find(([, stepSpanElement]) => stepSpanElement === document.activeElement);
		if (!focusedStepSpanEntry) return;
		const [focusedStepID, focusedStepSpanElement] = focusedStepSpanEntry;
		const focusedStep = findNodeWithParent(steps, focusedStepID)?.node;
		if (!focusedStep) return;
		const typedText = focusedStepSpanElement.textContent ?? '';
		if (typedText !== focusedStep.text) onSetStepText(focusedStep.id, typedText);
	}

	const { containerRef: reorderDragContainerRef, getRowDragHandlers, registerRowElement, registerPlaceholderElement, draggingItemID: draggingStepID, draggingItemDepth: draggingStepDepth, displayRows, dragOffsetY, draggingRowRect } = useNestedListDrag({
		items: steps,
		rowAttribute: 'data-step-row',
		dragExcludeSelector: '[data-step], button',
		indentWidthPx: STEP_INDENT_WIDTH_PX,
		holdDelayMs: STEP_REORDER_HOLD_DELAY_MS,
		onBeforeHoldStart: commitFocusedStepTextIfChanged,
		onReorder: onReparentStep,
	});

	const { stepsContainerRef: checkboxDragContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag({
		isStepChecked: stepID => getIsStepCompleted?.(stepID) ?? false,
		setStepChecked: (stepID, isChecked) => onSetStepCompleted?.(stepID, isChecked),
		onDoubleTapCheckUpToHere: onCheckUpToHere,
	});

	const { getSwipeHandlers, swipingItemID: swipingStepID, swipeOffsetX } = useStepSwipeIndent({
		isEnabled: isTouchDevice,
		onIndent: stepID => {
			commitFocusedStepTextIfChanged();
			onIndentStep(stepID);
			setStepPendingFocus({ stepID, caretPosition: 'end' });
		},
		onUnindent: stepID => {
			commitFocusedStepTextIfChanged();
			onUnindentStep(stepID);
			setStepPendingFocus({ stepID, caretPosition: 'end' });
		},
	});

	const insertStepOnEnterRef = useCommitOnEnter<HTMLDivElement>({
		targetSelector: '[data-step-row] [contenteditable]',
		onEnter: stepSpanElement => {
			const stepID = stepSpanElement.closest('[data-step-row]')?.getAttribute('data-step-row') ?? null;
			if (stepID === null) return;
			const step = findNodeWithParent(steps, stepID)?.node;
			if (!step) return;

			const fullText = stepSpanElement.textContent ?? '';
			const selectionOffsets = getSelectionOffsetsWithinElement(stepSpanElement);
			const splitStart = selectionOffsets?.start ?? fullText.length;
			const splitEnd = selectionOffsets?.end ?? fullText.length;
			const textBeforeCursor = fullText.slice(0, splitStart);
			const textAfterCursor = fullText.slice(splitEnd);

			if (textBeforeCursor !== step.text) {
				stepSpanElement.textContent = textBeforeCursor;
				onSetStepText(step.id, textBeforeCursor);
			}
			const newStepID = onInsertStepAfter(step.id);
			if (textAfterCursor !== '') onSetStepText(newStepID, textAfterCursor);
			setStepPendingFocus({ stepID: newStepID, caretPosition: 'start' });
		},
	});

	const allStepNodes = flattenForDisplay(steps).map(flattened => flattened.node);
	const allStepsKey = allStepNodes.map(step => `${step.id}:${step.text}`).join(' ');

	function registerStepSpanElementAndSyncText(step: Step, stepSpanElement: HTMLSpanElement | null) {
		if (!stepSpanElement) {
			stepSpanElementsByStepIDRef.current.delete(step.id);
			return;
		}
		stepSpanElementsByStepIDRef.current.set(step.id, stepSpanElement);
		const isBeingEdited = stepSpanElement === document.activeElement;
		if (!isBeingEdited && stepSpanElement.textContent !== step.text) {
			stepSpanElement.textContent = step.text;
		}
	}

	useEffect(() => {
		if (stepPendingFocus === null) return;
		const stepSpanElement = stepSpanElementsByStepIDRef.current.get(stepPendingFocus.stepID);
		if (stepSpanElement) {
			focusStepText(stepSpanElement, stepPendingFocus.caretPosition);
			setStepPendingFocus(null);
		}
	}, [stepPendingFocus, allStepsKey]);

	useImperativeHandle(ref, () => ({
		focusStep: stepID => setStepPendingFocus({ stepID, caretPosition: 'end' }),
	}));

	function onStepCheckboxChange(stepID: string, isChecked: boolean, isShiftClick: boolean) {
		if (isShiftClick) onCheckUpToHere?.(stepID, isChecked);
		else onSetStepCompleted?.(stepID, isChecked);
	}

	return (
		<div
			ref={mergeRefs(checkboxDragContainerRef, reorderDragContainerRef, insertStepOnEnterRef)}
			className={draggingStepID !== null ? `${styles.steps} ${styles.stepsDragging}` : styles.steps}
			onDragStart={event => event.preventDefault()}
		>
			{displayRows.map(row => {
				if (row.kind === 'placeholder') {
					return (
						<div
							key="placeholder"
							ref={registerPlaceholderElement}
							className={hasOverallLeftMargin ? `${styles.stepRow} ${styles.stepRowPlaceholder}` : `${styles.stepRow} ${styles.stepRowPlaceholder} ${styles.stepRowNoOverallLeftMargin}`}
							style={{ paddingLeft: getStepRowPaddingLeft(row.depth, hasOverallLeftMargin), height: row.height || undefined }}
						/>
					);
				}

				const step = row.node;
				const isCompleted = getIsStepCompleted?.(step.id) ?? false;
				const isCurrentStep = currentAndAncestorStepIDs?.has(step.id) ?? false;

				return (
					<div
						key={step.id}
						ref={rowElement => registerRowElement(step.id, rowElement)}
						data-step-row={step.id}
						className={[
							styles.stepRow,
							!hasOverallLeftMargin ? styles.stepRowNoOverallLeftMargin : '',
							isCurrentStep ? styles.stepRowCurrent : '',
							row.isHiddenDuringDrag ? styles.stepRowHiddenDuringDrag : '',
						].filter(Boolean).join(' ')}
						style={{
							paddingLeft: getStepRowPaddingLeft(row.depth, hasOverallLeftMargin),
							transform: swipingStepID === step.id ? `translateX(${swipeOffsetX}px)` : undefined,
							transition: swipingStepID === step.id ? 'none' : 'transform var(--transition-fast)',
						}}
						onMouseDown={getRowDragHandlers(step.id).onMouseDown}
						onTouchStart={getSwipeHandlers(step.id).onTouchStart}
						onClick={event => {
							const clickedElement = event.target as HTMLElement;
							if (clickedElement.closest('[data-step]')) return;
							if (clickedElement.closest('[contenteditable]')) return;
							const stepSpanElement = stepSpanElementsByStepIDRef.current.get(step.id);
							if (stepSpanElement) focusStepText(stepSpanElement, 'end');
						}}
						onContextMenu={event => {
							if (!onStepContextMenu) return;
							event.preventDefault();
							onStepContextMenu(step.id, event.clientX, event.clientY);
						}}
					>
						{showCheckboxes && (
							<StepCheckbox
								stepID={step.id}
								isChecked={isCompleted}
								onToggle={onStepCheckboxChange}
								dragHandlers={getCheckboxDragHandlers(step.id)}
								className={isCompleted ? `${styles.stepCheckbox} ${styles.stepCheckboxChecked}` : styles.stepCheckbox}
								checkmarkClassName={styles.stepCheckmark}
							/>
						)}

						<span
							ref={stepSpanElement => registerStepSpanElementAndSyncText(step, stepSpanElement)}
							contentEditable
							suppressContentEditableWarning
							spellCheck={false}
							data-placeholder="Enter step here..."
							onBlur={event => {
								const newText = event.currentTarget.textContent ?? '';
								if (newText !== step.text) onSetStepText(step.id, newText);
							}}
							onPaste={onPlainTextPaste}
							onKeyDown={event => {
								onPlainTextKeyDown(event);
								if (matchesAnyShortcut(event, SHORTCUTS.stepsIndent.unindent)) {
									event.preventDefault();
									const typedText = event.currentTarget.textContent ?? '';
									if (typedText !== step.text) onSetStepText(step.id, typedText);
									onUnindentStep(step.id);
									setStepPendingFocus({ stepID: step.id, caretPosition: 'end' });
								}
								else if (matchesAnyShortcut(event, SHORTCUTS.stepsIndent.indent)) {
									event.preventDefault();
									const typedText = event.currentTarget.textContent ?? '';
									if (typedText !== step.text) onSetStepText(step.id, typedText);
									onIndentStep(step.id);
									setStepPendingFocus({ stepID: step.id, caretPosition: 'end' });
								}
								else if (matchesShortcut(event, SHORTCUTS.stepReorder.moveUp)) {
									event.preventDefault();
									const typedText = event.currentTarget.textContent ?? '';
									if (typedText !== step.text) onSetStepText(step.id, typedText);
									onMoveStepUp(step.id);
								}
								else if (matchesShortcut(event, SHORTCUTS.stepReorder.moveDown)) {
									event.preventDefault();
									const typedText = event.currentTarget.textContent ?? '';
									if (typedText !== step.text) onSetStepText(step.id, typedText);
									onMoveStepDown(step.id);
								}
								else if (matchesShortcut(event, SHORTCUTS.stepNavigate.toPreviousStep)) {
									const itemRows = displayRows.filter(candidate => candidate.kind === 'item');
									const previousRow = itemRows[itemRows.findIndex(candidate => candidate.kind === 'item' && candidate.node.id === step.id) - 1];
									if (previousRow && previousRow.kind === 'item') {
										event.preventDefault();
										const stepSpanElement = stepSpanElementsByStepIDRef.current.get(previousRow.node.id);
										if (stepSpanElement) focusStepText(stepSpanElement, 'end');
									}
								}
								else if (matchesShortcut(event, SHORTCUTS.stepNavigate.toNextStep)) {
									const itemRows = displayRows.filter(candidate => candidate.kind === 'item');
									const followingRow = itemRows[itemRows.findIndex(candidate => candidate.kind === 'item' && candidate.node.id === step.id) + 1];
									if (followingRow && followingRow.kind === 'item') {
										event.preventDefault();
										const stepSpanElement = stepSpanElementsByStepIDRef.current.get(followingRow.node.id);
										if (stepSpanElement) focusStepText(stepSpanElement, 'end');
									}
								}
								else if (matchesShortcutIgnoringShift(event, SHORTCUTS.stepInsert.insertBefore)) {
									event.preventDefault();
									const typedText = event.currentTarget.textContent ?? '';
									if (typedText !== step.text) onSetStepText(step.id, typedText);
									setStepPendingFocus({ stepID: onInsertStepBefore(step.id), caretPosition: 'end' });
								}
								else if (event.key === 'Backspace' && (event.currentTarget.textContent ?? '') === '') {
									event.preventDefault();
									const itemRows = displayRows.filter(candidate => candidate.kind === 'item');
									const previousRow = itemRows[itemRows.findIndex(candidate => candidate.kind === 'item' && candidate.node.id === step.id) - 1];
									const previousStepID = previousRow && previousRow.kind === 'item' ? previousRow.node.id : null;
									const wasStepDeletedImmediately = onBackspaceDeleteEmptyStep(step.id, previousStepID);
									if (wasStepDeletedImmediately && previousStepID) setStepPendingFocus({ stepID: previousStepID, caretPosition: 'end' });
								}
								else if (event.key === 'Enter') {
									event.preventDefault();
								}
								else if (event.key === 'Delete') {
									event.preventDefault();
									event.stopPropagation();
									event.currentTarget.blur();
									onRequestDeleteStep(step.id);
								}
							}}
							className={
								isCurrentStep
									? styles.currentStep
									: isCompleted
										? styles.previousStep
										: styles.upcomingStep
							}
						/>

						{isTouchDevice && onStepContextMenu && (
							<ContextMenuButton
								label="Step options"
								className={styles.stepMenuButton}
								onOpen={(x, y) => onStepContextMenu(step.id, x, y)}
							/>
						)}
					</div>
				);
			})}

			{draggingStepID !== null && draggingRowRect !== null && (() => {
				const draggingStep = allStepNodes.find(step => step.id === draggingStepID);
				if (!draggingStep) return null;
				const isCompleted = getIsStepCompleted?.(draggingStep.id) ?? false;
				const isCurrentStep = currentAndAncestorStepIDs?.has(draggingStep.id) ?? false;

				return (
					<div
						className={hasOverallLeftMargin ? `${styles.stepRow} ${styles.stepRowElevated}` : `${styles.stepRow} ${styles.stepRowElevated} ${styles.stepRowNoOverallLeftMargin}`}
						style={{ ...getDraggingRowOverlayStyle(draggingRowRect, dragOffsetY), paddingLeft: getStepRowPaddingLeft(draggingStepDepth, hasOverallLeftMargin) }}
					>
						{showCheckboxes && (
							<StepCheckbox
								stepID={draggingStep.id}
								isChecked={isCompleted}
								onToggle={() => {}}
								dragHandlers={{ onMouseDown: () => {}, onMouseEnter: () => {} }}
								className={isCompleted ? `${styles.stepCheckbox} ${styles.stepCheckboxChecked}` : styles.stepCheckbox}
								checkmarkClassName={styles.stepCheckmark}
							/>
						)}
						<span
							className={
								isCurrentStep
									? styles.currentStep
									: isCompleted
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
	);
});

export default StepsTreeEditor;

import { useRef, useState } from 'react';
import Step from '../model/task/Step';
import { usePressAndHold } from './usePressAndHold';
import { useFlipListAnimation } from './useFlipListAnimation';

const STEP_REORDER_HOLD_DELAY_MS = 200;

interface UseStepReorderDragOptions {
	steps: Step[];
	onReorder: (newOrderedStepIDs: string[]) => void;
}

interface StepRowDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
}

function computeInsertionIndex(steps: Step[], draggingStepID: string, hoveredStepID: string, hoveredElementRect: DOMRect, clientY: number): number {
	const stepsWithoutDragged = steps.filter(step => step.id !== draggingStepID);
	const hoveredIndex = stepsWithoutDragged.findIndex(step => step.id === hoveredStepID);
	if (hoveredIndex === -1) return stepsWithoutDragged.length;
	const isBeforeMidpoint = clientY < hoveredElementRect.top + hoveredElementRect.height / 2;
	return isBeforeMidpoint ? hoveredIndex : hoveredIndex + 1;
}

function spliceStepIntoOrder(steps: Step[], draggingStep: Step, insertionIndex: number): Step[] {
	const stepsWithoutDragged = steps.filter(step => step.id !== draggingStep.id);
	return [...stepsWithoutDragged.slice(0, insertionIndex), draggingStep, ...stepsWithoutDragged.slice(insertionIndex)];
}

export function getDraggingRowOverlayStyle(draggingRowRect: DOMRect, dragOffsetY: number): React.CSSProperties {
	return {
		position: 'fixed',
		top: draggingRowRect.top + dragOffsetY,
		left: draggingRowRect.left,
		width: draggingRowRect.width,
		height: draggingRowRect.height,
		zIndex: 50,
		pointerEvents: 'none',
	};
}

export function useStepReorderDrag<TContainerElement extends HTMLElement = HTMLDivElement>({ steps, onReorder }: UseStepReorderDragOptions) {
	const [draggingStepID, setDraggingStepID] = useState<string | null>(null);
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
	const [draggingRowRect, setDraggingRowRect] = useState<DOMRect | null>(null);
	const dragStartClientYRef = useRef(0);

	const draggingStep = draggingStepID !== null ? steps.find(step => step.id === draggingStepID) ?? null : null;

	const displaySteps = draggingStep !== null && insertionIndex !== null
		? spliceStepIntoOrder(steps, draggingStep, insertionIndex)
		: steps;

	const { registerRowElement, getRowElement } = useFlipListAnimation({
		displayItemIDs: displaySteps.map(step => step.id),
		excludeItemID: draggingStepID,
	});

	const { containerRef: stepsContainerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute: 'data-step-row',
		excludeSelector: '[data-step]',
		mouseHoldDelayMs: STEP_REORDER_HOLD_DELAY_MS,
		touchHoldDelayMs: STEP_REORDER_HOLD_DELAY_MS,
		onHoldStart: (stepID, _startClientX, startClientY) => {
			const rowElement = getRowElement(stepID);
			setDraggingStepID(stepID);
			setInsertionIndex(steps.findIndex(step => step.id === stepID));
			setDraggingRowRect(rowElement?.getBoundingClientRect() ?? null);
			dragStartClientYRef.current = startClientY;
			setDragOffsetY(0);
			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'grabbing';
			window.getSelection()?.removeAllRanges();
		},
		onHoldMove: (_clientX, clientY) => {
			setDragOffsetY(clientY - dragStartClientYRef.current);
		},
		onPointerOverItem: (stepID, elementRect, clientY) => {
			if (draggingStepID === null || stepID === draggingStepID) return;
			setInsertionIndex(computeInsertionIndex(steps, draggingStepID, stepID, elementRect, clientY));
		},
		onHoldEnd: () => {
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			const draggingStep = draggingStepID !== null ? steps.find(step => step.id === draggingStepID) ?? null : null;
			if (draggingStep !== null && insertionIndex !== null) {
				const newOrder = spliceStepIntoOrder(steps, draggingStep, insertionIndex);
				if (!newOrder.every((step, index) => step.id === steps[index].id)) onReorder(newOrder.map(step => step.id));
			}
			setDraggingStepID(null);
			setInsertionIndex(null);
			setDraggingRowRect(null);
			setDragOffsetY(0);
		},
	});

	function getRowDragHandlers(stepID: string): StepRowDragHandlers {
		return { onMouseDown: getPressHandlers(stepID).onMouseDown };
	}

	return {
		stepsContainerRef,
		getRowDragHandlers,
		registerRowElement,
		draggingStepID,
		displaySteps,
		dragOffsetY,
		draggingRowRect,
	};
}

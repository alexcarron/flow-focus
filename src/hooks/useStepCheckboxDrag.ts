import { useRef } from 'react';
import { usePressAndHold } from './usePressAndHold';
import { useIsTouchDevice } from './useIsTouchDevice';

const DOUBLE_TAP_MAX_INTERVAL_MS = 300;

interface UseStepCheckboxDragOptions {
	itemAttribute?: string;
	isStepChecked: (stepID: string) => boolean;
	setStepChecked: (stepID: string, isChecked: boolean) => void;
	onDoubleTapCheckUpToHere?: (stepID: string, isChecked: boolean) => void;
}

interface StepCheckboxDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: (event: React.MouseEvent) => void;
}

interface CompletedSingleTap {
	stepID: string;
	appliedIsChecked: boolean;
	releasedAtMs: number;
}

export function useStepCheckboxDrag<TContainerElement extends HTMLElement = HTMLDivElement>({ itemAttribute = 'data-step', isStepChecked, setStepChecked, onDoubleTapCheckUpToHere }: UseStepCheckboxDragOptions) {
	const isTouchDevice = useIsTouchDevice();
	const checkboxDragTargetStateRef = useRef<boolean | null>(null);
	const stepIDsAlreadyToggledInDragRef = useRef<Set<string>>(new Set());
	const singleStepTapInProgressRef = useRef<{ stepID: string; appliedIsChecked: boolean } | null>(null);
	const lastCompletedSingleTapRef = useRef<CompletedSingleTap | null>(null);

	function applyCheckboxDragToStep(stepID: string) {
		const dragTargetState = checkboxDragTargetStateRef.current;
		if (dragTargetState === null) return;
		if (stepIDsAlreadyToggledInDragRef.current.has(stepID)) return;
		stepIDsAlreadyToggledInDragRef.current.add(stepID);
		setStepChecked(stepID, dragTargetState);
		singleStepTapInProgressRef.current = null;
	}

	const { containerRef: stepsContainerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute,
		mouseHoldDelayMs: 0,
		onHoldStart: stepID => {
			const lastCompletedSingleTap = lastCompletedSingleTapRef.current;
			const isDoubleTap = isTouchDevice
				&& lastCompletedSingleTap !== null
				&& lastCompletedSingleTap.stepID === stepID
				&& Date.now() - lastCompletedSingleTap.releasedAtMs <= DOUBLE_TAP_MAX_INTERVAL_MS;

			if (isDoubleTap && onDoubleTapCheckUpToHere) {
				lastCompletedSingleTapRef.current = null;
				checkboxDragTargetStateRef.current = lastCompletedSingleTap.appliedIsChecked;
				stepIDsAlreadyToggledInDragRef.current = new Set([stepID]);
				onDoubleTapCheckUpToHere(stepID, lastCompletedSingleTap.appliedIsChecked);
				return;
			}

			const nextIsChecked = !isStepChecked(stepID);
			checkboxDragTargetStateRef.current = nextIsChecked;
			stepIDsAlreadyToggledInDragRef.current = new Set([stepID]);
			setStepChecked(stepID, nextIsChecked);
			singleStepTapInProgressRef.current = isTouchDevice ? { stepID, appliedIsChecked: nextIsChecked } : null;
		},
		onPointerOverItem: stepID => applyCheckboxDragToStep(stepID),
		onHoldEnd: () => {
			if (singleStepTapInProgressRef.current !== null) {
				lastCompletedSingleTapRef.current = { ...singleStepTapInProgressRef.current, releasedAtMs: Date.now() };
			}
			singleStepTapInProgressRef.current = null;
			checkboxDragTargetStateRef.current = null;
			stepIDsAlreadyToggledInDragRef.current = new Set();
		},
	});

	function getCheckboxDragHandlers(stepID: string): StepCheckboxDragHandlers {
		const pressHandlers = getPressHandlers(stepID);
		return {
			onMouseDown: event => {
				if (event.shiftKey) return;
				pressHandlers.onMouseDown(event);
			},
			onMouseEnter: pressHandlers.onMouseEnter,
		};
	}

	return { stepsContainerRef, getCheckboxDragHandlers };
}

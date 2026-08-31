import { useRef } from 'react';
import { usePressAndHold } from './usePressAndHold';

interface UseStepCheckboxDragOptions {
	itemAttribute?: string;
	isStepChecked: (stepID: string) => boolean;
	setStepChecked: (stepID: string, isChecked: boolean) => void;
}

interface StepCheckboxDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: (event: React.MouseEvent) => void;
}

export function useStepCheckboxDrag<TContainerElement extends HTMLElement = HTMLDivElement>({ itemAttribute = 'data-step', isStepChecked, setStepChecked }: UseStepCheckboxDragOptions) {
	const checkboxDragTargetStateRef = useRef<boolean | null>(null);
	const stepIDsAlreadyToggledInDragRef = useRef<Set<string>>(new Set());

	const isStepCheckedRef = useRef(isStepChecked);
	isStepCheckedRef.current = isStepChecked;
	const setStepCheckedRef = useRef(setStepChecked);
	setStepCheckedRef.current = setStepChecked;

	function applyCheckboxDragToStep(stepID: string) {
		const dragTargetState = checkboxDragTargetStateRef.current;
		if (dragTargetState === null) return;
		if (stepIDsAlreadyToggledInDragRef.current.has(stepID)) return;
		stepIDsAlreadyToggledInDragRef.current.add(stepID);
		setStepCheckedRef.current(stepID, dragTargetState);
	}

	const { containerRef: stepsContainerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute,
		mouseHoldDelayMs: 0,
		onHoldStart: stepID => {
			const nextIsChecked = !isStepCheckedRef.current(stepID);
			checkboxDragTargetStateRef.current = nextIsChecked;
			stepIDsAlreadyToggledInDragRef.current = new Set([stepID]);
			setStepCheckedRef.current(stepID, nextIsChecked);
		},
		onPointerOverItem: stepID => applyCheckboxDragToStep(stepID),
		onHoldEnd: () => {
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

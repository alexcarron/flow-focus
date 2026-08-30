import { useRef } from 'react';
import { usePressAndHold } from './usePressAndHold';

interface UseStepCheckboxDragOptions {
	isStepChecked: (step: string) => boolean;
	setStepChecked: (step: string, isChecked: boolean) => void;
}

interface StepCheckboxDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: (event: React.MouseEvent) => void;
}

export function useStepCheckboxDrag<TContainerElement extends HTMLElement = HTMLDivElement>({ isStepChecked, setStepChecked }: UseStepCheckboxDragOptions) {
	const checkboxDragTargetStateRef = useRef<boolean | null>(null);
	const stepsAlreadyToggledInDragRef = useRef<Set<string>>(new Set());

	const isStepCheckedRef = useRef(isStepChecked);
	isStepCheckedRef.current = isStepChecked;
	const setStepCheckedRef = useRef(setStepChecked);
	setStepCheckedRef.current = setStepChecked;

	function applyCheckboxDragToStep(step: string) {
		const dragTargetState = checkboxDragTargetStateRef.current;
		if (dragTargetState === null) return;
		if (stepsAlreadyToggledInDragRef.current.has(step)) return;
		stepsAlreadyToggledInDragRef.current.add(step);
		setStepCheckedRef.current(step, dragTargetState);
	}

	const { containerRef: stepsContainerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute: 'data-step',
		mouseHoldDelayMs: 0,
		onHoldStart: step => {
			const nextIsChecked = !isStepCheckedRef.current(step);
			checkboxDragTargetStateRef.current = nextIsChecked;
			stepsAlreadyToggledInDragRef.current = new Set([step]);
			setStepCheckedRef.current(step, nextIsChecked);
		},
		onPointerOverItem: step => applyCheckboxDragToStep(step),
		onHoldEnd: () => {
			checkboxDragTargetStateRef.current = null;
			stepsAlreadyToggledInDragRef.current = new Set();
		},
	});

	function getCheckboxDragHandlers(step: string): StepCheckboxDragHandlers {
		const pressHandlers = getPressHandlers(step);
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

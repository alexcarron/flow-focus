import { useEffect, useRef, useState } from 'react';

const CHECKBOX_TOUCH_HOLD_DELAY_MS = 250;

interface UseStepCheckboxDragOptions {
	isStepChecked: (step: string) => boolean;
	setStepChecked: (step: string, isChecked: boolean) => void;
}

interface StepCheckboxDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: () => void;
}

function findStepElement(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof Element)) return null;
	return target.closest<HTMLElement>('[data-step]');
}

export function useStepCheckboxDrag<TContainerElement extends HTMLElement = HTMLDivElement>({ isStepChecked, setStepChecked }: UseStepCheckboxDragOptions) {
	const stepsContainerRef = useRef<TContainerElement>(null);
	const [isCheckboxDragActive, setIsCheckboxDragActive] = useState(false);
	const checkboxDragTargetStateRef = useRef<boolean | null>(null);
	const stepsAlreadyToggledInDragRef = useRef<Set<string>>(new Set());
	const checkboxTouchHoldTimerRef = useRef<number | null>(null);
	const isCheckboxTouchDragArmedRef = useRef(false);

	const isStepCheckedRef = useRef(isStepChecked);
	isStepCheckedRef.current = isStepChecked;
	const setStepCheckedRef = useRef(setStepChecked);
	setStepCheckedRef.current = setStepChecked;

	function beginCheckboxDrag(step: string, nextIsChecked: boolean) {
		checkboxDragTargetStateRef.current = nextIsChecked;
		stepsAlreadyToggledInDragRef.current = new Set([step]);
		setStepCheckedRef.current(step, nextIsChecked);
		setIsCheckboxDragActive(true);
	}

	function applyCheckboxDragToStep(step: string) {
		const dragTargetState = checkboxDragTargetStateRef.current;
		if (dragTargetState === null) return;
		if (stepsAlreadyToggledInDragRef.current.has(step)) return;
		stepsAlreadyToggledInDragRef.current.add(step);
		setStepCheckedRef.current(step, dragTargetState);
	}

	function endCheckboxDrag() {
		checkboxDragTargetStateRef.current = null;
		stepsAlreadyToggledInDragRef.current = new Set();
		setIsCheckboxDragActive(false);
	}

	useEffect(() => {
		if (!isCheckboxDragActive) return;
		window.addEventListener('mouseup', endCheckboxDrag);
		return () => window.removeEventListener('mouseup', endCheckboxDrag);
	}, [isCheckboxDragActive]);

	useEffect(() => {
		const stepsContainer = stepsContainerRef.current;
		if (!stepsContainer) return;

		function onTouchStart(event: TouchEvent) {
			const stepElement = findStepElement(event.target);
			if (!stepElement) return;
			const step = stepElement.dataset.step!;
			const isChecked = isStepCheckedRef.current(step);
			isCheckboxTouchDragArmedRef.current = false;
			checkboxTouchHoldTimerRef.current = window.setTimeout(() => {
				isCheckboxTouchDragArmedRef.current = true;
				beginCheckboxDrag(step, !isChecked);
			}, CHECKBOX_TOUCH_HOLD_DELAY_MS);
		}

		function onTouchMove(event: TouchEvent) {
			if (!isCheckboxTouchDragArmedRef.current) {
				if (checkboxTouchHoldTimerRef.current !== null) {
					clearTimeout(checkboxTouchHoldTimerRef.current);
					checkboxTouchHoldTimerRef.current = null;
				}
				return;
			}
			event.preventDefault();
			const touch = event.touches[0];
			const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
			const stepElement = findStepElement(elementUnderTouch);
			if (stepElement && stepsContainer!.contains(stepElement)) {
				applyCheckboxDragToStep(stepElement.dataset.step!);
			}
		}

		function onTouchEnd() {
			if (checkboxTouchHoldTimerRef.current !== null) {
				clearTimeout(checkboxTouchHoldTimerRef.current);
				checkboxTouchHoldTimerRef.current = null;
			}
			isCheckboxTouchDragArmedRef.current = false;
			endCheckboxDrag();
		}

		stepsContainer.addEventListener('touchstart', onTouchStart, { passive: true });
		stepsContainer.addEventListener('touchmove', onTouchMove, { passive: false });
		stepsContainer.addEventListener('touchend', onTouchEnd);
		stepsContainer.addEventListener('touchcancel', onTouchEnd);

		return () => {
			stepsContainer.removeEventListener('touchstart', onTouchStart);
			stepsContainer.removeEventListener('touchmove', onTouchMove);
			stepsContainer.removeEventListener('touchend', onTouchEnd);
			stepsContainer.removeEventListener('touchcancel', onTouchEnd);
			if (checkboxTouchHoldTimerRef.current !== null) clearTimeout(checkboxTouchHoldTimerRef.current);
		};
	}, []);

	function getCheckboxDragHandlers(step: string): StepCheckboxDragHandlers {
		return {
			onMouseDown: event => {
				if (event.shiftKey || event.button !== 0) return;
				beginCheckboxDrag(step, !isStepCheckedRef.current(step));
			},
			onMouseEnter: () => applyCheckboxDragToStep(step),
		};
	}

	return { stepsContainerRef, getCheckboxDragHandlers };
}

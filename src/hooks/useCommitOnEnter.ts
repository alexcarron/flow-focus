import { RefCallback, useCallback, useRef } from 'react';

const LINE_INSERTING_INPUT_TYPES = new Set(['insertParagraph', 'insertLineBreak']);

interface UseCommitOnEnterOptions {
	targetSelector?: string;
	onEnter?: (targetElement: HTMLElement) => void;
}

function isUnmodifiedEnterKeydown(event: KeyboardEvent): boolean {
	return event.key === 'Enter' && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
}

function findTargetElement(eventTarget: EventTarget | null, container: HTMLElement, targetSelector: string | undefined): HTMLElement | null {
	if (!(eventTarget instanceof HTMLElement)) return null;
	if (targetSelector === undefined) return eventTarget === container || container.contains(eventTarget) ? container : null;
	return eventTarget.closest<HTMLElement>(targetSelector);
}

export function useCommitOnEnter<TContainerElement extends HTMLElement = HTMLElement>({ targetSelector, onEnter }: UseCommitOnEnterOptions = {}): RefCallback<TContainerElement> {
	const onEnterRef = useRef(onEnter);
	onEnterRef.current = onEnter;
	const detachFromPreviousContainerRef = useRef<(() => void) | null>(null);

	return useCallback((container: TContainerElement | null) => {
		detachFromPreviousContainerRef.current?.();
		detachFromPreviousContainerRef.current = null;
		if (!container) return;

		function commit(targetElement: HTMLElement) {
			if (onEnterRef.current) onEnterRef.current(targetElement);
			else targetElement.blur();
		}

		function onKeyDown(event: KeyboardEvent) {
			if (!isUnmodifiedEnterKeydown(event)) return;
			const targetElement = findTargetElement(event.target, container!, targetSelector);
			if (!targetElement) return;
			event.preventDefault();
			event.stopPropagation();
			commit(targetElement);
		}

		function onBeforeInput(event: InputEvent) {
			if (!LINE_INSERTING_INPUT_TYPES.has(event.inputType)) return;
			const targetElement = findTargetElement(event.target, container!, targetSelector);
			if (!targetElement) return;
			event.preventDefault();
			if (event.inputType === 'insertParagraph') commit(targetElement);
		}

		container.addEventListener('keydown', onKeyDown);
		container.addEventListener('beforeinput', onBeforeInput as EventListener);
		detachFromPreviousContainerRef.current = () => {
			container.removeEventListener('keydown', onKeyDown);
			container.removeEventListener('beforeinput', onBeforeInput as EventListener);
		};
	}, [targetSelector]);
}

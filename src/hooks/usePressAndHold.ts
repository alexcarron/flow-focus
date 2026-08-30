import { useEffect, useRef, useState } from 'react';

const DEFAULT_TOUCH_HOLD_DELAY_MS = 250;
const DEFAULT_MOVEMENT_TOLERANCE_FOR_HOLD_PX = 6;

interface UsePressAndHoldOptions {
	itemAttribute?: string;
	excludeSelector?: string;
	mouseHoldDelayMs?: number;
	touchHoldDelayMs?: number;
	movementToleranceForHoldPx?: number;
	onHoldStart?: (itemKey: string, startClientX: number, startClientY: number) => void;
	onPointerOverItem?: (itemKey: string, itemElementRect: DOMRect, clientY: number) => void;
	onHoldMove?: (clientX: number, clientY: number) => void;
	onHoldEnd?: () => void;
}

interface PressHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: (event: React.MouseEvent) => void;
}

function findItemElement(target: EventTarget | null, itemAttribute: string): HTMLElement | null {
	if (!(target instanceof Element)) return null;
	return target.closest<HTMLElement>(`[${itemAttribute}]`);
}

function isWithinExcludedElement(target: EventTarget | null, excludeSelector: string | undefined): boolean {
	if (!excludeSelector) return false;
	if (!(target instanceof Element)) return false;
	return target.closest(excludeSelector) !== null;
}

export function usePressAndHold<TContainerElement extends HTMLElement = HTMLDivElement>({
	itemAttribute = 'data-step',
	excludeSelector,
	mouseHoldDelayMs = 0,
	touchHoldDelayMs = DEFAULT_TOUCH_HOLD_DELAY_MS,
	movementToleranceForHoldPx = DEFAULT_MOVEMENT_TOLERANCE_FOR_HOLD_PX,
	onHoldStart,
	onPointerOverItem,
	onHoldMove,
	onHoldEnd,
}: UsePressAndHoldOptions) {
	const containerRef = useRef<TContainerElement>(null);
	const [isHoldActive, setIsHoldActive] = useState(false);
	const isHoldActiveRef = useRef(false);
	const touchHoldTimerRef = useRef<number | null>(null);
	const isTouchHoldArmedRef = useRef(false);

	const onHoldStartRef = useRef(onHoldStart);
	onHoldStartRef.current = onHoldStart;
	const onPointerOverItemRef = useRef(onPointerOverItem);
	onPointerOverItemRef.current = onPointerOverItem;
	const onHoldMoveRef = useRef(onHoldMove);
	onHoldMoveRef.current = onHoldMove;
	const onHoldEndRef = useRef(onHoldEnd);
	onHoldEndRef.current = onHoldEnd;

	function armHold(itemKey: string, startClientX: number, startClientY: number) {
		isHoldActiveRef.current = true;
		setIsHoldActive(true);
		onHoldStartRef.current?.(itemKey, startClientX, startClientY);
	}

	function endHold() {
		if (!isHoldActiveRef.current) return;
		isHoldActiveRef.current = false;
		setIsHoldActive(false);
		onHoldEndRef.current?.();
	}

	useEffect(() => {
		if (!isHoldActive) return;
		window.addEventListener('mouseup', endHold);
		return () => window.removeEventListener('mouseup', endHold);
	}, [isHoldActive]);

	useEffect(() => {
		if (!isHoldActive) return;
		const container = containerRef.current;
		if (!container) return;

		function onMouseMoveWhileHolding(event: MouseEvent) {
			onHoldMoveRef.current?.(event.clientX, event.clientY);
			const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
			const itemElement = findItemElement(elementUnderPointer, itemAttribute);
			if (itemElement && container!.contains(itemElement)) {
				const itemKey = itemElement.getAttribute(itemAttribute)!;
				onPointerOverItemRef.current?.(itemKey, itemElement.getBoundingClientRect(), event.clientY);
			}
		}

		window.addEventListener('mousemove', onMouseMoveWhileHolding);
		return () => window.removeEventListener('mousemove', onMouseMoveWhileHolding);
	}, [isHoldActive, itemAttribute]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		function onTouchStart(event: TouchEvent) {
			if (isWithinExcludedElement(event.target, excludeSelector)) return;
			const itemElement = findItemElement(event.target, itemAttribute);
			if (!itemElement) return;
			const itemKey = itemElement.getAttribute(itemAttribute)!;
			const touch = event.touches[0];
			isTouchHoldArmedRef.current = false;
			touchHoldTimerRef.current = window.setTimeout(() => {
				isTouchHoldArmedRef.current = true;
				armHold(itemKey, touch.clientX, touch.clientY);
			}, touchHoldDelayMs);
		}

		function onTouchMove(event: TouchEvent) {
			if (!isTouchHoldArmedRef.current) {
				if (touchHoldTimerRef.current !== null) {
					clearTimeout(touchHoldTimerRef.current);
					touchHoldTimerRef.current = null;
				}
				return;
			}
			event.preventDefault();
			const touch = event.touches[0];
			onHoldMoveRef.current?.(touch.clientX, touch.clientY);
			const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
			const itemElement = findItemElement(elementUnderTouch, itemAttribute);
			if (itemElement && container!.contains(itemElement)) {
				const itemKey = itemElement.getAttribute(itemAttribute)!;
				onPointerOverItemRef.current?.(itemKey, itemElement.getBoundingClientRect(), touch.clientY);
			}
		}

		function onTouchEnd() {
			if (touchHoldTimerRef.current !== null) {
				clearTimeout(touchHoldTimerRef.current);
				touchHoldTimerRef.current = null;
			}
			isTouchHoldArmedRef.current = false;
			endHold();
		}

		container.addEventListener('touchstart', onTouchStart, { passive: true });
		container.addEventListener('touchmove', onTouchMove, { passive: false });
		container.addEventListener('touchend', onTouchEnd);
		container.addEventListener('touchcancel', onTouchEnd);

		return () => {
			container.removeEventListener('touchstart', onTouchStart);
			container.removeEventListener('touchmove', onTouchMove);
			container.removeEventListener('touchend', onTouchEnd);
			container.removeEventListener('touchcancel', onTouchEnd);
			if (touchHoldTimerRef.current !== null) clearTimeout(touchHoldTimerRef.current);
		};
	}, [itemAttribute, excludeSelector, touchHoldDelayMs]);

	function getPressHandlers(itemKey: string): PressHandlers {
		return {
			onMouseDown: event => {
				if (event.button !== 0) return;
				if (isWithinExcludedElement(event.target, excludeSelector)) return;

				if (mouseHoldDelayMs <= 0) {
					armHold(itemKey, event.clientX, event.clientY);
					return;
				}

				const startX = event.clientX;
				const startY = event.clientY;
				let pendingHoldTimer: number | null = null;

				function cancelPendingHold() {
					if (pendingHoldTimer !== null) {
						clearTimeout(pendingHoldTimer);
						pendingHoldTimer = null;
					}
					window.removeEventListener('mousemove', onEarlyMove);
					window.removeEventListener('mouseup', cancelPendingHold);
				}

				function onEarlyMove(moveEvent: MouseEvent) {
					const movedPx = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
					if (movedPx > movementToleranceForHoldPx) cancelPendingHold();
				}

				pendingHoldTimer = window.setTimeout(() => {
					window.removeEventListener('mousemove', onEarlyMove);
					window.removeEventListener('mouseup', cancelPendingHold);
					armHold(itemKey, startX, startY);
				}, mouseHoldDelayMs);
				window.addEventListener('mousemove', onEarlyMove);
				window.addEventListener('mouseup', cancelPendingHold);
			},
			onMouseEnter: event => {
				if (!isHoldActiveRef.current) return;
				onPointerOverItemRef.current?.(itemKey, event.currentTarget.getBoundingClientRect(), event.clientY);
			},
		};
	}

	return { containerRef, getPressHandlers, isHoldActive };
}

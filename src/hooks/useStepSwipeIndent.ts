import { useEffect, useRef, useState } from 'react';

const SWIPE_TRIGGER_DISTANCE_PX = 56;
const SWIPE_DIRECTION_LOCK_TOLERANCE_PX = 10;
const SWIPE_VISUAL_OFFSET_CAP_PX = 72;
const SWIPE_MAX_DURATION_MS = 500;

interface UseStepSwipeIndentOptions {
	isEnabled: boolean;
	onIndent: (itemID: string) => void;
	onUnindent: (itemID: string) => void;
}

interface SwipeStartHandlers {
	onTouchStart: (event: React.TouchEvent) => void;
}

export function useStepSwipeIndent({ isEnabled, onIndent, onUnindent }: UseStepSwipeIndentOptions) {
	const [swipingItemID, setSwipingItemID] = useState<string | null>(null);
	const [swipeOffsetX, setSwipeOffsetX] = useState(0);
	const swipeOffsetXRef = useRef(0);
	const swipeStartRef = useRef({ x: 0, y: 0, time: 0 });
	const isHorizontalSwipeRef = useRef<boolean | null>(null);

	const onIndentRef = useRef(onIndent);
	onIndentRef.current = onIndent;
	const onUnindentRef = useRef(onUnindent);
	onUnindentRef.current = onUnindent;

	function endSwipe() {
		setSwipingItemID(null);
		setSwipeOffsetX(0);
		swipeOffsetXRef.current = 0;
		isHorizontalSwipeRef.current = null;
	}

	useEffect(() => {
		if (swipingItemID === null) return;

		function onTouchMove(event: TouchEvent) {
			const touch = event.touches[0];
			if (!touch) return;
			const deltaX = touch.clientX - swipeStartRef.current.x;
			const deltaY = touch.clientY - swipeStartRef.current.y;

			if (isHorizontalSwipeRef.current === null) {
				if (Math.abs(deltaX) < SWIPE_DIRECTION_LOCK_TOLERANCE_PX && Math.abs(deltaY) < SWIPE_DIRECTION_LOCK_TOLERANCE_PX) return;
				isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
				if (!isHorizontalSwipeRef.current) {
					endSwipe();
					return;
				}
			}

			if (!isHorizontalSwipeRef.current) return;
			event.preventDefault();
			const cappedOffsetX = Math.max(-SWIPE_VISUAL_OFFSET_CAP_PX, Math.min(SWIPE_VISUAL_OFFSET_CAP_PX, deltaX));
			swipeOffsetXRef.current = cappedOffsetX;
			setSwipeOffsetX(cappedOffsetX);
		}

		function onTouchEnd() {
			const wasHorizontalSwipe = isHorizontalSwipeRef.current;
			const finalOffsetX = swipeOffsetXRef.current;
			const elapsedMs = Date.now() - swipeStartRef.current.time;
			const swipedItemID = swipingItemID;
			endSwipe();
			if (swipedItemID === null) return;
			if (!wasHorizontalSwipe) return;
			if (elapsedMs > SWIPE_MAX_DURATION_MS) return;
			if (finalOffsetX >= SWIPE_TRIGGER_DISTANCE_PX) onIndentRef.current(swipedItemID);
			else if (finalOffsetX <= -SWIPE_TRIGGER_DISTANCE_PX) onUnindentRef.current(swipedItemID);
		}

		window.addEventListener('touchmove', onTouchMove, { passive: false });
		window.addEventListener('touchend', onTouchEnd);
		window.addEventListener('touchcancel', endSwipe);
		return () => {
			window.removeEventListener('touchmove', onTouchMove);
			window.removeEventListener('touchend', onTouchEnd);
			window.removeEventListener('touchcancel', endSwipe);
		};
	}, [swipingItemID]);

	function getSwipeHandlers(itemID: string): SwipeStartHandlers {
		return {
			onTouchStart: event => {
				if (!isEnabled) return;
				if (event.touches.length !== 1) return;
				const touch = event.touches[0];
				swipeStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
				isHorizontalSwipeRef.current = null;
				setSwipingItemID(itemID);
			},
		};
	}

	return { getSwipeHandlers, swipingItemID, swipeOffsetX };
}

import { useEffect, useRef } from 'react';

const POINTER_IDLE_MILLISECONDS = 2000;

export function useActivePointerPositionGetter() {
	const lastPointerPositionRef = useRef<{ x: number, y: number, timeMilliseconds: number } | null>(null);

	useEffect(() => {
		function rememberPointerPosition(event: PointerEvent) {
			lastPointerPositionRef.current = {
				x: event.clientX,
				y: event.clientY,
				timeMilliseconds: performance.now(),
			};
		}
		function forgetPointerPosition(event: PointerEvent) {
			if (event.pointerType !== 'mouse') return;
			lastPointerPositionRef.current = null;
		}
		window.addEventListener('pointermove', rememberPointerPosition);
		window.addEventListener('pointerdown', rememberPointerPosition);
		document.documentElement.addEventListener('pointerleave', forgetPointerPosition);
		return () => {
			window.removeEventListener('pointermove', rememberPointerPosition);
			window.removeEventListener('pointerdown', rememberPointerPosition);
			document.documentElement.removeEventListener('pointerleave', forgetPointerPosition);
		};
	}, []);

	return function getActivePointerPosition(): { x: number, y: number } | null {
		const lastPointerPosition = lastPointerPositionRef.current;
		if (!lastPointerPosition) return null;
		const isPointerIdle = performance.now() - lastPointerPosition.timeMilliseconds > POINTER_IDLE_MILLISECONDS;
		if (isPointerIdle) return null;
		return { x: lastPointerPosition.x, y: lastPointerPosition.y };
	};
}

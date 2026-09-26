import { useEffect, useState } from 'react';

const QUALIFYING_POINTER_EVENT_TYPES = ['mousedown', 'touchstart', 'pointerdown'] as const;

export function useHasInteractedSinceRegainingFocus(): boolean {
	const [hasInteractedSinceRegainingFocus, setHasInteractedSinceRegainingFocus] = useState(true);

	useEffect(() => {
		function markAsNotYetInteracted() {
			setHasInteractedSinceRegainingFocus(false);
		}

		function markAsInteracted() {
			setHasInteractedSinceRegainingFocus(true);
		}

		function onWindowBlur() {
			markAsNotYetInteracted();
		}

		function onVisibilityChange() {
			if (document.hidden) markAsNotYetInteracted();
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Enter') markAsInteracted();
		}

		window.addEventListener('blur', onWindowBlur);
		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('keydown', onKeyDown);
		for (const eventType of QUALIFYING_POINTER_EVENT_TYPES) {
			window.addEventListener(eventType, markAsInteracted);
		}

		return () => {
			window.removeEventListener('blur', onWindowBlur);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('keydown', onKeyDown);
			for (const eventType of QUALIFYING_POINTER_EVENT_TYPES) {
				window.removeEventListener(eventType, markAsInteracted);
			}
		};
	}, []);

	return hasInteractedSinceRegainingFocus;
}

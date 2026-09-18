import { useEffect, useState } from 'react';

const COARSE_POINTER_MEDIA_QUERY = '(pointer: coarse)';

export function isTouchDevice(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
	return window.matchMedia(COARSE_POINTER_MEDIA_QUERY).matches;
}

export function useIsTouchDevice(): boolean {
	const [isTouch, setIsTouch] = useState(isTouchDevice);

	useEffect(() => {
		if (typeof window.matchMedia !== 'function') return;
		const mediaQueryList = window.matchMedia(COARSE_POINTER_MEDIA_QUERY);
		function onPointerCapabilityChange(event: MediaQueryListEvent) {
			setIsTouch(event.matches);
		}
		mediaQueryList.addEventListener('change', onPointerCapabilityChange);
		return () => mediaQueryList.removeEventListener('change', onPointerCapabilityChange);
	}, []);

	return isTouch;
}

import { useSyncExternalStore } from 'react';

const COARSE_POINTER_MEDIA_QUERY = '(pointer: coarse)';

function isMatchMediaSupported(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function isTouchDevice(): boolean {
	if (!isMatchMediaSupported()) return false;
	return window.matchMedia(COARSE_POINTER_MEDIA_QUERY).matches;
}

function subscribeToPointerCapabilityChanges(onPointerCapabilityChange: () => void): () => void {
	if (!isMatchMediaSupported()) return () => {};
	const mediaQueryList = window.matchMedia(COARSE_POINTER_MEDIA_QUERY);
	mediaQueryList.addEventListener('change', onPointerCapabilityChange);
	return () => mediaQueryList.removeEventListener('change', onPointerCapabilityChange);
}

export function useIsTouchDevice(): boolean {
	return useSyncExternalStore(subscribeToPointerCapabilityChanges, isTouchDevice);
}

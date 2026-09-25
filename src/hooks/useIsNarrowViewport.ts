import { useCallback, useSyncExternalStore } from 'react';

function isMatchMediaSupported(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function createMaxWidthMediaQuery(maxWidthPx: number): string {
	return `(max-width: ${maxWidthPx}px)`;
}

export function useIsNarrowViewport(maxWidthPx: number): boolean {
	const subscribeToViewportWidthChanges = useCallback((onViewportWidthChange: () => void) => {
		if (!isMatchMediaSupported()) return () => {};
		const mediaQueryList = window.matchMedia(createMaxWidthMediaQuery(maxWidthPx));
		mediaQueryList.addEventListener('change', onViewportWidthChange);
		
		return () => mediaQueryList.removeEventListener('change', onViewportWidthChange);
	}, [maxWidthPx]);

	const getIsNarrowViewport = useCallback(() => {
		if (!isMatchMediaSupported()) return false;
		return window.matchMedia(createMaxWidthMediaQuery(maxWidthPx)).matches;
	}, [maxWidthPx]);

	return useSyncExternalStore(subscribeToViewportWidthChanges, getIsNarrowViewport);
}

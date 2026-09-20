import { useEffect, useState } from 'react';

function getIsNarrowViewport(maxWidthPx: number): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
	return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
}

export function useIsNarrowViewport(maxWidthPx: number): boolean {
	const [isNarrowViewport, setIsNarrowViewport] = useState(() => getIsNarrowViewport(maxWidthPx));

	useEffect(() => {
		if (typeof window.matchMedia !== 'function') return;
		const mediaQueryList = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
		function onViewportWidthChange(event: MediaQueryListEvent) {
			setIsNarrowViewport(event.matches);
		}
		setIsNarrowViewport(mediaQueryList.matches);
		mediaQueryList.addEventListener('change', onViewportWidthChange);
		return () => mediaQueryList.removeEventListener('change', onViewportWidthChange);
	}, [maxWidthPx]);

	return isNarrowViewport;
}

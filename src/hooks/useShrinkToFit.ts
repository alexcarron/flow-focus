import { useRef, useEffect } from 'react';

function adjustWidth(el: HTMLElement): void {
	const computedStyle = getComputedStyle(el);
	const maxWidth = parseFloat(computedStyle.maxWidth) || el.parentElement?.offsetWidth || 9999;

	let width = el.offsetWidth;
	const heightBefore = el.offsetHeight;

	// Grow until height changes (finds the wrap point)
	let widthToKeep = width;
	let keepLooking = true;
	while (keepLooking) {
		let didHeightChange = false;
		while (width < maxWidth && !didHeightChange) {
			width++;
			el.style.width = `${width}px`;
			if (el.offsetHeight !== heightBefore) didHeightChange = true;
		}
		if (didHeightChange) {
			widthToKeep = el.offsetWidth;
		} else {
			keepLooking = false;
		}
		if (width >= maxWidth) keepLooking = false;
	}

	el.style.width = `${widthToKeep}px`;

	const h = el.offsetHeight;
	let w = widthToKeep;
	while (w > 0) {
		el.style.width = `${w}px`;
		if (el.offsetHeight !== h) break;
		w--;
	}

	if (w < el.scrollWidth) {
		el.style.width = `${el.scrollWidth}px`;
	} else {
		el.style.width = `${w + 1}px`;
	}
}

export function useShrinkToFit<T extends HTMLElement>() {
	const ref = useRef<T>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		adjustWidth(el);

		const observer = new ResizeObserver(() => adjustWidth(el));
		observer.observe(el.parentElement ?? document.body);

		return () => observer.disconnect();
	}, []);

	return ref;
}

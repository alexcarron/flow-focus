import { RefObject, useLayoutEffect, useState } from 'react';

let sharedMeasureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
	if (!sharedMeasureContext) {
		sharedMeasureContext = document.createElement('canvas').getContext('2d');
	}
	return sharedMeasureContext;
}

function getFontShorthand(element: HTMLElement): string {
	const computedStyle = getComputedStyle(element);
	return `${computedStyle.fontStyle} ${computedStyle.fontVariant} ${computedStyle.fontWeight} ${computedStyle.fontSize}/${computedStyle.lineHeight} ${computedStyle.fontFamily}`;
}

function measureTextWidth(text: string, font: string): number {
	const context = getMeasureContext();
	if (!context) return 0;
	context.font = font;
	return context.measureText(text).width;
}

function pickLongestFittingTier(tiersLongestFirst: string[], availableWidth: number, font: string): string {
	const fittingTier = tiersLongestFirst.find(
		tier => measureTextWidth(tier, font) <= availableWidth
	);
	return fittingTier ?? tiersLongestFirst[tiersLongestFirst.length - 1] ?? '';
}

export function useFittingPlaceholder(
	tiersLongestFirst: string[],
	elementRef: RefObject<HTMLElement>
): string {
	const [fittingPlaceholder, setFittingPlaceholder] = useState(tiersLongestFirst[0] ?? '');

	useLayoutEffect(() => {
		const element = elementRef.current;
		if (!element || tiersLongestFirst.length === 0) return;

		function recomputeFittingPlaceholder() {
			if (!element) return;
			const font = getFontShorthand(element);
			setFittingPlaceholder(pickLongestFittingTier(tiersLongestFirst, element.clientWidth, font));
		}

		recomputeFittingPlaceholder();
		const resizeObserver = new ResizeObserver(recomputeFittingPlaceholder);
		resizeObserver.observe(element);
		return () => resizeObserver.disconnect();
	}, [elementRef, tiersLongestFirst]);

	return fittingPlaceholder;
}

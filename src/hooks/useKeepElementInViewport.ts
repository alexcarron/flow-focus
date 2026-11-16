import { useLayoutEffect } from 'react';

const VIEWPORT_EDGE_MARGIN_PX = 8;

export function useKeepElementInViewport(
	ref: React.RefObject<HTMLElement | null>,
	isActive: boolean,
): void {
	useLayoutEffect(() => {
		if (!isActive) return;

		function moveElementIntoViewport() {
			const element = ref.current;
			if (!element) return;

			element.style.translate = '';
			const elementRectangle = element.getBoundingClientRect();
			const anchorRectangle = element.parentElement?.getBoundingClientRect();

			const maximumRight = window.innerWidth - VIEWPORT_EDGE_MARGIN_PX;
			const maximumBottom = window.innerHeight - VIEWPORT_EDGE_MARGIN_PX;

			let horizontalOffset = 0;
			if (elementRectangle.right > maximumRight) horizontalOffset = maximumRight - elementRectangle.right;
			if (elementRectangle.left + horizontalOffset < VIEWPORT_EDGE_MARGIN_PX) horizontalOffset = VIEWPORT_EDGE_MARGIN_PX - elementRectangle.left;

			let verticalOffset = 0;
			if (elementRectangle.bottom > maximumBottom) {
				const gapToAnchor = anchorRectangle ? elementRectangle.top - anchorRectangle.bottom : 0;
				const topWhenFlippedAboveAnchor = anchorRectangle ? anchorRectangle.top - gapToAnchor - elementRectangle.height : -Infinity;
				const doesFitAboveAnchor = topWhenFlippedAboveAnchor >= VIEWPORT_EDGE_MARGIN_PX;
				if (doesFitAboveAnchor) verticalOffset = topWhenFlippedAboveAnchor - elementRectangle.top;
				else verticalOffset = maximumBottom - elementRectangle.bottom;
			}
			if (elementRectangle.top + verticalOffset < VIEWPORT_EDGE_MARGIN_PX) verticalOffset = VIEWPORT_EDGE_MARGIN_PX - elementRectangle.top;

			if (horizontalOffset !== 0 || verticalOffset !== 0) {
				element.style.translate = `${horizontalOffset}px ${verticalOffset}px`;
			}
		}

		moveElementIntoViewport();
		window.addEventListener('resize', moveElementIntoViewport);
		window.addEventListener('scroll', moveElementIntoViewport, true);
		return () => {
			window.removeEventListener('resize', moveElementIntoViewport);
			window.removeEventListener('scroll', moveElementIntoViewport, true);
			if (ref.current) ref.current.style.translate = '';
		};
	}, [ref, isActive]);
}

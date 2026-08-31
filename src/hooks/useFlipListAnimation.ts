import { useLayoutEffect, useRef } from 'react';

export const ROW_REORDER_TRANSITION_MS = 150;

interface UseFlipListAnimationOptions {
	displayItemIDs: string[];
	excludeItemID: string | null;
	transitionMs?: number;
}

export function useFlipListAnimation({ displayItemIDs, excludeItemID, transitionMs = ROW_REORDER_TRANSITION_MS }: UseFlipListAnimationOptions) {
	const rowElementsByIDRef = useRef(new Map<string, HTMLElement>());
	const previousRowTopByIDRef = useRef(new Map<string, number>());
	const displayItemIDsKey = displayItemIDs.join(' ');

	useLayoutEffect(() => {
		const previousRowTopByID = previousRowTopByIDRef.current;
		const nextRowTopByID = new Map<string, number>();
		const rowElementsToAnimate: { rowElement: HTMLElement; deltaY: number }[] = [];

		for (const id of displayItemIDs) {
			const rowElement = rowElementsByIDRef.current.get(id);
			if (!rowElement) continue;
			rowElement.style.transition = 'none';
			rowElement.style.transform = '';
		}

		for (const id of displayItemIDs) {
			const rowElement = rowElementsByIDRef.current.get(id);
			if (!rowElement) continue;
			const currentTop = rowElement.getBoundingClientRect().top;
			nextRowTopByID.set(id, currentTop);

			if (id === excludeItemID) continue;
			const previousTop = previousRowTopByID.get(id);
			if (previousTop === undefined || previousTop === currentTop) continue;

			rowElementsToAnimate.push({ rowElement, deltaY: previousTop - currentTop });
		}

		for (const { rowElement, deltaY } of rowElementsToAnimate) {
			rowElement.style.transform = `translateY(${deltaY}px)`;
			rowElement.getBoundingClientRect();
			rowElement.style.transition = `transform ${transitionMs}ms ease`;
			rowElement.style.transform = '';
		}

		previousRowTopByIDRef.current = nextRowTopByID;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [displayItemIDsKey, excludeItemID]);

	function registerRowElement(id: string, element: HTMLElement | null) {
		if (element) rowElementsByIDRef.current.set(id, element);
		else rowElementsByIDRef.current.delete(id);
	}

	function getRowElement(id: string): HTMLElement | undefined {
		return rowElementsByIDRef.current.get(id);
	}

	return { registerRowElement, getRowElement };
}

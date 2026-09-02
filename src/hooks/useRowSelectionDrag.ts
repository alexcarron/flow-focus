import { useRef } from 'react';
import { usePressAndHold } from './usePressAndHold';

interface UseRowSelectionDragOptions {
	isRowSelected: (rowID: string) => boolean;
	setRowSelected: (rowID: string, isSelected: boolean) => void;
}

interface RowSelectionDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter: (event: React.MouseEvent) => void;
}

export function useRowSelectionDrag<TContainerElement extends HTMLElement = HTMLElement>({ isRowSelected, setRowSelected }: UseRowSelectionDragOptions) {
	const dragTargetSelectedStateRef = useRef<boolean | null>(null);
	const rowIDsAlreadyToggledInDragRef = useRef<Set<string>>(new Set());

	const isRowSelectedRef = useRef(isRowSelected);
	isRowSelectedRef.current = isRowSelected;
	const setRowSelectedRef = useRef(setRowSelected);
	setRowSelectedRef.current = setRowSelected;

	function applyDragToRow(rowID: string) {
		const dragTargetState = dragTargetSelectedStateRef.current;
		if (dragTargetState === null) return;
		if (rowIDsAlreadyToggledInDragRef.current.has(rowID)) return;
		rowIDsAlreadyToggledInDragRef.current.add(rowID);
		setRowSelectedRef.current(rowID, dragTargetState);
	}

	const { containerRef: rowsContainerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute: 'data-row-id',
		mouseHoldDelayMs: 0,
		onHoldStart: rowID => {
			const nextIsSelected = !isRowSelectedRef.current(rowID);
			dragTargetSelectedStateRef.current = nextIsSelected;
			rowIDsAlreadyToggledInDragRef.current = new Set([rowID]);
			setRowSelectedRef.current(rowID, nextIsSelected);
		},
		onPointerOverItem: rowID => applyDragToRow(rowID),
		onHoldEnd: () => {
			dragTargetSelectedStateRef.current = null;
			rowIDsAlreadyToggledInDragRef.current = new Set();
		},
	});

	function getRowSelectionDragHandlers(rowID: string): RowSelectionDragHandlers {
		const pressHandlers = getPressHandlers(rowID);
		return {
			onMouseDown: pressHandlers.onMouseDown,
			onMouseEnter: pressHandlers.onMouseEnter,
		};
	}

	return { rowsContainerRef, getRowSelectionDragHandlers };
}

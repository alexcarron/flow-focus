import { useRef, useState } from 'react';
import ChecklistItem from '../model/checklist/ChecklistItem';
import { FlattenedChecklistItem, flattenForDisplay, getSiblings, getSubtreeIDsIncludingSelf } from '../model/checklist/checklistTree';
import { usePressAndHold } from './usePressAndHold';
import { useFlipListAnimation } from './useFlipListAnimation';

const CHECKLIST_REORDER_HOLD_DELAY_MS = 200;
const NEST_UNDER_HOVERED_DRAG_THRESHOLD_PX = 32;
const PLACEHOLDER_ROW_ID = '__checklist-drop-placeholder__';

interface DropTarget {
	parentID: string | null;
	index: number;
}

interface UseChecklistReorderDragOptions {
	items: ChecklistItem[];
	onReorder: (draggedItemID: string, newParentID: string | null, newIndexAmongSiblings: number) => void;
}

interface RowDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
}

export type ChecklistDisplayRow =
	| { kind: 'item'; item: ChecklistItem; depth: number }
	| { kind: 'placeholder'; depth: number; height: number };

export function getDraggingRowOverlayStyle(draggingRowRect: DOMRect, dragOffsetY: number): React.CSSProperties {
	return {
		position: 'fixed',
		top: draggingRowRect.top + dragOffsetY,
		left: draggingRowRect.left,
		width: draggingRowRect.width,
		height: draggingRowRect.height,
		zIndex: 50,
		pointerEvents: 'none',
	};
}

function findSubtreeEndIndex(list: FlattenedChecklistItem[], startIndex: number): number {
	const startDepth = list[startIndex].depth;
	let i = startIndex + 1;
	while (i < list.length && list[i].depth > startDepth) i++;
	return i;
}

function computeInsertionPointInVisibleList(visibleFlattened: FlattenedChecklistItem[], dropTarget: DropTarget): number {
	const { parentID, index } = dropTarget;

	const siblingsInVisibleList = visibleFlattened.filter(flattened => flattened.parentID === parentID);
	if (index < siblingsInVisibleList.length) {
		const targetSibling = siblingsInVisibleList[index];
		return visibleFlattened.findIndex(flattened => flattened.item.id === targetSibling.item.id);
	}

	if (parentID === null) return visibleFlattened.length;

	const parentAbsoluteIndex = visibleFlattened.findIndex(flattened => flattened.item.id === parentID);
	if (parentAbsoluteIndex === -1) return visibleFlattened.length;
	if (siblingsInVisibleList.length === 0) return parentAbsoluteIndex + 1;

	const lastSibling = siblingsInVisibleList[siblingsInVisibleList.length - 1];
	const lastSiblingAbsoluteIndex = visibleFlattened.findIndex(flattened => flattened.item.id === lastSibling.item.id);
	return findSubtreeEndIndex(visibleFlattened, lastSiblingAbsoluteIndex);
}

export function useChecklistReorderDrag<TContainerElement extends HTMLElement = HTMLDivElement>({ items, onReorder }: UseChecklistReorderDragOptions) {
	const [draggingItemID, setDraggingItemID] = useState<string | null>(null);
	const [dragOffsetX, setDragOffsetX] = useState(0);
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
	const [draggingRowRect, setDraggingRowRect] = useState<DOMRect | null>(null);
	const [draggingSubtreeHeight, setDraggingSubtreeHeight] = useState(0);
	const dragStartClientRef = useRef({ x: 0, y: 0 });
	const rowElementsByItemIDRef = useRef(new Map<string, HTMLElement>());

	const fullFlattened = flattenForDisplay(items);
	const draggedSubtreeIDs = draggingItemID !== null ? getSubtreeIDsIncludingSelf(items, draggingItemID) : new Set<string>();
	const visibleFlattened = fullFlattened.filter(flattened => !draggedSubtreeIDs.has(flattened.item.id));
	const draggingItemDepth = draggingItemID !== null ? fullFlattened.find(flattened => flattened.item.id === draggingItemID)?.depth ?? 0 : 0;

	const targetDepth = dropTarget === null
		? 0
		: dropTarget.parentID === null
			? 0
			: (fullFlattened.find(flattened => flattened.item.id === dropTarget.parentID)?.depth ?? 0) + 1;

	const displayRows: ChecklistDisplayRow[] = draggingItemID !== null && dropTarget !== null
		? (() => {
			const insertionPoint = computeInsertionPointInVisibleList(visibleFlattened, dropTarget);
			const rows: ChecklistDisplayRow[] = visibleFlattened.map(flattened => ({ kind: 'item', item: flattened.item, depth: flattened.depth }));
			rows.splice(insertionPoint, 0, { kind: 'placeholder', depth: targetDepth, height: draggingSubtreeHeight });
			return rows;
		})()
		: visibleFlattened.map(flattened => ({ kind: 'item', item: flattened.item, depth: flattened.depth }));

	const displayRowKeys = displayRows.map(row => row.kind === 'item' ? row.item.id : PLACEHOLDER_ROW_ID);

	const { registerRowElement } = useFlipListAnimation({
		displayItemIDs: displayRowKeys,
		excludeItemID: null,
	});

	const { containerRef: itemsContainerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute: 'data-checklist-row',
		excludeSelector: '[data-checklist-checkbox]',
		mouseHoldDelayMs: CHECKLIST_REORDER_HOLD_DELAY_MS,
		touchHoldDelayMs: CHECKLIST_REORDER_HOLD_DELAY_MS,
		onHoldStart: (itemID, startClientX, startClientY) => {
			const rowElement = rowElementsByItemIDRef.current.get(itemID);
			setDraggingItemID(itemID);
			setDraggingRowRect(rowElement?.getBoundingClientRect() ?? null);
			dragStartClientRef.current = { x: startClientX, y: startClientY };
			setDragOffsetX(0);
			setDragOffsetY(0);

			const subtreeIDs = getSubtreeIDsIncludingSelf(items, itemID);
			let subtreeTop = Number.POSITIVE_INFINITY;
			let subtreeBottom = Number.NEGATIVE_INFINITY;
			subtreeIDs.forEach(subtreeItemID => {
				const element = rowElementsByItemIDRef.current.get(subtreeItemID);
				if (!element) return;
				const rect = element.getBoundingClientRect();
				subtreeTop = Math.min(subtreeTop, rect.top);
				subtreeBottom = Math.max(subtreeBottom, rect.bottom);
			});
			setDraggingSubtreeHeight(subtreeBottom > subtreeTop ? subtreeBottom - subtreeTop : rowElement?.getBoundingClientRect().height ?? 0);

			const flattened = fullFlattened.find(flattened => flattened.item.id === itemID);
			if (flattened) {
				const siblings = getSiblings(items, flattened.parentID).filter(sibling => sibling.id !== itemID);
				const currentIndex = getSiblings(items, flattened.parentID).findIndex(sibling => sibling.id === itemID);
				setDropTarget({ parentID: flattened.parentID, index: Math.min(currentIndex, siblings.length) });
			}

			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'grabbing';
			window.getSelection()?.removeAllRanges();
		},
		onHoldMove: (clientX, clientY) => {
			setDragOffsetX(clientX - dragStartClientRef.current.x);
			setDragOffsetY(clientY - dragStartClientRef.current.y);
		},
		onPointerOverItem: (hoveredItemID, hoveredRect, clientY) => {
			if (draggingItemID === null || hoveredItemID === draggingItemID) return;
			const hovered = visibleFlattened.find(flattened => flattened.item.id === hoveredItemID);
			if (!hovered) return;

			const isBeforeMidpoint = clientY < hoveredRect.top + hoveredRect.height / 2;
			const wantsNestUnderHovered = dragOffsetX > NEST_UNDER_HOVERED_DRAG_THRESHOLD_PX && !isBeforeMidpoint;

			if (wantsNestUnderHovered) {
				setDropTarget({ parentID: hovered.item.id, index: hovered.item.children.length });
				return;
			}

			const siblingsExcludingDragged = getSiblings(items, hovered.parentID).filter(sibling => sibling.id !== draggingItemID);
			const hoveredIndex = siblingsExcludingDragged.findIndex(sibling => sibling.id === hovered.item.id);
			const insertionIndex = isBeforeMidpoint ? hoveredIndex : hoveredIndex + 1;
			setDropTarget({ parentID: hovered.parentID, index: insertionIndex });
		},
		onHoldEnd: () => {
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			if (draggingItemID !== null && dropTarget !== null) {
				onReorder(draggingItemID, dropTarget.parentID, dropTarget.index);
			}
			setDraggingItemID(null);
			setDropTarget(null);
			setDraggingRowRect(null);
			setDragOffsetX(0);
			setDragOffsetY(0);
			setDraggingSubtreeHeight(0);
		},
	});

	function registerRowElementAndTrack(itemID: string, element: HTMLElement | null) {
		if (element) rowElementsByItemIDRef.current.set(itemID, element);
		else rowElementsByItemIDRef.current.delete(itemID);
		registerRowElement(itemID, element);
	}

	function getRowDragHandlers(itemID: string): RowDragHandlers {
		return { onMouseDown: getPressHandlers(itemID).onMouseDown };
	}

	return {
		itemsContainerRef,
		getRowDragHandlers,
		registerRowElement: registerRowElementAndTrack,
		registerPlaceholderElement: (element: HTMLElement | null) => registerRowElement(PLACEHOLDER_ROW_ID, element),
		draggingItemID,
		draggingItemDepth,
		displayRows,
		dragOffsetY,
		draggingRowRect,
	};
}

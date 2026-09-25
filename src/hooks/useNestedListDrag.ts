import { useRef, useState } from 'react';
import { OrderedTreeNode, FlattenedTreeNode, flattenForDisplay, getSubtreeIDsIncludingSelf } from '../utilities/tree/orderedTree';
import { usePressAndHold } from './usePressAndHold';
import { useFlipListAnimation } from './useFlipListAnimation';

const PLACEHOLDER_ROW_ID = '__nested-list-drop-placeholder__';

interface DropProjection {
	parentID: string | null;
	index: number;
	depth: number;
}

interface UseNestedListDragOptions<TNode extends OrderedTreeNode<TNode>> {
	items: TNode[];
	rowAttribute: string;
	dragExcludeSelector: string;
	indentWidthPx: number;
	holdDelayMs: number;
	onBeforeHoldStart?: () => void;
	onReorder: (draggedItemID: string, newParentID: string | null, newIndexAmongSiblings: number) => void;
}

interface RowDragHandlers {
	onMouseDown: (event: React.MouseEvent) => void;
}

interface PlaceholderDisplayRow {
	kind: 'placeholder';
	depth: number;
	height: number;
}

export type NestedListDisplayRow<TNode extends OrderedTreeNode<TNode>> =
	| { kind: 'item'; node: TNode; depth: number; isHiddenDuringDrag: boolean }
	| PlaceholderDisplayRow;

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

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(maximum, value));
}

function computeDropProjection<TNode extends OrderedTreeNode<TNode>>(visibleFlattened: FlattenedTreeNode<TNode>[], insertionListIndex: number, desiredDepth: number): DropProjection {
	const previousItem = visibleFlattened[insertionListIndex - 1];
	const nextItem = visibleFlattened[insertionListIndex];
	const maximumDepth = previousItem ? previousItem.depth + 1 : 0;
	const minimumDepth = nextItem ? nextItem.depth : 0;
	const depth = clamp(desiredDepth, minimumDepth, maximumDepth);

	let parentID: string | null = null;
	if (depth > 0) {
		for (let i = insertionListIndex - 1; i >= 0; i--) {
			if (visibleFlattened[i].depth === depth - 1) {
				parentID = visibleFlattened[i].node.id;
				break;
			}
		}
	}

	let index = 0;
	for (let i = 0; i < insertionListIndex; i++) {
		if (visibleFlattened[i].parentID === parentID) index++;
	}

	return { parentID, index, depth };
}

interface PlaceholderInsertion {
	insertionListIndex: number;
	row: PlaceholderDisplayRow;
}

function buildDisplayRowsKeepingDraggedSubtreeMounted<TNode extends OrderedTreeNode<TNode>>({ fullFlattened, draggedSubtreeIDs, placeholder }: { fullFlattened: FlattenedTreeNode<TNode>[]; draggedSubtreeIDs: Set<string>; placeholder: PlaceholderInsertion | null }): NestedListDisplayRow<TNode>[] {
	const rows: NestedListDisplayRow<TNode>[] = [];
	let visibleRowCount = 0;

	for (const flattened of fullFlattened) {
		const isHiddenDuringDrag = draggedSubtreeIDs.has(flattened.node.id);
		if (!isHiddenDuringDrag) {
			if (placeholder !== null && visibleRowCount === placeholder.insertionListIndex) rows.push(placeholder.row);
			visibleRowCount++;
		}
		rows.push({ kind: 'item', node: flattened.node, depth: flattened.depth, isHiddenDuringDrag });
	}

	if (placeholder !== null && visibleRowCount === placeholder.insertionListIndex) rows.push(placeholder.row);
	return rows;
}

export function useNestedListDrag<TNode extends OrderedTreeNode<TNode>, TContainerElement extends HTMLElement = HTMLDivElement>({ items, rowAttribute, dragExcludeSelector, indentWidthPx, holdDelayMs, onBeforeHoldStart, onReorder }: UseNestedListDragOptions<TNode>) {
	const [draggingItemID, setDraggingItemID] = useState<string | null>(null);
	const [dragOffsetX, setDragOffsetX] = useState(0);
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const [insertionListIndex, setInsertionListIndex] = useState<number | null>(null);
	const [draggingRowRect, setDraggingRowRect] = useState<DOMRect | null>(null);
	const [draggingSubtreeHeight, setDraggingSubtreeHeight] = useState(0);
	const [draggingItemStartDepth, setDraggingItemStartDepth] = useState(0);
	const dragStartClientRef = useRef({ x: 0, y: 0 });
	const rowElementsByItemIDRef = useRef(new Map<string, HTMLElement>());

	const fullFlattened = flattenForDisplay(items);
	const draggedSubtreeIDs = draggingItemID !== null ? getSubtreeIDsIncludingSelf(items, draggingItemID) : new Set<string>();
	const visibleFlattened = fullFlattened.filter(flattened => !draggedSubtreeIDs.has(flattened.node.id));

	const projection = draggingItemID !== null && insertionListIndex !== null
		? computeDropProjection(visibleFlattened, insertionListIndex, draggingItemStartDepth + Math.round(dragOffsetX / indentWidthPx))
		: null;

	const displayRows = buildDisplayRowsKeepingDraggedSubtreeMounted({
		fullFlattened,
		draggedSubtreeIDs,
		placeholder: projection !== null && insertionListIndex !== null
			? { insertionListIndex, row: { kind: 'placeholder', depth: projection.depth, height: draggingSubtreeHeight } }
			: null,
	});

	const displayRowKeys = displayRows.map(row => row.kind === 'item' ? row.node.id : PLACEHOLDER_ROW_ID);

	const { registerRowElement } = useFlipListAnimation({
		displayItemIDs: displayRowKeys,
		excludeItemIDs: draggedSubtreeIDs,
	});

	const { containerRef, getPressHandlers } = usePressAndHold<TContainerElement>({
		itemAttribute: rowAttribute,
		excludeSelector: dragExcludeSelector,
		mouseHoldDelayMs: holdDelayMs,
		touchHoldDelayMs: holdDelayMs,
		onHoldStart: (itemID, startClientX, startClientY) => {
			onBeforeHoldStart?.();
			(document.activeElement as HTMLElement | null)?.blur();

			const rowElement = rowElementsByItemIDRef.current.get(itemID);
			setDraggingItemID(itemID);
			setDraggingRowRect(rowElement?.getBoundingClientRect() ?? null);
			dragStartClientRef.current = { x: startClientX, y: startClientY };
			setDragOffsetX(0);
			setDragOffsetY(0);

			const flattened = fullFlattened.find(candidate => candidate.node.id === itemID);
			setDraggingItemStartDepth(flattened?.depth ?? 0);
			const visibleItemsBefore = fullFlattened
				.slice(0, fullFlattened.findIndex(candidate => candidate.node.id === itemID))
				.filter(candidate => !getSubtreeIDsIncludingSelf(items, itemID).has(candidate.node.id))
				.length;
			setInsertionListIndex(visibleItemsBefore);

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
			const hoveredIndexInVisible = visibleFlattened.findIndex(flattened => flattened.node.id === hoveredItemID);
			if (hoveredIndexInVisible === -1) return;
			const isBeforeMidpoint = clientY < hoveredRect.top + hoveredRect.height / 2;
			setInsertionListIndex(isBeforeMidpoint ? hoveredIndexInVisible : hoveredIndexInVisible + 1);
		},
		onHoldEnd: () => {
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			if (draggingItemID !== null && projection !== null) {
				onReorder(draggingItemID, projection.parentID, projection.index);
			}
			setDraggingItemID(null);
			setInsertionListIndex(null);
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
		containerRef,
		getRowDragHandlers,
		registerRowElement: registerRowElementAndTrack,
		registerPlaceholderElement: (element: HTMLElement | null) => registerRowElement(PLACEHOLDER_ROW_ID, element),
		draggingItemID,
		draggingItemDepth: projection?.depth ?? draggingItemStartDepth,
		displayRows,
		dragOffsetY,
		draggingRowRect,
	};
}

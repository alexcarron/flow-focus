import { useEffect, useRef, useState } from 'react';
import { useQuickToDoChecklistStore } from '../stores/quickToDoChecklistStore';
import { useNestedListDrag, getDraggingRowOverlayStyle } from '../hooks/useNestedListDrag';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import { useStepSwipeIndent } from '../hooks/useStepSwipeIndent';
import { useCommitOnEnter } from '../hooks/useCommitOnEnter';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import { findItemWithParent, hasAnyCheckedItem } from '../model/quickToDoChecklist/quickToDoChecklistTree';
import parsePastedTextIntoListItems from '../utilities/parsePastedTextIntoListItems';
import { mergeRefs } from '../utilities/mergeRefs';
import { SHORTCUTS, getShortcutKeyParts } from '../utilities/shortcuts';
import QuickToDoChecklistItemRow from './QuickToDoChecklistItemRow';
import ContextMenu from './context-menu/ContextMenu';
import ConfirmModal from './ConfirmModal';
import FieldDescription from './inputs/FieldDescription';
import styles from './QuickToDoChecklistSection.module.css';

function focusElementAtEnd(element: HTMLElement) {
	element.focus();
	const range = document.createRange();
	range.selectNodeContents(element);
	range.collapse(false);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

export default function QuickToDoChecklistSection() {
	const items = useQuickToDoChecklistStore(s => s.items);
	const isLoaded = useQuickToDoChecklistStore(s => s.isLoaded);
	const loadQuickToDoChecklist = useQuickToDoChecklistStore(s => s.loadQuickToDoChecklist);
	const addTopLevelItem = useQuickToDoChecklistStore(s => s.addTopLevelItem);
	const insertItemBeforeOrAfter = useQuickToDoChecklistStore(s => s.insertItemBeforeOrAfter);
	const editItemText = useQuickToDoChecklistStore(s => s.editItemText);
	const setItemChecked = useQuickToDoChecklistStore(s => s.setItemChecked);
	const checkItemAndPrecedingItems = useQuickToDoChecklistStore(s => s.checkItemAndPrecedingItems);
	const uncheckItemAndFollowingItems = useQuickToDoChecklistStore(s => s.uncheckItemAndFollowingItems);
	const insertItemsFromPastedLines = useQuickToDoChecklistStore(s => s.insertItemsFromPastedLines);
	const deleteItem = useQuickToDoChecklistStore(s => s.deleteItem);
	const deleteCheckedItems = useQuickToDoChecklistStore(s => s.deleteCheckedItems);
	const indentItem = useQuickToDoChecklistStore(s => s.indentItem);
	const unindentItem = useQuickToDoChecklistStore(s => s.unindentItem);
	const moveItemUp = useQuickToDoChecklistStore(s => s.moveItemUp);
	const moveItemDown = useQuickToDoChecklistStore(s => s.moveItemDown);
	const reparentAndReorderItem = useQuickToDoChecklistStore(s => s.reparentAndReorderItem);

	const [newItemText, setNewItemText] = useState('');
	const [itemPendingFocusID, setItemPendingFocusID] = useState<string | null>(null);
	const [itemContextMenu, setItemContextMenu] = useState<{ itemID: string; x: number; y: number } | null>(null);
	const [isDeleteCheckedConfirmOpen, setIsDeleteCheckedConfirmOpen] = useState(false);
	const textElementsByItemIDRef = useRef(new Map<string, HTMLSpanElement>());
	const isTouchDevice = useIsTouchDevice();

	const {
		containerRef: reorderDragContainerRef,
		getRowDragHandlers,
		registerRowElement,
		registerPlaceholderElement,
		draggingItemID,
		draggingItemDepth,
		displayRows,
		dragOffsetY,
		draggingRowRect,
	} = useNestedListDrag({
		items,
		rowAttribute: 'data-quick-to-do-checklist-row',
		dragExcludeSelector: '[data-quick-to-do-checklist-checkbox], button',
		indentWidthPx: 24,
		holdDelayMs: 200,
		onReorder: reparentAndReorderItem,
	});

	const { stepsContainerRef: checkboxDragContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag({
		itemAttribute: 'data-quick-to-do-checklist-checkbox',
		isStepChecked: itemID => findItemWithParent(items, itemID)?.item.isChecked ?? false,
		setStepChecked: (itemID, isChecked) => setItemChecked(itemID, isChecked),
	});

	const { getSwipeHandlers, swipingItemID: swipingChecklistItemID, swipeOffsetX } = useStepSwipeIndent({
		isEnabled: isTouchDevice,
		onIndent: itemID => indentItem(itemID),
		onUnindent: itemID => unindentItem(itemID),
	});

	useEffect(() => {
		loadQuickToDoChecklist();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const insertItemOnEnterRef = useCommitOnEnter<HTMLDivElement>({
		targetSelector: '[data-quick-to-do-checklist-row] [contenteditable]',
		onEnter: textElement => {
			const itemID = textElement.closest('[data-quick-to-do-checklist-row]')?.getAttribute('data-quick-to-do-checklist-row') ?? null;
			if (itemID === null) return;
			const item = findItemWithParent(items, itemID)?.item;
			if (!item) return;
			const typedText = textElement.textContent ?? '';
			if (typedText !== item.text) editItemText(itemID, typedText);
			setItemPendingFocusID(insertItemBeforeOrAfter(itemID, 'after'));
		},
	});

	useEffect(() => {
		if (itemPendingFocusID === null) return;
		const textElement = textElementsByItemIDRef.current.get(itemPendingFocusID);
		if (textElement) {
			focusElementAtEnd(textElement);
			setItemPendingFocusID(null);
		}
	}, [itemPendingFocusID, items]);

	const allItemsTextKey = displayRows.map(row => row.kind === 'item' ? `${row.node.id}:${row.node.text}` : '').join(' ');
	useEffect(() => {
		displayRows.forEach(row => {
			if (row.kind !== 'item') return;
			const textElement = textElementsByItemIDRef.current.get(row.node.id);
			if (textElement && textElement.textContent !== row.node.text) {
				textElement.textContent = row.node.text;
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allItemsTextKey]);

	function onAddItemSubmit(event: React.FormEvent) {
		event.preventDefault();
		const text = newItemText.trim();
		if (!text) return;
		addTopLevelItem(text);
		setNewItemText('');
	}

	function onAddItemInputPaste(event: React.ClipboardEvent<HTMLInputElement>) {
		event.preventDefault();
		const pastedText = event.clipboardData.getData('text');
		const lines = parsePastedTextIntoListItems(pastedText);
		if (lines.length === 0) return;

		if (lines.length === 1) {
			const input = event.currentTarget;
			const selectionStart = input.selectionStart ?? newItemText.length;
			const selectionEnd = input.selectionEnd ?? newItemText.length;
			setNewItemText(newItemText.slice(0, selectionStart) + lines[0] + newItemText.slice(selectionEnd));
			return;
		}

		const newItemIDs = lines.map(line => addTopLevelItem(line));
		setNewItemText('');
		const lastNewItemID = newItemIDs[newItemIDs.length - 1];
		if (lastNewItemID) setItemPendingFocusID(lastNewItemID);
	}

	function onItemToggle(itemID: string, isChecked: boolean, isShiftClick: boolean) {
		if (isShiftClick) {
			if (isChecked) checkItemAndPrecedingItems(itemID);
			else uncheckItemAndFollowingItems(itemID);
		}
		else {
			setItemChecked(itemID, isChecked);
		}
	}

	function onBackspaceDeleteItem(itemID: string) {
		const itemRows = displayRows.filter(row => row.kind === 'item');
		const rowIndex = itemRows.findIndex(row => row.kind === 'item' && row.node.id === itemID);
		const previousRow = rowIndex > 0 ? itemRows[rowIndex - 1] : null;
		const previousItemID = previousRow !== null && previousRow.kind === 'item' ? previousRow.node.id : null;
		deleteItem(itemID);
		if (previousItemID) setItemPendingFocusID(previousItemID);
	}

	const draggingItem = draggingItemID !== null ? findItemWithParent(items, draggingItemID)?.item ?? null : null;

	return (
		<div className={styles.section}>
			<div className={styles.headingRow}>
				<h2 className={styles.heading}>Quick To Do Checklist</h2>
				{items.length === 0 && (
					<FieldDescription text="A simple to-do list, separate from your FlowFocus tasks. Use it to jot down things you want to remember or get to without interrupting the task you're focused on." />
				)}
			</div>

			{isLoaded && items.length === 0 && (
				<p className={styles.emptyHint}>No to-do items here yet.</p>
			)}

			<div ref={mergeRefs(reorderDragContainerRef, checkboxDragContainerRef, insertItemOnEnterRef)} className={draggingItemID !== null ? `${styles.list} ${styles.listDragging}` : styles.list}>
				{displayRows.map(row => {
					if (row.kind === 'placeholder') {
						return (
							<div
								key="placeholder"
								ref={registerPlaceholderElement}
								className={`${styles.row} ${styles.rowPlaceholder}`}
								style={{ paddingLeft: `calc(${row.depth} * var(--space-large))`, height: row.height || undefined }}
							/>
						);
					}

					const item = row.node;
					return (
						<QuickToDoChecklistItemRow
							key={item.id}
							item={item}
							depth={row.depth}
							isHiddenDuringDrag={row.isHiddenDuringDrag}
							isTouchDevice={isTouchDevice}
							rowDragHandlers={getRowDragHandlers(item.id)}
							rowSwipeHandlers={getSwipeHandlers(item.id)}
							isSwiping={swipingChecklistItemID === item.id}
							swipeOffsetX={swipeOffsetX}
							checkboxDragHandlers={getCheckboxDragHandlers(item.id)}
							registerRowElement={element => registerRowElement(item.id, element)}
							registerTextElement={element => {
								if (element) textElementsByItemIDRef.current.set(item.id, element);
								else textElementsByItemIDRef.current.delete(item.id);
							}}
							onToggle={(isChecked, isShiftClick) => onItemToggle(item.id, isChecked, isShiftClick)}
							onTextBlur={text => {
								if (text !== item.text) editItemText(item.id, text);
							}}
							onInsertBefore={typedText => {
								if (typedText !== item.text) editItemText(item.id, typedText);
								setItemPendingFocusID(insertItemBeforeOrAfter(item.id, 'before'));
							}}
							onInsertAfter={typedText => {
								if (typedText !== item.text) editItemText(item.id, typedText);
								setItemPendingFocusID(insertItemBeforeOrAfter(item.id, 'after'));
							}}
							onPasteLines={lines => {
								const newItemIDs = insertItemsFromPastedLines(item.id, lines);
								const lastNewItemID = newItemIDs[newItemIDs.length - 1];
								if (lastNewItemID) setItemPendingFocusID(lastNewItemID);
							}}
							onIndent={() => indentItem(item.id)}
							onUnindent={() => unindentItem(item.id)}
							onMoveUp={() => moveItemUp(item.id)}
							onMoveDown={() => moveItemDown(item.id)}
							onDelete={() => deleteItem(item.id)}
							onBackspaceDelete={() => onBackspaceDeleteItem(item.id)}
							onContextMenu={(x, y) => setItemContextMenu({ itemID: item.id, x, y })}
						/>
					);
				})}

				{draggingItemID !== null && draggingItem !== null && draggingRowRect !== null && (
					<div
						className={`${styles.row} ${styles.rowElevated}`}
						style={{ ...getDraggingRowOverlayStyle(draggingRowRect, dragOffsetY), paddingLeft: `calc(${draggingItemDepth} * var(--space-large))` }}
					>
						<div className={draggingItem.isChecked ? `${styles.checkbox} ${styles.checkboxChecked}` : styles.checkbox} />
						<span className={styles.itemText}>{draggingItem.text}</span>
					</div>
				)}
			</div>

			<form onSubmit={onAddItemSubmit} className={styles.addItemForm}>
				<input
					type="text"
					value={newItemText}
					onChange={event => setNewItemText(event.target.value)}
					onPaste={onAddItemInputPaste}
					placeholder="Add a to-do item..."
					enterKeyHint="done"
					className={`field ${styles.addItemInput}`}
				/>
				<button type="submit" className="button primary">Add</button>
				{hasAnyCheckedItem(items) && (
					<button
						type="button"
						className="button danger"
						onClick={() => setIsDeleteCheckedConfirmOpen(true)}
					>
						Delete Checked
					</button>
				)}
			</form>

			<ConfirmModal
				headingText="Delete checked items?"
				descriptionText="All checked to-do items will be permanently deleted. This cannot be undone."
				confirmButtonLabel="Delete"
				isOpen={isDeleteCheckedConfirmOpen}
				onClose={() => setIsDeleteCheckedConfirmOpen(false)}
				onConfirm={() => {
					deleteCheckedItems();
					setIsDeleteCheckedConfirmOpen(false);
				}}
			/>

			<ContextMenu
				position={itemContextMenu !== null ? { x: itemContextMenu.x, y: itemContextMenu.y } : null}
				onClose={() => setItemContextMenu(null)}
				items={itemContextMenu !== null ? [
					{ label: 'Move up', hintKeys: getShortcutKeyParts(SHORTCUTS.quickToDoChecklistReorder.moveUp), hintGesture: 'Hold & drag', onClick: () => moveItemUp(itemContextMenu.itemID) },
					{ label: 'Move down', hintKeys: getShortcutKeyParts(SHORTCUTS.quickToDoChecklistReorder.moveDown), hintGesture: 'Hold & drag', onClick: () => moveItemDown(itemContextMenu.itemID) },
					{ label: 'Indent', hintKeys: getShortcutKeyParts(SHORTCUTS.quickToDoChecklistIndent.indent[0]), hintGesture: 'Swipe right', onClick: () => indentItem(itemContextMenu.itemID) },
					{ label: 'Unindent', hintKeys: getShortcutKeyParts(SHORTCUTS.quickToDoChecklistIndent.unindent[0]), hintGesture: 'Swipe left', onClick: () => unindentItem(itemContextMenu.itemID) },
					{ label: 'Add item above', hintKeys: getShortcutKeyParts(SHORTCUTS.quickToDoChecklistInsert.insertBefore), onClick: () => setItemPendingFocusID(insertItemBeforeOrAfter(itemContextMenu.itemID, 'before')) },
					{ label: 'Add item below', hintKeys: getShortcutKeyParts(SHORTCUTS.quickToDoChecklistInsert.insertAfter), onClick: () => setItemPendingFocusID(insertItemBeforeOrAfter(itemContextMenu.itemID, 'after')) },
					{ label: 'Delete', isDanger: true, hintKeys: ['Delete'], onClick: () => deleteItem(itemContextMenu.itemID) },
				] : []}
			/>
		</div>
	);
}

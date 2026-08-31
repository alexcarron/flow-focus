import { useEffect, useRef, useState } from 'react';
import { useChecklistStore } from '../stores/checklistStore';
import { useChecklistReorderDrag, getDraggingRowOverlayStyle } from '../hooks/useChecklistReorderDrag';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import { findItemWithParent, hasAnyCheckedItem } from '../model/checklist/checklistTree';
import parsePastedTextIntoListItems from '../utils/parsePastedTextIntoListItems';
import { mergeRefs } from '../utils/mergeRefs';
import { SHORTCUTS, getShortcutKeyParts } from '../config/shortcuts';
import ChecklistItemRow from './ChecklistItemRow';
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
	const items = useChecklistStore(s => s.items);
	const isLoaded = useChecklistStore(s => s.isLoaded);
	const loadChecklist = useChecklistStore(s => s.loadChecklist);
	const addTopLevelItem = useChecklistStore(s => s.addTopLevelItem);
	const insertItemBeforeOrAfter = useChecklistStore(s => s.insertItemBeforeOrAfter);
	const editItemText = useChecklistStore(s => s.editItemText);
	const setItemChecked = useChecklistStore(s => s.setItemChecked);
	const checkItemAndPrecedingItems = useChecklistStore(s => s.checkItemAndPrecedingItems);
	const uncheckItemAndFollowingItems = useChecklistStore(s => s.uncheckItemAndFollowingItems);
	const insertItemsFromPastedLines = useChecklistStore(s => s.insertItemsFromPastedLines);
	const deleteItem = useChecklistStore(s => s.deleteItem);
	const deleteCheckedItems = useChecklistStore(s => s.deleteCheckedItems);
	const indentItem = useChecklistStore(s => s.indentItem);
	const unindentItem = useChecklistStore(s => s.unindentItem);
	const moveItemUp = useChecklistStore(s => s.moveItemUp);
	const moveItemDown = useChecklistStore(s => s.moveItemDown);
	const reparentAndReorderItem = useChecklistStore(s => s.reparentAndReorderItem);

	const [newItemText, setNewItemText] = useState('');
	const [itemPendingFocusID, setItemPendingFocusID] = useState<string | null>(null);
	const [itemContextMenu, setItemContextMenu] = useState<{ itemID: string; x: number; y: number } | null>(null);
	const [isDeleteCheckedConfirmOpen, setIsDeleteCheckedConfirmOpen] = useState(false);
	const textElementsByItemIDRef = useRef(new Map<string, HTMLSpanElement>());

	const {
		itemsContainerRef: reorderDragContainerRef,
		getRowDragHandlers,
		registerRowElement,
		registerPlaceholderElement,
		draggingItemID,
		draggingItemDepth,
		displayRows,
		dragOffsetY,
		draggingRowRect,
	} = useChecklistReorderDrag({
		items,
		onReorder: reparentAndReorderItem,
	});

	const { stepsContainerRef: checkboxDragContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag({
		itemAttribute: 'data-checklist-checkbox',
		isStepChecked: itemID => findItemWithParent(items, itemID)?.item.isChecked ?? false,
		setStepChecked: (itemID, isChecked) => setItemChecked(itemID, isChecked),
	});

	useEffect(() => {
		loadChecklist();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (itemPendingFocusID === null) return;
		const textElement = textElementsByItemIDRef.current.get(itemPendingFocusID);
		if (textElement) {
			focusElementAtEnd(textElement);
			setItemPendingFocusID(null);
		}
	}, [itemPendingFocusID, items]);

	const allItemsTextKey = displayRows.map(row => row.kind === 'item' ? `${row.item.id}:${row.item.text}` : '').join(' ');
	useEffect(() => {
		displayRows.forEach(row => {
			if (row.kind !== 'item') return;
			const textElement = textElementsByItemIDRef.current.get(row.item.id);
			if (textElement && textElement.textContent !== row.item.text) {
				textElement.textContent = row.item.text;
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [allItemsTextKey]);

	function onAddItemSubmit(event: React.FormEvent) {
		event.preventDefault();
		const text = newItemText.trim();
		if (!text) return;
		setItemPendingFocusID(addTopLevelItem(text));
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
		const rowIndex = itemRows.findIndex(row => row.item.id === itemID);
		const previousItemID = rowIndex > 0 ? itemRows[rowIndex - 1].item.id : null;
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

			<div ref={mergeRefs(reorderDragContainerRef, checkboxDragContainerRef)} className={draggingItemID !== null ? `${styles.list} ${styles.listDragging}` : styles.list}>
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

					const item = row.item;
					return (
						<ChecklistItemRow
							key={item.id}
							item={item}
							depth={row.depth}
							rowDragHandlers={getRowDragHandlers(item.id)}
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
					{ label: 'Move up', hintKeys: getShortcutKeyParts(SHORTCUTS.checklistReorder.moveUp), onClick: () => moveItemUp(itemContextMenu.itemID) },
					{ label: 'Move down', hintKeys: getShortcutKeyParts(SHORTCUTS.checklistReorder.moveDown), onClick: () => moveItemDown(itemContextMenu.itemID) },
					{ label: 'Indent', hintKeys: getShortcutKeyParts(SHORTCUTS.checklistIndent.indent), onClick: () => indentItem(itemContextMenu.itemID) },
					{ label: 'Unindent', hintKeys: getShortcutKeyParts(SHORTCUTS.checklistIndent.unindent), onClick: () => unindentItem(itemContextMenu.itemID) },
					{ label: 'Add item above', hintKeys: getShortcutKeyParts(SHORTCUTS.checklistInsert.insertBefore), onClick: () => setItemPendingFocusID(insertItemBeforeOrAfter(itemContextMenu.itemID, 'before')) },
					{ label: 'Add item below', hintKeys: getShortcutKeyParts(SHORTCUTS.checklistInsert.insertAfter), onClick: () => setItemPendingFocusID(insertItemBeforeOrAfter(itemContextMenu.itemID, 'after')) },
					{ label: 'Delete', isDanger: true, hintKeys: ['Delete'], onClick: () => deleteItem(itemContextMenu.itemID) },
				] : []}
			/>
		</div>
	);
}

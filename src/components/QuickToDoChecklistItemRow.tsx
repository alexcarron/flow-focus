import QuickToDoChecklistItem from '../model/quickToDoChecklist/QuickToDoChecklistItem';
import { SHORTCUTS, matchesShortcut, matchesShortcutIgnoringShift } from '../utilities/shortcuts';
import { usePlainTextContentEditable } from '../hooks/usePlainTextContentEditable';
import parsePastedTextIntoListItems from '../utilities/parsePastedTextIntoListItems';
import ContextMenuButton from './context-menu/ContextMenuButton';
import styles from './QuickToDoChecklistSection.module.css';

interface Props {
	item: QuickToDoChecklistItem;
	depth: number;
	isHiddenDuringDrag: boolean;
	isTouchDevice: boolean;
	rowDragHandlers: { onMouseDown: (event: React.MouseEvent) => void };
	rowSwipeHandlers: { onTouchStart: (event: React.TouchEvent) => void };
	isSwiping: boolean;
	swipeOffsetX: number;
	checkboxDragHandlers: { onMouseDown: (event: React.MouseEvent) => void; onMouseEnter: (event: React.MouseEvent) => void };
	registerRowElement: (element: HTMLElement | null) => void;
	registerTextElement: (element: HTMLSpanElement | null) => void;
	onToggle: (isChecked: boolean, isShiftClick: boolean) => void;
	onTextBlur: (text: string) => void;
	onInsertBefore: (typedText: string) => void;
	onInsertAfter: (typedText: string) => void;
	onPasteLines: (lines: string[]) => void;
	onIndent: () => void;
	onUnindent: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDelete: () => void;
	onBackspaceDelete: () => void;
	onContextMenu: (x: number, y: number) => void;
}

export default function QuickToDoChecklistItemRow({
	item,
	depth,
	isHiddenDuringDrag,
	isTouchDevice,
	rowDragHandlers,
	rowSwipeHandlers,
	isSwiping,
	swipeOffsetX,
	checkboxDragHandlers,
	registerRowElement,
	registerTextElement,
	onToggle,
	onTextBlur,
	onInsertBefore,
	onInsertAfter,
	onPasteLines,
	onIndent,
	onUnindent,
	onMoveUp,
	onMoveDown,
	onDelete,
	onBackspaceDelete,
	onContextMenu,
}: Props) {
	const { onKeyDown: onPlainTextKeyDown } = usePlainTextContentEditable();

	return (
		<div
			ref={registerRowElement}
			data-quick-to-do-checklist-row={item.id}
			className={isHiddenDuringDrag ? `${styles.row} ${styles.rowHiddenDuringDrag}` : styles.row}
			style={{
				paddingLeft: `calc(${depth} * var(--space-large))`,
				transform: isSwiping ? `translateX(${swipeOffsetX}px)` : undefined,
				transition: isSwiping ? 'none' : 'transform var(--transition-fast)',
			}}
			onMouseDown={rowDragHandlers.onMouseDown}
			onTouchStart={rowSwipeHandlers.onTouchStart}
			onContextMenu={event => {
				event.preventDefault();
				onContextMenu(event.clientX, event.clientY);
			}}
		>
			<div
				role="checkbox"
				aria-checked={item.isChecked}
				tabIndex={0}
				data-quick-to-do-checklist-checkbox={item.id}
				onMouseDown={event => {
					event.stopPropagation();
					checkboxDragHandlers.onMouseDown(event);
				}}
				onMouseEnter={checkboxDragHandlers.onMouseEnter}
				onClick={event => {
					if (event.shiftKey) onToggle(!item.isChecked, true);
				}}
				onKeyDown={event => {
					if (event.key === ' ' || event.key === 'Enter') {
						event.preventDefault();
						onToggle(!item.isChecked, event.shiftKey);
					}
				}}
				className={item.isChecked ? `touch-hit-area ${styles.checkbox} ${styles.checkboxChecked}` : `touch-hit-area ${styles.checkbox}`}
			>
				{item.isChecked && (
					<svg className={styles.checkmark} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				)}
			</div>

			<span
				ref={registerTextElement}
				contentEditable
				suppressContentEditableWarning
				spellCheck={false}
				onBlur={event => onTextBlur(event.currentTarget.textContent ?? '')}
				onPaste={event => {
					event.preventDefault();
					const pastedText = event.clipboardData.getData('text');
					const lines = parsePastedTextIntoListItems(pastedText);
					if (lines.length === 0) return;
					if (lines.length === 1) {
						document.execCommand('insertText', false, lines[0]);
						return;
					}
					onPasteLines(lines);
				}}
				onKeyDown={event => {
					onPlainTextKeyDown(event);
					if (matchesShortcutIgnoringShift(event, SHORTCUTS.quickToDoChecklistInsert.insertBefore)) {
						event.preventDefault();
						onInsertBefore(event.currentTarget.textContent ?? '');
					}
					else if (matchesShortcut(event, SHORTCUTS.quickToDoChecklistIndent.unindent)) {
						event.preventDefault();
						onUnindent();
					}
					else if (matchesShortcut(event, SHORTCUTS.quickToDoChecklistIndent.indent)) {
						event.preventDefault();
						onIndent();
					}
					else if (matchesShortcut(event, SHORTCUTS.quickToDoChecklistReorder.moveUp)) {
						event.preventDefault();
						onMoveUp();
					}
					else if (matchesShortcut(event, SHORTCUTS.quickToDoChecklistReorder.moveDown)) {
						event.preventDefault();
						onMoveDown();
					}
					else if (event.key === 'Delete') {
						event.preventDefault();
						event.stopPropagation();
						event.currentTarget.blur();
						onDelete();
					}
					else if (event.key === 'Backspace' && (event.currentTarget.textContent ?? '') === '') {
						event.preventDefault();
						onBackspaceDelete();
					}
				}}
				data-placeholder="New to-do"
				className={item.isChecked ? `${styles.itemText} ${styles.itemTextChecked}` : styles.itemText}
			/>

			{isTouchDevice && (
				<ContextMenuButton
					label="To-do item options"
					className={styles.itemMenuButton}
					onOpen={onContextMenu}
				/>
			)}
		</div>
	);
}

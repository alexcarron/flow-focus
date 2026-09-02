import ChecklistItem from '../model/checklist/ChecklistItem';
import { SHORTCUTS, matchesShortcut, matchesShortcutIgnoringShift } from '../config/shortcuts';
import parsePastedTextIntoListItems from '../utils/parsePastedTextIntoListItems';
import styles from './QuickToDoChecklistSection.module.css';

interface Props {
	item: ChecklistItem;
	depth: number;
	rowDragHandlers: { onMouseDown: (event: React.MouseEvent) => void };
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

export default function ChecklistItemRow({
	item,
	depth,
	rowDragHandlers,
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
	return (
		<div
			ref={registerRowElement}
			data-checklist-row={item.id}
			className={styles.row}
			style={{ paddingLeft: `calc(${depth} * var(--space-large))` }}
			onMouseDown={rowDragHandlers.onMouseDown}
			onContextMenu={event => {
				event.preventDefault();
				onContextMenu(event.clientX, event.clientY);
			}}
		>
			<div
				role="checkbox"
				aria-checked={item.isChecked}
				tabIndex={0}
				data-checklist-checkbox={item.id}
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
				className={item.isChecked ? `${styles.checkbox} ${styles.checkboxChecked}` : styles.checkbox}
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
					if (matchesShortcutIgnoringShift(event, SHORTCUTS.checklistInsert.insertBefore)) {
						event.preventDefault();
						onInsertBefore(event.currentTarget.textContent ?? '');
					}
					else if (matchesShortcut(event, SHORTCUTS.checklistInsert.insertAfter)) {
						event.preventDefault();
						onInsertAfter(event.currentTarget.textContent ?? '');
					}
					else if (matchesShortcut(event, SHORTCUTS.checklistIndent.unindent)) {
						event.preventDefault();
						onUnindent();
					}
					else if (matchesShortcut(event, SHORTCUTS.checklistIndent.indent)) {
						event.preventDefault();
						onIndent();
					}
					else if (matchesShortcut(event, SHORTCUTS.checklistReorder.moveUp)) {
						event.preventDefault();
						onMoveUp();
					}
					else if (matchesShortcut(event, SHORTCUTS.checklistReorder.moveDown)) {
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
		</div>
	);
}

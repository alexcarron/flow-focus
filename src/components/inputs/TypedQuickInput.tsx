import { useEffect, useMemo, useRef, useState } from 'react';
import Tag from '../../model/tag/Tag';
import { getTokenBecomeLabel, TypedQuickInputField, TypedQuickInputToken } from '../../model/typed-quick-input/TypedQuickInputToken';
import findActiveTagEntryAtCaret, { ActiveTagEntry } from '../../model/typed-quick-input/findActiveTagEntryAtCaret';
import { useFittingPlaceholder } from '../../hooks/useFittingPlaceholder';
import { usePlainTextContentEditable } from '../../hooks/usePlainTextContentEditable';
import InlineTagSuggestionPopover from '../InlineTagSuggestionPopover';
import styles from './TypedQuickInput.module.css';

interface Props {
	value: string;
	onChange: (value: string) => void;
	tokens: TypedQuickInputToken[];
	escapedTokens: TypedQuickInputToken[];
	onToggleTokenEscape: (field: TypedQuickInputField, matchedText: string, startIndex: number, endIndex: number) => void;
	demotedRange?: { start: number; end: number } | null;
	placeholderTiersLongestFirst?: string[];
	onSubmit?: () => void;
	onShiftEnter?: () => void;
	editorClassName?: string;
	disabled?: boolean;
	existingTagsSortedByUsage?: Tag[];
	alreadyAddedTagIDs?: string[];
	notYetAddedTagNames?: string[];
}

const fieldToColorClass: Record<TypedQuickInputField, string> = {
	deadline: styles.tokenDeadline,
	startTime: styles.tokenStart,
	endTime: styles.tokenEnd,
	recurrenceDuration: styles.tokenRepeat,
	duration: styles.tokenDuration,
	isMandatory: styles.tokenMandatory,
	ignoredDate: styles.tokenIgnoredDate,
	steps: styles.tokenSteps,
	tag: styles.tokenTag,
};

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function getCaretCharacterOffset(container: HTMLElement): number | null {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	if (!container.contains(range.startContainer)) return null;

	const preCaretRange = range.cloneRange();
	preCaretRange.selectNodeContents(container);
	preCaretRange.setEnd(range.startContainer, range.startOffset);
	return preCaretRange.toString().length;
}

function setCaretCharacterOffset(container: HTMLElement, offset: number): void {
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	let remaining = offset;
	let node = walker.nextNode();
	while (node) {
		const textLength = node.textContent?.length ?? 0;
		if (remaining <= textLength) {
			const range = document.createRange();
			range.setStart(node, remaining);
			range.collapse(true);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
			return;
		}
		remaining -= textLength;
		node = walker.nextNode();
	}

	const range = document.createRange();
	range.selectNodeContents(container);
	range.collapse(false);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
}

function getCaretClientRect(editor: HTMLElement): DOMRect | null {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;
	if (!editor.contains(selection.getRangeAt(0).startContainer)) return null;

	const range = selection.getRangeAt(0).cloneRange();
	range.collapse(true);
	const rects = range.getClientRects();
	if (rects.length > 0) return rects[0];
	return editor.getBoundingClientRect();
}

type HighlightRange = {
	start: number;
	end: number;
	className: string;
	tokenIndex: number | null;
	escapedTokenIndex: number | null;
};

function buildHighlightHtml(
	value: string,
	tokens: TypedQuickInputToken[],
	escapedTokens: TypedQuickInputToken[],
	demotingRange: { start: number; end: number } | null
): string {
	const ranges: HighlightRange[] = tokens.map((token, tokenIndex) => ({
		start: token.startIndex,
		end: token.endIndex,
		className: `${styles.token} ${fieldToColorClass[token.field]}`,
		tokenIndex,
		escapedTokenIndex: null,
	}));

	for (const [escapedTokenIndex, escapedToken] of escapedTokens.entries()) {
		ranges.push({
			start: escapedToken.startIndex,
			end: escapedToken.endIndex,
			className: styles.escapedToken,
			tokenIndex: null,
			escapedTokenIndex,
		});
	}

	if (demotingRange && demotingRange.end > demotingRange.start) {
		ranges.push({
			start: demotingRange.start,
			end: demotingRange.end,
			className: styles.demoting,
			tokenIndex: null,
			escapedTokenIndex: null,
		});
	}

	ranges.sort((left, right) => left.start - right.start);

	let html = '';
	let cursor = 0;
	for (const range of ranges) {
		if (range.start < cursor) continue;
		html += escapeHtml(value.slice(cursor, range.start));
		const tokenAttribute = range.tokenIndex !== null ? ` data-token-index="${range.tokenIndex}"` : '';
		const escapedTokenAttribute = range.escapedTokenIndex !== null ? ` data-escaped-token-index="${range.escapedTokenIndex}"` : '';
		html += `<span class="${range.className}"${tokenAttribute}${escapedTokenAttribute}>${escapeHtml(value.slice(range.start, range.end))}</span>`;
		cursor = range.end;
	}
	html += escapeHtml(value.slice(cursor));
	return html;
}

export default function TypedQuickInput({
	value,
	onChange,
	tokens,
	escapedTokens,
	onToggleTokenEscape,
	demotedRange = null,
	placeholderTiersLongestFirst = [],
	onSubmit,
	onShiftEnter,
	editorClassName = '',
	disabled = false,
	existingTagsSortedByUsage = [],
	alreadyAddedTagIDs = [],
	notYetAddedTagNames = [],
}: Props) {
	const editorRef = useRef<HTMLDivElement>(null);
	const fittingPlaceholder = useFittingPlaceholder(placeholderTiersLongestFirst, editorRef);
	const { onKeyDown: onPlainTextKeyDown, onPaste } = usePlainTextContentEditable();
	const [hoveredToken, setHoveredToken] = useState<{ token: TypedQuickInputToken; isEscaped: boolean } | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
	const [demotingRange, setDemotingRange] = useState<{ start: number; end: number } | null>(null);
	const [activeTagEntry, setActiveTagEntry] = useState<ActiveTagEntry | null>(null);
	const [tagHighlightedIndex, setTagHighlightedIndex] = useState(0);
	const [tagPopoverPosition, setTagPopoverPosition] = useState<{ left: number; top: number } | null>(null);
	const hideTooltipTimer = useRef<number | null>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const isComposingRef = useRef(false);
	const pendingCaretOffsetRef = useRef<number | null>(null);
	const onSubmitRef = useRef(onSubmit);
	onSubmitRef.current = onSubmit;
	const onShiftEnterRef = useRef(onShiftEnter);
	onShiftEnterRef.current = onShiftEnter;
	const disabledRef = useRef(disabled);
	disabledRef.current = disabled;
	const tokensRef = useRef(tokens);
	tokensRef.current = tokens;
	const onToggleTokenEscapeRef = useRef(onToggleTokenEscape);
	onToggleTokenEscapeRef.current = onToggleTokenEscape;

	const normalizedNotYetAddedTagNames = useMemo(
		() => new Set(notYetAddedTagNames.map(name => name.toLowerCase())),
		[notYetAddedTagNames]
	);

	const tagSuggestions = useMemo(() => {
		if (!activeTagEntry) return [];
		const normalizedFilterText = activeTagEntry.typedText.trim().toLowerCase();
		return existingTagsSortedByUsage.filter(tag => {
			if (alreadyAddedTagIDs.includes(tag.id)) return false;
			if (normalizedNotYetAddedTagNames.has(tag.name.toLowerCase())) return false;
			return tag.name.toLowerCase().includes(normalizedFilterText);
		});
	}, [activeTagEntry, existingTagsSortedByUsage, alreadyAddedTagIDs, normalizedNotYetAddedTagNames]);

	function updateActiveTagEntry() {
		const editor = editorRef.current;
		if (!editor) return;
		const caretOffset = getCaretCharacterOffset(editor);
		if (caretOffset === null) {
			setActiveTagEntry(null);
			return;
		}

		const entry = findActiveTagEntryAtCaret(editor.textContent ?? '', caretOffset);
		setActiveTagEntry(entry);
		setTagHighlightedIndex(0);
		if (entry) {
			const rect = getCaretClientRect(editor);
			if (rect) setTagPopoverPosition({ left: rect.left, top: rect.bottom });
		}
	}

	const updateActiveTagEntryRef = useRef(updateActiveTagEntry);
	updateActiveTagEntryRef.current = updateActiveTagEntry;

	function confirmTagSuggestion(tag: Tag) {
		if (!activeTagEntry) return;
		const replacementName = /\s/.test(tag.name) ? `"${tag.name}"` : tag.name;
		const followingCharacter = value[activeTagEntry.segmentEndIndex];
		const needsTrailingSpace = followingCharacter === undefined || (followingCharacter !== ' ' && followingCharacter !== ',');
		const replacement = needsTrailingSpace ? `${replacementName} ` : replacementName;

		const nextValue = value.slice(0, activeTagEntry.segmentStartIndex) + replacement + value.slice(activeTagEntry.segmentEndIndex);
		pendingCaretOffsetRef.current = activeTagEntry.segmentStartIndex + replacement.length;
		setActiveTagEntry(null);
		onChange(nextValue);
	}

	useEffect(() => {
		function onSelectionChange() {
			if (document.activeElement !== editorRef.current) return;
			updateActiveTagEntryRef.current();
		}
		document.addEventListener('selectionchange', onSelectionChange);
		return () => document.removeEventListener('selectionchange', onSelectionChange);
	}, []);

	useEffect(() => {
		if (!demotedRange) return;
		setDemotingRange(demotedRange);
		const timer = window.setTimeout(() => setDemotingRange(null), 900);
		return () => window.clearTimeout(timer);
	}, [demotedRange]);

	function rewriteHighlightedHtml(
		editor: HTMLDivElement,
		nextValue: string,
		nextTokens: TypedQuickInputToken[],
		nextEscapedTokens: TypedQuickInputToken[],
		nextDemotingRange: { start: number; end: number } | null
	) {
		const nextHtml = buildHighlightHtml(nextValue, nextTokens, nextEscapedTokens, nextDemotingRange);
		if (editor.innerHTML === nextHtml) return;

		const isFocused = document.activeElement === editor;
		const caretOffset = isFocused ? getCaretCharacterOffset(editor) : null;

		editor.innerHTML = nextHtml;

		if (isFocused && caretOffset !== null) {
			setCaretCharacterOffset(editor, caretOffset);
		}
	}

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;
		if (isComposingRef.current) return;
		rewriteHighlightedHtml(editor, value, tokens, escapedTokens, demotingRange);

		if (pendingCaretOffsetRef.current !== null) {
			setCaretCharacterOffset(editor, pendingCaretOffsetRef.current);
			pendingCaretOffsetRef.current = null;
			updateActiveTagEntry();
		}
	}, [value, tokens, escapedTokens, demotingRange]);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;

		function onBeforeInput(event: InputEvent) {
			if (disabledRef.current) return;
			if (event.inputType === 'insertLineBreak') {
				event.preventDefault();
				onShiftEnterRef.current?.();
			}
			else if (event.inputType === 'insertParagraph') {
				event.preventDefault();
				onSubmitRef.current?.();
			}
			else if (event.inputType === 'insertText' && event.data === '\\' && editor) {
				const caretOffset = getCaretCharacterOffset(editor);
				const tokenStartingAtCaret = tokensRef.current.find(token => token.startIndex === caretOffset);
				if (tokenStartingAtCaret) {
					event.preventDefault();
					onToggleTokenEscapeRef.current(
						tokenStartingAtCaret.field,
						tokenStartingAtCaret.matchedText,
						tokenStartingAtCaret.startIndex,
						tokenStartingAtCaret.endIndex
					);
				}
			}
		}

		editor.addEventListener('beforeinput', onBeforeInput as EventListener);
		return () => editor.removeEventListener('beforeinput', onBeforeInput as EventListener);
	}, []);

	function handleInput() {
		const editor = editorRef.current;
		if (!editor) return;
		hideTooltip();
		onChange(editor.textContent ?? '');
		updateActiveTagEntry();
	}

	function handleCompositionStart() {
		isComposingRef.current = true;
	}

	function handleCompositionEnd() {
		isComposingRef.current = false;
		const editor = editorRef.current;
		if (!editor) return;
		const composedValue = editor.textContent ?? '';
		if (composedValue !== value) onChange(composedValue);
		else rewriteHighlightedHtml(editor, value, tokens, escapedTokens, demotingRange);
		updateActiveTagEntry();
	}

	function handleBlur() {
		setActiveTagEntry(null);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (!disabled && !event.nativeEvent.isComposing && activeTagEntry && tagSuggestions.length > 0) {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				setTagHighlightedIndex(current => Math.min(current + 1, tagSuggestions.length - 1));
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				event.stopPropagation();
				setTagHighlightedIndex(current => Math.max(current - 1, 0));
				return;
			}
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				confirmTagSuggestion(tagSuggestions[tagHighlightedIndex]);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				setActiveTagEntry(null);
				return;
			}
		}

		onPlainTextKeyDown(event);
		if (disabled) return;
		if (event.nativeEvent.isComposing) return;
		if (event.key === 'Enter' && event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			onShiftEnter?.();
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			onSubmit?.();
		}
	}

	function resolveHoveredTokenFromElement(tokenElement: HTMLElement): { token: TypedQuickInputToken; isEscaped: boolean } | null {
		if (tokenElement.dataset.tokenIndex !== undefined) {
			const token = tokens[Number(tokenElement.dataset.tokenIndex)];
			return token ? { token, isEscaped: false } : null;
		}
		if (tokenElement.dataset.escapedTokenIndex !== undefined) {
			const token = escapedTokens[Number(tokenElement.dataset.escapedTokenIndex)];
			return token ? { token, isEscaped: true } : null;
		}
		return null;
	}

	function showTooltipForToken(hovered: { token: TypedQuickInputToken; isEscaped: boolean }, tokenElement: HTMLElement) {
		if (hideTooltipTimer.current !== null) {
			window.clearTimeout(hideTooltipTimer.current);
			hideTooltipTimer.current = null;
		}
		const rect = tokenElement.getBoundingClientRect();
		setHoveredToken(hovered);
		setTooltipPosition({ left: rect.left, top: rect.top });
	}

	function scheduleHideTooltip() {
		hideTooltipTimer.current = window.setTimeout(() => {
			setHoveredToken(null);
			setTooltipPosition(null);
		}, 120);
	}

	function hideTooltip() {
		if (hideTooltipTimer.current !== null) {
			window.clearTimeout(hideTooltipTimer.current);
			hideTooltipTimer.current = null;
		}
		setHoveredToken(null);
		setTooltipPosition(null);
	}

	function findTokenElement(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof HTMLElement)) return null;
		return target.closest<HTMLElement>('[data-token-index], [data-escaped-token-index]');
	}

	function handlePointerOver(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerType === 'touch') return;
		const tokenElement = findTokenElement(event.target);
		if (!tokenElement) {
			scheduleHideTooltip();
			return;
		}
		const hovered = resolveHoveredTokenFromElement(tokenElement);
		if (!hovered) {
			scheduleHideTooltip();
			return;
		}
		showTooltipForToken(hovered, tokenElement);
	}

	function handlePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerType === 'touch') return;
		scheduleHideTooltip();
	}

	function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
		const tokenElement = findTokenElement(event.target);
		if (!tokenElement) {
			hideTooltip();
			return;
		}
		const hovered = resolveHoveredTokenFromElement(tokenElement);
		if (!hovered) return;

		onToggleTokenEscape(hovered.token.field, hovered.token.matchedText, hovered.token.startIndex, hovered.token.endIndex);
		hideTooltip();
	}

	useEffect(() => {
		if (!hoveredToken) return;

		function onPointerDownOutside(event: PointerEvent) {
			const target = event.target as Node;
			if (editorRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
			hideTooltip();
		}

		document.addEventListener('pointerdown', onPointerDownOutside);
		return () => document.removeEventListener('pointerdown', onPointerDownOutside);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hoveredToken]);

	return (
		<div className={styles.wrapper}>
			<div
				ref={editorRef}
				contentEditable={!disabled}
				suppressContentEditableWarning
				role="textbox"
				aria-label="Task name"
				aria-disabled={disabled}
				spellCheck={false}
				enterKeyHint="done"
				data-placeholder={fittingPlaceholder}
				className={`field large ${styles.editor} ${editorClassName}`.trim()}
				onInput={handleInput}
				onCompositionStart={handleCompositionStart}
				onCompositionEnd={handleCompositionEnd}
				onKeyDown={handleKeyDown}
				onPaste={onPaste}
				onClick={handleEditorClick}
				onPointerOver={handlePointerOver}
				onPointerLeave={handlePointerLeave}
				onBlur={handleBlur}
			/>

			{activeTagEntry && tagPopoverPosition && (
				<InlineTagSuggestionPopover
					tags={tagSuggestions}
					highlightedIndex={tagHighlightedIndex}
					position={tagPopoverPosition}
					onHoverIndex={setTagHighlightedIndex}
					onSelectIndex={index => confirmTagSuggestion(tagSuggestions[index])}
				/>
			)}

			{hoveredToken && tooltipPosition && (
				<div
					ref={tooltipRef}
					className={styles.tooltip}
					style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
					onPointerEnter={() => {
						if (hideTooltipTimer.current !== null) {
							window.clearTimeout(hideTooltipTimer.current);
							hideTooltipTimer.current = null;
						}
					}}
					onPointerLeave={event => {
						if (event.pointerType === 'touch') return;
						scheduleHideTooltip();
					}}
				>
					<span className={styles.tooltipExplanation}>{hoveredToken.token.explanation}</span>
					<span className={styles.tooltipInstruction}>
						{hoveredToken.isEscaped
							? `Click to become ${getTokenBecomeLabel(hoveredToken.token)}`
							: 'Click to keep as text'}
					</span>
				</div>
			)}
		</div>
	);
}

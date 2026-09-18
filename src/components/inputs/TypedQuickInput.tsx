import { useEffect, useRef, useState } from 'react';
import { TypedQuickInputField, TypedQuickInputToken } from '../../model/typed-quick-input/TypedQuickInputToken';
import { useFittingPlaceholder } from '../../hooks/useFittingPlaceholder';
import styles from './TypedQuickInput.module.css';

interface Props {
	value: string;
	onChange: (value: string) => void;
	tokens: TypedQuickInputToken[];
	onUnlinkToken: (token: TypedQuickInputToken) => void;
	demotedRange?: { start: number; end: number } | null;
	placeholderTiersLongestFirst?: string[];
	onSubmit?: () => void;
	onShiftEnter?: () => void;
	editorClassName?: string;
	disabled?: boolean;
}

const fieldToColorClass: Record<TypedQuickInputField, string> = {
	deadline: styles.tokenDeadline,
	startTime: styles.tokenStart,
	endTime: styles.tokenEnd,
	repeatInterval: styles.tokenRepeat,
	duration: styles.tokenDuration,
	isMandatory: styles.tokenMandatory,
	ignoredDate: styles.tokenIgnoredDate,
	steps: styles.tokenSteps,
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

type HighlightRange = {
	start: number;
	end: number;
	className: string;
	tokenIndex: number | null;
};

function buildHighlightHtml(
	value: string,
	tokens: TypedQuickInputToken[],
	demotingRange: { start: number; end: number } | null
): string {
	const ranges: HighlightRange[] = tokens.map((token, tokenIndex) => ({
		start: token.startIndex,
		end: token.endIndex,
		className: `${styles.token} ${fieldToColorClass[token.field]}`,
		tokenIndex,
	}));

	if (demotingRange && demotingRange.end > demotingRange.start) {
		ranges.push({
			start: demotingRange.start,
			end: demotingRange.end,
			className: styles.demoting,
			tokenIndex: null,
		});
	}

	ranges.sort((left, right) => left.start - right.start);

	let html = '';
	let cursor = 0;
	for (const range of ranges) {
		if (range.start < cursor) continue;
		html += escapeHtml(value.slice(cursor, range.start));
		const tokenAttribute = range.tokenIndex !== null ? ` data-token-index="${range.tokenIndex}"` : '';
		html += `<span class="${range.className}"${tokenAttribute}>${escapeHtml(value.slice(range.start, range.end))}</span>`;
		cursor = range.end;
	}
	html += escapeHtml(value.slice(cursor));
	return html;
}

export default function TypedQuickInput({
	value,
	onChange,
	tokens,
	onUnlinkToken,
	demotedRange = null,
	placeholderTiersLongestFirst = [],
	onSubmit,
	onShiftEnter,
	editorClassName = '',
	disabled = false,
}: Props) {
	const editorRef = useRef<HTMLDivElement>(null);
	const fittingPlaceholder = useFittingPlaceholder(placeholderTiersLongestFirst, editorRef);
	const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
	const [demotingRange, setDemotingRange] = useState<{ start: number; end: number } | null>(null);
	const hideTooltipTimer = useRef<number | null>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const isComposingRef = useRef(false);
	const isTooltipOpenedByTapRef = useRef(false);
	const onSubmitRef = useRef(onSubmit);
	onSubmitRef.current = onSubmit;
	const onShiftEnterRef = useRef(onShiftEnter);
	onShiftEnterRef.current = onShiftEnter;
	const disabledRef = useRef(disabled);
	disabledRef.current = disabled;

	useEffect(() => {
		if (!demotedRange) return;
		setDemotingRange(demotedRange);
		const timer = window.setTimeout(() => setDemotingRange(null), 900);
		return () => window.clearTimeout(timer);
	}, [demotedRange]);

	function rewriteHighlightedHtml(editor: HTMLDivElement, nextValue: string, nextTokens: TypedQuickInputToken[], nextDemotingRange: { start: number; end: number } | null) {
		const nextHtml = buildHighlightHtml(nextValue, nextTokens, nextDemotingRange);
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
		rewriteHighlightedHtml(editor, value, tokens, demotingRange);
	}, [value, tokens, demotingRange]);

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
		}

		editor.addEventListener('beforeinput', onBeforeInput as EventListener);
		return () => editor.removeEventListener('beforeinput', onBeforeInput as EventListener);
	}, []);

	function handleInput() {
		const editor = editorRef.current;
		if (!editor) return;
		onChange(editor.textContent ?? '');
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
		else rewriteHighlightedHtml(editor, value, tokens, demotingRange);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
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

	function showTooltipForToken(tokenIndex: number, tokenElement: HTMLElement) {
		if (hideTooltipTimer.current !== null) {
			window.clearTimeout(hideTooltipTimer.current);
			hideTooltipTimer.current = null;
		}
		const rect = tokenElement.getBoundingClientRect();
		setHoveredTokenIndex(tokenIndex);
		setTooltipPosition({ left: rect.left, top: rect.top });
	}

	function scheduleHideTooltip() {
		hideTooltipTimer.current = window.setTimeout(() => {
			setHoveredTokenIndex(null);
			setTooltipPosition(null);
		}, 120);
	}

	function hideTooltip() {
		if (hideTooltipTimer.current !== null) {
			window.clearTimeout(hideTooltipTimer.current);
			hideTooltipTimer.current = null;
		}
		isTooltipOpenedByTapRef.current = false;
		setHoveredTokenIndex(null);
		setTooltipPosition(null);
	}

	function findTokenElement(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof HTMLElement)) return null;
		return target.closest<HTMLElement>('[data-token-index]');
	}

	function handlePointerOver(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerType === 'touch') return;
		const tokenElement = findTokenElement(event.target);
		if (!tokenElement) return;
		const tokenIndex = Number(tokenElement.dataset.tokenIndex);
		showTooltipForToken(tokenIndex, tokenElement);
	}

	function handlePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
		if (event.pointerType === 'touch' || isTooltipOpenedByTapRef.current) return;
		scheduleHideTooltip();
	}

	function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
		const tokenElement = findTokenElement(event.target);
		if (!tokenElement) {
			if (isTooltipOpenedByTapRef.current) hideTooltip();
			return;
		}
		const tokenIndex = Number(tokenElement.dataset.tokenIndex);
		if (isTooltipOpenedByTapRef.current && tokenIndex === hoveredTokenIndex) {
			hideTooltip();
			return;
		}
		isTooltipOpenedByTapRef.current = true;
		showTooltipForToken(tokenIndex, tokenElement);
	}

	useEffect(() => {
		if (hoveredTokenIndex === null) return;

		function onPointerDownOutside(event: PointerEvent) {
			const target = event.target as Node;
			if (editorRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
			hideTooltip();
		}

		document.addEventListener('pointerdown', onPointerDownOutside);
		return () => document.removeEventListener('pointerdown', onPointerDownOutside);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hoveredTokenIndex]);

	const hoveredToken = hoveredTokenIndex !== null ? tokens[hoveredTokenIndex] : null;

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
				onClick={handleEditorClick}
				onPointerOver={handlePointerOver}
				onPointerLeave={handlePointerLeave}
			/>

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
						if (event.pointerType === 'touch' || isTooltipOpenedByTapRef.current) return;
						scheduleHideTooltip();
					}}
				>
					<span className={styles.tooltipExplanation}>{hoveredToken.explanation}</span>
					<button
						type="button"
						tabIndex={-1}
						className={`touch-hit-area ${styles.keepAsTextButton}`}
						onClick={() => {
							onUnlinkToken(hoveredToken);
							hideTooltip();
						}}
					>
						Keep as text
					</button>
				</div>
			)}
		</div>
	);
}

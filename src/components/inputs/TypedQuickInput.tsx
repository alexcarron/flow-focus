import { useEffect, useRef, useState } from 'react';
import { TypedQuickInputField, TypedQuickInputToken } from '../../model/typed-quick-input/TypedQuickInputToken';
import styles from './TypedQuickInput.module.css';

interface Props {
	value: string;
	onChange: (value: string) => void;
	tokens: TypedQuickInputToken[];
	onUnlinkToken: (token: TypedQuickInputToken) => void;
	demotedRange?: { start: number; end: number } | null;
	placeholder?: string;
	onSubmit?: () => void;
}

const fieldToColorClass: Record<TypedQuickInputField, string> = {
	deadline: styles.tokenDeadline,
	startTime: styles.tokenStart,
	endTime: styles.tokenEnd,
	repeatInterval: styles.tokenRepeat,
	duration: styles.tokenDuration,
	isMandatory: styles.tokenMandatory,
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
	placeholder,
	onSubmit,
}: Props) {
	const editorRef = useRef<HTMLDivElement>(null);
	const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
	const [demotingRange, setDemotingRange] = useState<{ start: number; end: number } | null>(null);
	const hideTooltipTimer = useRef<number | null>(null);

	useEffect(() => {
		if (!demotedRange) return;
		setDemotingRange(demotedRange);
		const timer = window.setTimeout(() => setDemotingRange(null), 900);
		return () => window.clearTimeout(timer);
	}, [demotedRange]);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;

		const isFocused = document.activeElement === editor;
		const caretOffset = isFocused ? getCaretCharacterOffset(editor) : null;

		editor.innerHTML = buildHighlightHtml(value, tokens, demotingRange);

		if (isFocused && caretOffset !== null) {
			setCaretCharacterOffset(editor, caretOffset);
		}
	}, [value, tokens, demotingRange]);

	function handleInput() {
		const editor = editorRef.current;
		if (!editor) return;
		onChange(editor.textContent ?? '');
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Enter') {
			event.preventDefault();
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

	function handlePointerOver(event: React.PointerEvent<HTMLDivElement>) {
		const tokenElement = (event.target as HTMLElement).closest<HTMLElement>('[data-token-index]');
		if (!tokenElement) return;
		const tokenIndex = Number(tokenElement.dataset.tokenIndex);
		showTooltipForToken(tokenIndex, tokenElement);
	}

	const hoveredToken = hoveredTokenIndex !== null ? tokens[hoveredTokenIndex] : null;

	return (
		<div className={styles.wrapper}>
			<div
				ref={editorRef}
				contentEditable
				suppressContentEditableWarning
				role="textbox"
				aria-label="Task name"
				spellCheck={false}
				data-placeholder={placeholder}
				className={`field large ${styles.editor}`}
				onInput={handleInput}
				onKeyDown={handleKeyDown}
				onPointerOver={handlePointerOver}
				onPointerLeave={scheduleHideTooltip}
			/>

			{hoveredToken && tooltipPosition && (
				<div
					className={styles.tooltip}
					style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
					onPointerEnter={() => {
						if (hideTooltipTimer.current !== null) {
							window.clearTimeout(hideTooltipTimer.current);
							hideTooltipTimer.current = null;
						}
					}}
					onPointerLeave={scheduleHideTooltip}
				>
					<span className={styles.tooltipExplanation}>{hoveredToken.explanation}</span>
					<button
						type="button"
						tabIndex={-1}
						className={styles.keepAsTextButton}
						onClick={() => {
							onUnlinkToken(hoveredToken);
							setHoveredTokenIndex(null);
							setTooltipPosition(null);
						}}
					>
						Keep as text
					</button>
				</div>
			)}
		</div>
	);
}

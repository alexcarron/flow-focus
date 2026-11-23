import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Tag from '../../model/tag/Tag';
import Task from '../../model/task/Task';
import getDetailDistinguishingTaskFromSameNamedTasks from '../../model/task/getDetailDistinguishingTaskFromSameNamedTasks';
import { getTokenBecomeLabel, PinnedPrerequisiteTaskLocation, TypedQuickInputField, TypedQuickInputPrerequisiteTaskMatch, TypedQuickInputToken } from '../../model/typed-quick-input/TypedQuickInputToken';
import findActiveTagEntryAtCaret, { ActiveTagEntry } from '../../model/typed-quick-input/findActiveTagEntryAtCaret';
import findActivePrerequisiteTaskEntryAtCaret, { ActivePrerequisiteTaskEntry } from '../../model/typed-quick-input/findActivePrerequisiteTaskEntryAtCaret';
import shortenTaskNameToInsertIntoTypedQuickInput from '../../model/typed-quick-input/shortenTaskNameToInsertIntoTypedQuickInput';
import { useFittingPlaceholder } from '../../hooks/useFittingPlaceholder';
import { usePlainTextContentEditable } from '../../hooks/usePlainTextContentEditable';
import InlineSuggestionPopover, { InlineSuggestion } from '../InlineSuggestionPopover';
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
	prerequisiteTaskCandidatesInPriorityOrder?: Task[];
	prerequisiteTaskMatches?: TypedQuickInputPrerequisiteTaskMatch[];
	manuallyAddedPrerequisiteTaskIDs?: string[];
	pinnedPrerequisiteTaskLocations?: PinnedPrerequisiteTaskLocation[];
	onPinPrerequisiteTask?: (parameters: { nextName: string; pinnedLocation: PinnedPrerequisiteTaskLocation }) => void;
}

const NO_PLACEHOLDER_TIERS: string[] = [];
const NO_TAGS: Tag[] = [];
const NO_TAG_IDS: string[] = [];
const NO_TAG_NAMES: string[] = [];
const NO_TASKS: Task[] = [];
const NO_PREREQUISITE_TASK_MATCHES: TypedQuickInputPrerequisiteTaskMatch[] = [];
const NO_TASK_IDS: string[] = [];
const NO_PINNED_PREREQUISITE_TASK_LOCATIONS: PinnedPrerequisiteTaskLocation[] = [];

const fieldToColorClass: Record<TypedQuickInputField, string> = {
	dueDate: styles.tokenDueDate,
	targetDate: styles.tokenTargetDate,
	startDate: styles.tokenStartDate,
	recurrenceDuration: styles.tokenRepeat,
	duration: styles.tokenDuration,
	ignoredDate: styles.tokenIgnoredDate,
	steps: styles.tokenSteps,
	tag: styles.tokenTag,
	prerequisiteTask: styles.tokenPrerequisiteTask,
};

function normalizeTaskName(taskName: string): string {
	return taskName.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getTokenClassName(token: TypedQuickInputToken): string {
	if (token.isDisabled) return `${styles.token} ${styles.tokenDisabled}`;
	return `${styles.token} ${fieldToColorClass[token.field]}`;
}

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

function shiftCaretOffsetPastRemovedBackslashes(previousText: string, nextText: string, caretOffset: number): number {
	if (nextText.length >= previousText.length) return caretOffset;

	let previousIndex = 0;
	let nextIndex = 0;
	while (previousIndex < caretOffset && previousIndex < previousText.length) {
		if (nextIndex < nextText.length && previousText[previousIndex] === nextText[nextIndex]) {
			nextIndex++;
		}
		else if (previousText[previousIndex] !== '\\') {
			return caretOffset;
		}
		previousIndex++;
	}
	return nextIndex;
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
		className: getTokenClassName(token),
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
	placeholderTiersLongestFirst = NO_PLACEHOLDER_TIERS,
	onSubmit,
	onShiftEnter,
	editorClassName = '',
	disabled = false,
	existingTagsSortedByUsage = NO_TAGS,
	alreadyAddedTagIDs = NO_TAG_IDS,
	notYetAddedTagNames = NO_TAG_NAMES,
	prerequisiteTaskCandidatesInPriorityOrder = NO_TASKS,
	prerequisiteTaskMatches = NO_PREREQUISITE_TASK_MATCHES,
	manuallyAddedPrerequisiteTaskIDs = NO_TASK_IDS,
	pinnedPrerequisiteTaskLocations = NO_PINNED_PREREQUISITE_TASK_LOCATIONS,
	onPinPrerequisiteTask,
}: Props) {
	const editorRef = useRef<HTMLDivElement>(null);
	const fittingPlaceholder = useFittingPlaceholder(placeholderTiersLongestFirst, editorRef);
	const { onKeyDown: onPlainTextKeyDown, onPaste } = usePlainTextContentEditable();
	const [hoveredToken, setHoveredToken] = useState<{ token: TypedQuickInputToken; isEscaped: boolean } | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
	const [demotingRange, setDemotingRange] = useState<{ start: number; end: number } | null>(null);
	const [activeTagEntry, setActiveTagEntry] = useState<ActiveTagEntry | null>(null);
	const [activePrerequisiteTaskEntry, setActivePrerequisiteTaskEntry] = useState<ActivePrerequisiteTaskEntry | null>(null);
	const [suggestionHighlightedIndex, setSuggestionHighlightedIndex] = useState(0);
	const [suggestionPopoverPosition, setSuggestionPopoverPosition] = useState<{ left: number; top: number } | null>(null);
	const hideTooltipTimer = useRef<number | null>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const isComposingRef = useRef(false);
	const pendingCaretOffsetRef = useRef<number | null>(null);

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

	const prerequisiteTaskSuggestions = useMemo(() => {
		if (!activePrerequisiteTaskEntry) return [];
		const normalizedTypedText = normalizeTaskName(activePrerequisiteTaskEntry.typedText);
		const isMatchOfActiveEntry = (match: TypedQuickInputPrerequisiteTaskMatch) =>
			match.startIndex < activePrerequisiteTaskEntry.nameStartIndex &&
			activePrerequisiteTaskEntry.nameStartIndex < match.endIndex;
		const prerequisiteTaskIDsLinkedElsewhere = new Set([
			...manuallyAddedPrerequisiteTaskIDs,
			...prerequisiteTaskMatches.filter(match => !isMatchOfActiveEntry(match)).map(match => match.prerequisiteTaskID),
		]);
		const matchingTasks = prerequisiteTaskCandidatesInPriorityOrder.filter(task =>
			!prerequisiteTaskIDsLinkedElsewhere.has(task.id) &&
			normalizeTaskName(task.getDescription()).includes(normalizedTypedText)
		);

		const prerequisiteTaskIDOfActiveEntry = prerequisiteTaskMatches.find(isMatchOfActiveEntry)?.prerequisiteTaskID;
		const alreadyMatchedTask = matchingTasks.find(task => task.id === prerequisiteTaskIDOfActiveEntry);
		if (alreadyMatchedTask === undefined) return matchingTasks;
		return [alreadyMatchedTask, ...matchingTasks.filter(task => task !== alreadyMatchedTask)];
	}, [activePrerequisiteTaskEntry, prerequisiteTaskCandidatesInPriorityOrder, prerequisiteTaskMatches, manuallyAddedPrerequisiteTaskIDs]);

	const inlineSuggestions: InlineSuggestion[] = useMemo(() => {
		if (activeTagEntry) return tagSuggestions.map(tag => ({ key: tag.id, label: tag.name, detail: null }));
		return prerequisiteTaskSuggestions.map(task => ({
			key: task.id,
			label: task.getDescription(),
			detail: getDetailDistinguishingTaskFromSameNamedTasks({
				task,
				tasks: prerequisiteTaskCandidatesInPriorityOrder,
			}),
		}));
	}, [activeTagEntry, tagSuggestions, prerequisiteTaskSuggestions, prerequisiteTaskCandidatesInPriorityOrder]);

	const isAnySuggestionEntryActive = activeTagEntry !== null || activePrerequisiteTaskEntry !== null;

	function clearActiveSuggestionEntries() {
		setActiveTagEntry(null);
		setActivePrerequisiteTaskEntry(null);
	}

	function updateActiveSuggestionEntries() {
		const editor = editorRef.current;
		if (!editor) return;
		const caretOffset = getCaretCharacterOffset(editor);
		if (caretOffset === null) {
			clearActiveSuggestionEntries();
			return;
		}

		const text = editor.textContent ?? '';
		const tagEntry = findActiveTagEntryAtCaret(text, caretOffset);
		const canSuggestPrerequisiteTasks = tagEntry === null && onPinPrerequisiteTask !== undefined;
		const prerequisiteTaskEntry = canSuggestPrerequisiteTasks
			? findActivePrerequisiteTaskEntryAtCaret({ text, caretOffset, pinnedPrerequisiteTaskLocations })
			: null;
		setActiveTagEntry(tagEntry);
		setActivePrerequisiteTaskEntry(prerequisiteTaskEntry);
		setSuggestionHighlightedIndex(0);
		if (tagEntry || prerequisiteTaskEntry) {
			const rect = getCaretClientRect(editor);
			if (rect) setSuggestionPopoverPosition({ left: rect.left, top: rect.bottom });
		}
	}

	const onEditorSelectionChange = useEffectEvent(() => {
		if (document.activeElement !== editorRef.current) return;
		updateActiveSuggestionEntries();
	});

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

	function confirmPrerequisiteTaskSuggestion(task: Task) {
		if (!activePrerequisiteTaskEntry || !onPinPrerequisiteTask) return;
		const insertedName = shortenTaskNameToInsertIntoTypedQuickInput(task.getDescription());
		const followingCharacter = value[activePrerequisiteTaskEntry.nameEndIndex];
		const needsTrailingSpace = followingCharacter !== ' ';
		const replacement = needsTrailingSpace ? `${insertedName} ` : insertedName;
		const { nameStartIndex, nameEndIndex } = activePrerequisiteTaskEntry;

		const nextValue = value.slice(0, nameStartIndex) + replacement + value.slice(nameEndIndex);
		pendingCaretOffsetRef.current = nameStartIndex + replacement.length;
		setActivePrerequisiteTaskEntry(null);
		onPinPrerequisiteTask({
			nextName: nextValue,
			pinnedLocation: {
				prerequisiteTaskID: task.id,
				matchedText: insertedName,
				startIndex: nameStartIndex,
				endIndex: nameStartIndex + insertedName.length,
			},
		});
	}

	function confirmInlineSuggestionAtIndex(index: number) {
		if (activeTagEntry) confirmTagSuggestion(tagSuggestions[index]);
		else confirmPrerequisiteTaskSuggestion(prerequisiteTaskSuggestions[index]);
	}

	useEffect(() => {
		function onSelectionChange() {
			onEditorSelectionChange();
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
		const caretOffsetBeforeRewrite = isFocused ? getCaretCharacterOffset(editor) : null;
		const caretOffset = caretOffsetBeforeRewrite === null
			? null
			: shiftCaretOffsetPastRemovedBackslashes(editor.textContent ?? '', nextValue, caretOffsetBeforeRewrite);

		editor.innerHTML = nextHtml;

		if (isFocused && caretOffset !== null) {
			setCaretCharacterOffset(editor, caretOffset);
		}
	}

	useLayoutEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;
		if (isComposingRef.current) return;
		rewriteHighlightedHtml(editor, value, tokens, escapedTokens, demotingRange);

		if (pendingCaretOffsetRef.current !== null) {
			setCaretCharacterOffset(editor, pendingCaretOffsetRef.current);
			pendingCaretOffsetRef.current = null;
			updateActiveSuggestionEntries();
		}
	}, [value, tokens, escapedTokens, demotingRange]);

	const onEditorBeforeInput = useEffectEvent((event: InputEvent) => {
		const editor = editorRef.current;
		if (disabled) return;
		if (event.inputType === 'insertLineBreak') {
			event.preventDefault();
			onShiftEnter?.();
		}
		else if (event.inputType === 'insertParagraph') {
			event.preventDefault();
			onSubmit?.();
		}
		else if (event.inputType === 'insertText' && event.data === '\\' && editor) {
			const caretOffset = getCaretCharacterOffset(editor);
			const tokenStartingAtCaret = tokens.find(token => token.startIndex === caretOffset);
			if (tokenStartingAtCaret) {
				event.preventDefault();
				onToggleTokenEscape(
					tokenStartingAtCaret.field,
					tokenStartingAtCaret.matchedText,
					tokenStartingAtCaret.startIndex,
					tokenStartingAtCaret.endIndex
				);
			}
		}
	});

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;

		function onBeforeInput(event: InputEvent) {
			onEditorBeforeInput(event);
		}

		editor.addEventListener('beforeinput', onBeforeInput as EventListener);
		return () => editor.removeEventListener('beforeinput', onBeforeInput as EventListener);
	}, []);

	function handleInput() {
		const editor = editorRef.current;
		if (!editor) return;
		hideTooltip();
		onChange(editor.textContent ?? '');
		updateActiveSuggestionEntries();
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
		updateActiveSuggestionEntries();
	}

	function handleBlur() {
		clearActiveSuggestionEntries();
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (!disabled && !event.nativeEvent.isComposing && isAnySuggestionEntryActive && inlineSuggestions.length > 0) {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				setSuggestionHighlightedIndex(current => Math.min(current + 1, inlineSuggestions.length - 1));
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				event.stopPropagation();
				setSuggestionHighlightedIndex(current => Math.max(current - 1, 0));
				return;
			}
			if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
				event.preventDefault();
				event.stopPropagation();
				confirmInlineSuggestionAtIndex(suggestionHighlightedIndex);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				clearActiveSuggestionEntries();
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

			{isAnySuggestionEntryActive && suggestionPopoverPosition && (
				<InlineSuggestionPopover
					suggestions={inlineSuggestions}
					highlightedIndex={suggestionHighlightedIndex}
					position={suggestionPopoverPosition}
					onHoverIndex={setSuggestionHighlightedIndex}
					onSelectIndex={confirmInlineSuggestionAtIndex}
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Tag from '../model/tag/Tag';
import { useOutsideClickAndEscape } from '../hooks/useOutsideClickAndEscape';
import { DuplicateTagNameError, EmptyTagNameError } from '../persistence/TagRepository';
import PlusIcon from './svg-icons/PlusIcon';
import ErrorMessage from './errors/ErrorMessage';
import styles from './AddTagPopover.module.css';

interface Props {
	existingTags: Tag[];
	alreadyAddedTagIDs: string[];
	notYetAddedTagNames: string[];
	onSelectExisting: (tagID: string) => void;
	onCreateAndAdd: (name: string) => Promise<void>;
	isCompact?: boolean;
}

const NO_ITEM_HIGHLIGHTED = -1;
const POPOVER_GAP_PX = 8;
const VIEWPORT_EDGE_MARGIN_PX = 8;

type SuggestionListItem =
	| { type: 'existingTag'; tag: Tag }
	| { type: 'createTag'; name: string };

export default function AddTagPopover({ existingTags, alreadyAddedTagIDs, notYetAddedTagNames, onSelectExisting, onCreateAndAdd, isCompact = false }: Props) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [highlightedIndex, setHighlightedIndex] = useState(NO_ITEM_HIGHLIGHTED);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const highlightedItemRef = useRef<HTMLButtonElement>(null);
	const triggerButtonRef = useRef<HTMLButtonElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);
	const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

	const trimmedSearchText = searchText.trim();
	const normalizedSearchText = trimmedSearchText.toLowerCase();

	const matchingExistingTags = useMemo(() => {
		return existingTags
			.filter(tag => !alreadyAddedTagIDs.includes(tag.id))
			.filter(tag => tag.name.toLowerCase().includes(normalizedSearchText));
	}, [existingTags, alreadyAddedTagIDs, normalizedSearchText]);

	const hasExactMatchingExistingTag = matchingExistingTags.some(tag => tag.name.toLowerCase() === normalizedSearchText);
	const hasExactMatchingPendingTagName = notYetAddedTagNames.some(name => name.trim().toLowerCase() === normalizedSearchText);
	const hasExactMatchingTag = hasExactMatchingExistingTag || hasExactMatchingPendingTagName;
	const shouldShowCreateTagRow = trimmedSearchText !== '' && !hasExactMatchingTag;

	const listItems: SuggestionListItem[] = useMemo(() => {
		const items: SuggestionListItem[] = matchingExistingTags.map(tag => ({ type: 'existingTag', tag }));
		if (shouldShowCreateTagRow) items.unshift({ type: 'createTag', name: trimmedSearchText });
		return items;
	}, [matchingExistingTags, shouldShowCreateTagRow, trimmedSearchText]);

	useOutsideClickAndEscape(containerRef, isOpen, closePopover);

	useEffect(() => {
		highlightedItemRef.current?.scrollIntoView({ block: 'nearest' });
	}, [highlightedIndex]);

	useLayoutEffect(() => {
		if (!isOpen) return;

		function placePopoverNextToTriggerButton() {
			const triggerButton = triggerButtonRef.current;
			const popover = popoverRef.current;
			if (!triggerButton || !popover) return;

			const triggerRectangle = triggerButton.getBoundingClientRect();
			const maximumLeft = window.innerWidth - popover.offsetWidth - VIEWPORT_EDGE_MARGIN_PX;
			const left = Math.max(VIEWPORT_EDGE_MARGIN_PX, Math.min(triggerRectangle.left, maximumLeft));
			const belowTop = triggerRectangle.bottom + POPOVER_GAP_PX;
			const aboveTop = triggerRectangle.top - POPOVER_GAP_PX - popover.offsetHeight;
			const doesPopoverFitBelow = belowTop + popover.offsetHeight <= window.innerHeight - VIEWPORT_EDGE_MARGIN_PX;
			const doesPopoverFitAbove = aboveTop >= VIEWPORT_EDGE_MARGIN_PX;
			const maximumTop = window.innerHeight - popover.offsetHeight - VIEWPORT_EDGE_MARGIN_PX;
			const clampedBelowTop = Math.max(VIEWPORT_EDGE_MARGIN_PX, Math.min(belowTop, maximumTop));
			let top = clampedBelowTop;
			if (!doesPopoverFitBelow && doesPopoverFitAbove) top = aboveTop;
			setPopoverPosition({ top, left });
		}

		placePopoverNextToTriggerButton();
		window.addEventListener('resize', placePopoverNextToTriggerButton);
		window.addEventListener('scroll', placePopoverNextToTriggerButton, true);
		return () => {
			window.removeEventListener('resize', placePopoverNextToTriggerButton);
			window.removeEventListener('scroll', placePopoverNextToTriggerButton, true);
		};
	}, [isOpen, listItems.length, errorMessage]);

	function openPopover() {
		setIsOpen(true);
		setSearchText('');
		setHighlightedIndex(NO_ITEM_HIGHLIGHTED);
		setErrorMessage(null);
		requestAnimationFrame(() => inputRef.current?.focus());
	}

	function closePopover() {
		setIsOpen(false);
	}

	function selectTag(tagID: string) {
		onSelectExisting(tagID);
		closePopover();
	}

	async function createTag(name: string) {
		try {
			await onCreateAndAdd(name);
			closePopover();
		} catch (error) {
			if (error instanceof DuplicateTagNameError || error instanceof EmptyTagNameError) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage('Failed to create tag.');
			}
		}
	}

	function activateListItem(item: SuggestionListItem) {
		if (item.type === 'existingTag') selectTag(item.tag.id);
		else createTag(item.name);
	}

	function renderListItemContent(item: SuggestionListItem) {
		if (item.type === 'existingTag') return item.tag.name;

		return (
			<>
				<PlusIcon className={styles.createTagIcon} />
				{item.name}
			</>
		);
	}

	async function confirmSearchText() {
		if (trimmedSearchText === '') return;

		const matchingExistingTag = existingTags.find(tag => tag.name.toLowerCase() === normalizedSearchText);
		if (matchingExistingTag) {
			if (!alreadyAddedTagIDs.includes(matchingExistingTag.id)) selectTag(matchingExistingTag.id);
			else closePopover();
			return;
		}

		if (hasExactMatchingPendingTagName) {
			setErrorMessage(`A tag named "${trimmedSearchText}" already exists.`);
			return;
		}

		await createTag(trimmedSearchText);
	}

	function onKeyDown(event: React.KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			setHighlightedIndex(current => Math.min(current + 1, listItems.length - 1));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			setHighlightedIndex(current => Math.max(current - 1, NO_ITEM_HIGHLIGHTED));
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			if (highlightedIndex !== NO_ITEM_HIGHLIGHTED && listItems[highlightedIndex]) {
				activateListItem(listItems[highlightedIndex]);
			} else {
				confirmSearchText();
			}
		}
	}

	return (
		<div ref={containerRef} className={styles.container} data-popover-open={isOpen}>
			<button
				ref={triggerButtonRef}
				type="button"
				onClick={() => isOpen ? closePopover() : openPopover()}
				className={isCompact ? `${styles.triggerButton} ${styles.triggerButtonCompact} touch-hit-area` : `${styles.triggerButton} touch-hit-area`}
				aria-label="Add tag"
				title="Add tag"
			>
				<PlusIcon className={isCompact ? `${styles.triggerIcon} ${styles.triggerIconCompact}` : styles.triggerIcon} />
			</button>

			{isOpen && (
				<div ref={popoverRef} className={styles.popover} style={{ top: popoverPosition.top, left: popoverPosition.left }}>
					<input
						ref={inputRef}
						type="text"
						value={searchText}
						onChange={event => {
							setSearchText(event.target.value);
							setHighlightedIndex(NO_ITEM_HIGHLIGHTED);
							setErrorMessage(null);
						}}
						onKeyDown={onKeyDown}
						placeholder="Find or create a tag..."
						className={`field ${styles.searchInput}`}
					/>

					<ErrorMessage message={errorMessage} />

					<ul className={styles.suggestionList} role="listbox">
						{listItems.map((item, index) => (
							<li key={item.type === 'existingTag' ? item.tag.id : 'createTag'}>
								<button
									ref={index === highlightedIndex ? highlightedItemRef : undefined}
									type="button"
									role="option"
									aria-selected={index === highlightedIndex}
									onMouseEnter={() => setHighlightedIndex(index)}
									onClick={() => activateListItem(item)}
									className={index === highlightedIndex ? `${styles.suggestion} ${styles.suggestionHighlighted}` : styles.suggestion}
								>
									{renderListItemContent(item)}
								</button>
							</li>
						))}
						{listItems.length === 0 && (
							<li className={styles.emptyMessage}>No other tags yet</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
}

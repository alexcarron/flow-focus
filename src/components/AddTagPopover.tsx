import { useEffect, useMemo, useRef, useState } from 'react';
import Tag from '../model/tag/Tag';
import { useOutsideClickAndEscape } from '../hooks/useOutsideClickAndEscape';
import PlusIcon from './svg-icons/PlusIcon';
import styles from './AddTagPopover.module.css';

interface Props {
	existingTags: Tag[];
	attachedTagIDs: string[];
	onSelectExisting: (tagID: string) => void;
	onCreateAndAttach: (name: string) => Promise<void>;
}

const NO_ITEM_HIGHLIGHTED = -1;

type SuggestionListItem =
	| { type: 'existingTag'; tag: Tag }
	| { type: 'createTag'; name: string };

export default function AddTagPopover({ existingTags, attachedTagIDs, onSelectExisting, onCreateAndAttach }: Props) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [highlightedIndex, setHighlightedIndex] = useState(NO_ITEM_HIGHLIGHTED);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const highlightedItemRef = useRef<HTMLButtonElement>(null);

	const trimmedSearchText = searchText.trim();
	const normalizedSearchText = trimmedSearchText.toLowerCase();

	const matchingExistingTags = useMemo(() => {
		return existingTags
			.filter(tag => !attachedTagIDs.includes(tag.id))
			.filter(tag => tag.name.toLowerCase().includes(normalizedSearchText));
	}, [existingTags, attachedTagIDs, normalizedSearchText]);

	const hasExactMatchingTag = matchingExistingTags.some(tag => tag.name.toLowerCase() === normalizedSearchText);
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
			await onCreateAndAttach(name);
			closePopover();
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : String(error));
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
			if (!attachedTagIDs.includes(matchingExistingTag.id)) selectTag(matchingExistingTag.id);
			else closePopover();
			return;
		}

		await createTag(trimmedSearchText);
	}

	function onKeyDown(event: React.KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setHighlightedIndex(current => Math.min(current + 1, listItems.length - 1));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setHighlightedIndex(current => Math.max(current - 1, NO_ITEM_HIGHLIGHTED));
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (highlightedIndex !== NO_ITEM_HIGHLIGHTED && listItems[highlightedIndex]) {
				activateListItem(listItems[highlightedIndex]);
			} else {
				confirmSearchText();
			}
		}
	}

	return (
		<div ref={containerRef} className={styles.container}>
			<button
				type="button"
				onClick={() => isOpen ? closePopover() : openPopover()}
				className={`${styles.triggerButton} touch-hit-area`}
				aria-label="Add tag"
				title="Add tag"
			>
				<PlusIcon className={styles.triggerIcon} />
			</button>

			{isOpen && (
				<div className={styles.popover}>
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

					{errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

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

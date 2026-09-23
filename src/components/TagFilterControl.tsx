import { useLayoutEffect, useRef, useState } from 'react';
import Tag from '../model/tag/Tag';
import { useOutsideClickAndEscape } from '../hooks/useOutsideClickAndEscape';
import CheckboxInput from './inputs/CheckboxInput';
import FilterIcon from './svg-icons/FilterIcon';
import ChevronDownIcon from './svg-icons/ChevronDownIcon';
import styles from './TagFilterControl.module.css';

interface Props {
	tags: Tag[];
	selectedTagIDs: string[];
	isUntaggedSelected: boolean;
	onToggleTag: (tagID: string) => void;
	onToggleUntagged: () => void;
}

interface FilterItem {
	id: string;
	label: string;
	isSelected: boolean;
	onToggle: () => void;
}

const UNTAGGED_ITEM_ID = 'untagged';

export default function TagFilterControl({ tags, selectedTagIDs, isUntaggedSelected, onToggleTag, onToggleUntagged }: Props) {
	const rowContainerRef = useRef<HTMLDivElement>(null);
	const rowMeasurerRef = useRef<HTMLDivElement>(null);
	const [isRowOverflowing, setIsRowOverflowing] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownContainerRef = useRef<HTMLDivElement>(null);

	const items: FilterItem[] = [
		{ id: UNTAGGED_ITEM_ID, label: 'Untagged', isSelected: isUntaggedSelected, onToggle: onToggleUntagged },
		...tags.map(tag => ({ id: tag.id, label: tag.name, isSelected: selectedTagIDs.includes(tag.id), onToggle: () => onToggleTag(tag.id) })),
	];
	const selectedCount = items.filter(item => item.isSelected).length;

	useLayoutEffect(() => {
		const rowContainer = rowContainerRef.current;
		const rowMeasurer = rowMeasurerRef.current;
		if (!rowContainer || !rowMeasurer) return;

		function checkOverflow() {
			if (!rowContainer || !rowMeasurer) return;
			setIsRowOverflowing(rowMeasurer.scrollWidth > rowContainer.clientWidth);
		}

		checkOverflow();
		const resizeObserver = new ResizeObserver(checkOverflow);
		resizeObserver.observe(rowContainer);
		resizeObserver.observe(rowMeasurer);
		return () => resizeObserver.disconnect();
	}, [items.length]);

	useOutsideClickAndEscape(dropdownContainerRef, isDropdownOpen, () => setIsDropdownOpen(false));

	if (tags.length === 0) return null;

	function renderToggleChip(item: FilterItem) {
		return (
			<button
				key={item.id}
				type="button"
				onClick={item.onToggle}
				aria-pressed={item.isSelected}
				className={item.isSelected ? `${styles.toggleChip} ${styles.toggleChipSelected}` : styles.toggleChip}
			>
				{item.label}
			</button>
		);
	}

	return (
		<div className={styles.container}>
			<div ref={rowMeasurerRef} className={styles.measurerRow} aria-hidden="true">
				{items.map(renderToggleChip)}
			</div>

			{isRowOverflowing ? (
				<div ref={dropdownContainerRef} className={styles.dropdownContainer}>
					<button
						type="button"
						onClick={() => setIsDropdownOpen(current => !current)}
						className={`button outlined ${styles.dropdownButton}`}
					>
						<FilterIcon className={styles.dropdownButtonIcon} />
						Tags{selectedCount > 0 ? ` (${selectedCount})` : ''}
						<ChevronDownIcon className={styles.dropdownButtonCaret} />
					</button>

					{isDropdownOpen && (
						<ul className={styles.dropdownMenu} role="listbox">
							{items.map(item => (
								<li key={item.id}>
									<CheckboxInput value={item.isSelected} onChange={item.onToggle} label={item.label} className={styles.dropdownCheckbox} />
								</li>
							))}
						</ul>
					)}
				</div>
			) : (
				<div ref={rowContainerRef} className={styles.visibleRow}>
					{items.map(renderToggleChip)}
				</div>
			)}
		</div>
	);
}

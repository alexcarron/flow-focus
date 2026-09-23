import Tag from '../model/tag/Tag';
import styles from './InlineTagSuggestionPopover.module.css';

interface Props {
	tags: Tag[];
	highlightedIndex: number;
	position: { left: number; top: number };
	onHoverIndex: (index: number) => void;
	onSelectIndex: (index: number) => void;
}

export default function InlineTagSuggestionPopover({ tags, highlightedIndex, position, onHoverIndex, onSelectIndex }: Props) {
	if (tags.length === 0) return null;

	return (
		<ul
			className={styles.popover}
			style={{ left: position.left, top: position.top }}
			role="listbox"
		>
			{tags.map((tag, index) => (
				<li key={tag.id}>
					<button
						type="button"
						role="option"
						aria-selected={index === highlightedIndex}
						onMouseDown={event => event.preventDefault()}
						onMouseEnter={() => onHoverIndex(index)}
						onClick={() => onSelectIndex(index)}
						className={index === highlightedIndex ? `${styles.suggestion} ${styles.suggestionHighlighted}` : styles.suggestion}
					>
						{tag.name}
					</button>
				</li>
			))}
		</ul>
	);
}

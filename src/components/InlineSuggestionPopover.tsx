import { useLayoutEffect, useRef, useState } from 'react';
import styles from './InlineSuggestionPopover.module.css';

const VIEWPORT_EDGE_MARGIN_PX = 8;

export type InlineSuggestion = {
	key: string;
	label: string;
	detail: string | null;
};

interface Props {
	suggestions: InlineSuggestion[];
	highlightedIndex: number;
	position: { left: number; top: number };
	onHoverIndex: (index: number) => void;
	onSelectIndex: (index: number) => void;
}

export default function InlineSuggestionPopover({ suggestions, highlightedIndex, position, onHoverIndex, onSelectIndex }: Props) {
	const popoverRef = useRef<HTMLUListElement>(null);
	const [clampedLeft, setClampedLeft] = useState(position.left);

	useLayoutEffect(() => {
		const popover = popoverRef.current;
		if (!popover) return;
		const maximumLeft = window.innerWidth - popover.offsetWidth - VIEWPORT_EDGE_MARGIN_PX;
		setClampedLeft(Math.max(VIEWPORT_EDGE_MARGIN_PX, Math.min(position.left, maximumLeft)));
	}, [position.left, suggestions.length]);

	if (suggestions.length === 0) return null;

	return (
		<ul
			ref={popoverRef}
			className={styles.popover}
			style={{ left: clampedLeft, top: position.top }}
			role="listbox"
		>
			{suggestions.map((suggestion, index) => (
				<li key={suggestion.key}>
					<button
						type="button"
						role="option"
						aria-selected={index === highlightedIndex}
						onMouseDown={event => event.preventDefault()}
						onMouseEnter={() => onHoverIndex(index)}
						onClick={() => onSelectIndex(index)}
						title={suggestion.label}
						className={index === highlightedIndex ? `${styles.suggestion} ${styles.suggestionHighlighted}` : styles.suggestion}
					>
						<span className={styles.suggestionLabel}>{suggestion.label}</span>
						{suggestion.detail !== null && (
							<span className={styles.suggestionDetail}>{suggestion.detail}</span>
						)}
					</button>
				</li>
			))}
		</ul>
	);
}

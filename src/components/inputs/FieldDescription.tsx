import { useState } from 'react';
import styles from './FieldDescription.module.css';

interface Props {
	text: string;
	className?: string;
}

export default function FieldDescription({ text, className = '' }: Props) {
	const [isTooltipOpenFromClick, setIsTooltipOpenFromClick] = useState(false);

	return (
		<div className={`${styles.container} ${className}`}>
			<button
				type="button"
				tabIndex={-1}
				className={styles.trigger}
				aria-label={text}
				aria-expanded={isTooltipOpenFromClick}
				onClick={event => {
					event.stopPropagation();
					setIsTooltipOpenFromClick(isOpen => !isOpen);
				}}
				onBlur={() => setIsTooltipOpenFromClick(false)}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={styles.icon}>
					<circle cx="12" cy="12" r="9" />
					<circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
					<path strokeLinecap="round" d="M12 11v5" />
				</svg>
			</button>
			<div
				role="tooltip"
				className={isTooltipOpenFromClick ? `${styles.tooltip} ${styles.tooltipVisible}` : styles.tooltip}
			>
				{text}
			</div>
		</div>
	);
}

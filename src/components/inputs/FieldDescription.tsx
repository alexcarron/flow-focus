import { useRef, useState } from 'react';
import styles from './FieldDescription.module.css';

const TOOLTIP_GAP_PX = 4;
const VIEWPORT_EDGE_MARGIN_PX = 8;

interface Props {
	text: string;
	className?: string;
}

export default function FieldDescription({ text, className = '' }: Props) {
	const [isTooltipOpenFromClick, setIsTooltipOpenFromClick] = useState(false);
	const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);

	function placeTooltipInsideViewport() {
		const trigger = triggerRef.current;
		const tooltip = tooltipRef.current;
		if (!trigger || !tooltip) return;

		const triggerRectangle = trigger.getBoundingClientRect();
		const rightAlignedLeft = triggerRectangle.right - tooltip.offsetWidth;
		const maximumLeft = window.innerWidth - tooltip.offsetWidth - VIEWPORT_EDGE_MARGIN_PX;
		const left = Math.max(VIEWPORT_EDGE_MARGIN_PX, Math.min(rightAlignedLeft, maximumLeft));
		const belowTop = triggerRectangle.bottom + TOOLTIP_GAP_PX;
		const aboveTop = triggerRectangle.top - TOOLTIP_GAP_PX - tooltip.offsetHeight;
		const doesTooltipFitBelow = belowTop + tooltip.offsetHeight <= window.innerHeight - VIEWPORT_EDGE_MARGIN_PX;
		const top = doesTooltipFitBelow ? belowTop : Math.max(VIEWPORT_EDGE_MARGIN_PX, aboveTop);
		setTooltipPosition({ left, top });
	}

	return (
		<div
			className={`${styles.container} ${className}`}
			onPointerEnter={placeTooltipInsideViewport}
		>
			<button
				ref={triggerRef}
				type="button"
				tabIndex={-1}
				className={styles.trigger}
				aria-label={text}
				aria-expanded={isTooltipOpenFromClick}
				onClick={event => {
					event.stopPropagation();
					placeTooltipInsideViewport();
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
				ref={tooltipRef}
				role="tooltip"
				className={isTooltipOpenFromClick ? `${styles.tooltip} ${styles.tooltipVisible}` : styles.tooltip}
				style={tooltipPosition ?? undefined}
			>
				{text}
			</div>
		</div>
	);
}

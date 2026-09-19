import { useLayoutEffect, useRef, useState } from 'react';
import { useOutsideClickAndEscape } from '../../hooks/useOutsideClickAndEscape';
import KeyboardHint from '../KeyboardHint';
import GestureHint from '../GestureHint';
import styles from './ContextMenu.module.css';

export interface ContextMenuItem {
	label: string;
	onClick: () => void;
	isDanger?: boolean;
	hintKeys?: string[];
	hintGesture?: string;
}

interface Props {
	items: ContextMenuItem[];
	position: { x: number; y: number } | null;
	onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: Props) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [clampedPosition, setClampedPosition] = useState<{ x: number; y: number } | null>(null);

	useOutsideClickAndEscape(menuRef, position !== null, onClose);

	useLayoutEffect(() => {
		if (position === null) {
			setClampedPosition(null);
			return;
		}
		if (!menuRef.current) {
			setClampedPosition(position);
			return;
		}

		const menuRect = menuRef.current.getBoundingClientRect();
		const clampedX = Math.min(position.x, window.innerWidth - menuRect.width);
		const clampedY = Math.min(position.y, window.innerHeight - menuRect.height);
		setClampedPosition({ x: Math.max(clampedX, 0), y: Math.max(clampedY, 0) });
	}, [position]);

	if (position === null) return null;

	const displayPosition = clampedPosition ?? position;

	return (
		<div
			ref={menuRef}
			className={styles.menu}
			style={{ transform: `translate(${displayPosition.x}px, ${displayPosition.y}px)` }}
		>
			{items.map(item => (
				<button
					key={item.label}
					onClick={() => {
						item.onClick();
						onClose();
					}}
					className={item.isDanger ? `${styles.menuItem} ${styles.menuItemDanger}` : styles.menuItem}
				>
					<span className={styles.menuItemLabel}>{item.label}</span>
					{item.hintKeys && <KeyboardHint keys={item.hintKeys} />}
					{item.hintGesture && <GestureHint text={item.hintGesture} />}
				</button>
			))}
		</div>
	);
}

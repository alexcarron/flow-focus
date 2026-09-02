import styles from './SelectionCheckbox.module.css';

interface Props {
	isSelected: boolean;
	onMouseDown: (event: React.MouseEvent) => void;
	onMouseEnter?: (event: React.MouseEvent) => void;
	onToggle?: () => void;
	rowID?: string;
	className?: string;
}

export default function SelectionCheckbox({ isSelected, onMouseDown, onMouseEnter, onToggle, rowID, className = '' }: Props) {
	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			onToggle?.();
		}
	}

	return (
		<div
			role="checkbox"
			aria-checked={isSelected}
			tabIndex={0}
			data-row-id={rowID}
			onMouseDown={e => { e.preventDefault(); onMouseDown(e); }}
			onMouseEnter={onMouseEnter}
			onKeyDown={onKeyDown}
			className={`${styles.box} ${isSelected ? styles.boxChecked : ''} ${className}`}
		>
			{isSelected && (
				<svg className={styles.checkmark} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			)}
		</div>
	);
}

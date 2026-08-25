import styles from './SelectionCheckbox.module.css';

interface Props {
	isSelected: boolean;
	onMouseDown: () => void;
	onMouseEnter?: () => void;
	className?: string;
}

export default function SelectionCheckbox({ isSelected, onMouseDown, onMouseEnter, className = '' }: Props) {
	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			onMouseDown();
		}
	}

	return (
		<div
			role="checkbox"
			aria-checked={isSelected}
			tabIndex={0}
			onMouseDown={e => { e.preventDefault(); onMouseDown(); }}
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

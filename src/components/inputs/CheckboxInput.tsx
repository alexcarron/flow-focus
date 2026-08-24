import styles from './CheckboxInput.module.css';

interface Props {
	value: boolean;
	onChange: (value: boolean) => void;
	label?: string;
	className?: string;
}

export default function CheckboxInput({ value, onChange, label, className = '' }: Props) {
	return (
		<label className={`${styles.checkbox} ${className}`}>
			<div
				role="checkbox"
				aria-checked={value}
				tabIndex={0}
				onClick={() => onChange(!value)}
				onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange(!value); }}
				className={value ? `${styles.box} ${styles.boxChecked}` : styles.box}
			>
				{value && (
					<svg className={styles.checkmark} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				)}
			</div>
			{label && <span className={styles.label}>{label}</span>}
		</label>
	);
}

import { cloneElement } from 'react';
import FieldDescription from './FieldDescription';
import CheckIcon from '../svg-icons/CheckIcon';
import styles from './CheckboxInput.module.css';

interface Props {
	value: boolean;
	onChange: (value: boolean, event: React.MouseEvent | React.KeyboardEvent) => void;
	label?: string;
	description?: string;
	className?: string;
	icon?: React.ReactElement<{ className?: string }>;
}

export default function CheckboxInput({ value, onChange, label, description, className = '', icon = <CheckIcon /> }: Props) {
	return (
		<label className={`${styles.checkbox} ${className}`}>
			<div
				role="checkbox"
				aria-checked={value}
				tabIndex={0}
				onClick={event => onChange(!value, event)}
				onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') onChange(!value, event); }}
				className={value ? `${styles.box} ${styles.boxChecked}` : styles.box}
			>
				{value && cloneElement(icon, { className: styles.checkmark })}
			</div>
			{label && <span className={styles.label}>{label}</span>}
			{description && <FieldDescription text={description} />}
		</label>
	);
}

import MandatoryIcon from './svg-icons/MandatoryIcon';
import styles from './MandatoryCheckbox.module.css';

interface Props {
	isMandatory: boolean;
	onToggle: () => void;
	className?: string;
}

export default function MandatoryCheckbox({ isMandatory, onToggle, className = '' }: Props) {
	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			onToggle();
		}
	}

	return (
		<div
			role="checkbox"
			aria-checked={isMandatory}
			tabIndex={0}
			onClick={onToggle}
			onKeyDown={onKeyDown}
			className={`${styles.box} ${isMandatory ? styles.boxChecked : ''} ${className}`}
		>
			{isMandatory && <MandatoryIcon className={styles.icon} />}
		</div>
	);
}

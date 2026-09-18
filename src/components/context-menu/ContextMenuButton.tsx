import MoreOptionsIcon from '../svg-icons/MoreOptionsIcon';
import styles from './ContextMenuButton.module.css';

interface Props {
	onOpen: (x: number, y: number) => void;
	label?: string;
	className?: string;
}

export default function ContextMenuButton({ onOpen, label = 'More options', className = '' }: Props) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-haspopup="menu"
			className={`button icon touch-hit-area ${styles.button} ${className}`.trim()}
			onMouseDown={event => event.stopPropagation()}
			onClick={event => {
				event.stopPropagation();
				const buttonRect = event.currentTarget.getBoundingClientRect();
				onOpen(buttonRect.left, buttonRect.bottom);
			}}
		>
			<MoreOptionsIcon className={styles.icon} />
		</button>
	);
}

import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import styles from './GestureHint.module.css';

interface Props {
	text: string;
	className?: string;
}

export default function GestureHint({ text, className = '' }: Props) {
	const isTouchDevice = useIsTouchDevice();
	if (!isTouchDevice) return null;

	return (
		<span className={`${styles.hint} ${className}`}>{text}</span>
	);
}

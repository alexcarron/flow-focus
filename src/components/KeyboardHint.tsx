import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import styles from './KeyboardHint.module.css';

interface Props {
	keys: string[];
	className?: string;
}

export default function KeyboardHint({ keys, className = '' }: Props) {
	const isTouchDevice = useIsTouchDevice();
	if (isTouchDevice) return null;

	return (
		<span className={`${styles.hint} ${className}`}>
			{keys.map((key, index) => (
				<kbd key={index} className={styles.key}>{key}</kbd>
			))}
		</span>
	);
}

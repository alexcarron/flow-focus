import styles from './KeyboardHint.module.css';

interface Props {
	keys: string[];
	className?: string;
}

export default function KeyboardHint({ keys, className = '' }: Props) {
	return (
		<span className={`${styles.hint} ${className}`}>
			{keys.map((key, index) => (
				<kbd key={index} className={styles.key}>{key}</kbd>
			))}
		</span>
	);
}

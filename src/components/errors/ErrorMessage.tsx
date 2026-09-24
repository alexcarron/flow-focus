import styles from './ErrorMessage.module.css';

interface Props {
	message: string | null;
}

export default function ErrorMessage({ message }: Props) {
	if (!message) return null;

	return (
		<p role="alert" className={styles.errorMessage}>{message}</p>
	);
}

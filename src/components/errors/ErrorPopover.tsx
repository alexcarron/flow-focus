import styles from './ErrorPopover.module.css';

interface Props {
	message: string | null;
}

export default function ErrorPopover({ message }: Props) {
	if (!message) return null;

	return (
		<span role="alert" className={styles.errorPopover}>{message}</span>
	);
}

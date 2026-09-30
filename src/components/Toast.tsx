import { useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';
import styles from './Toast.module.css';

const TOAST_VISIBLE_DURATION_MILLISECONDS = 2500;

export default function Toast() {
	const visibleToast = useToastStore(state => state.visibleToast);
	const hideToast = useToastStore(state => state.hideToast);

	useEffect(() => {
		if (visibleToast === null) return;
		const hideToastTimeoutID = setTimeout(hideToast, TOAST_VISIBLE_DURATION_MILLISECONDS);
		return () => clearTimeout(hideToastTimeoutID);
	}, [visibleToast, hideToast]);

	return (
		<div role="status" aria-live="polite" className={styles.toastRegion}>
			{visibleToast !== null && (
				<div
					key={visibleToast.id}
					className={styles.toast}
					style={{ animationDuration: `${TOAST_VISIBLE_DURATION_MILLISECONDS}ms` }}
				>
					{visibleToast.message}
				</div>
			)}
		</div>
	);
}

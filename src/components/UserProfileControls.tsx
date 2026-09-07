import { useRef, useState } from 'react';
import { useUserAuthorization } from '../hooks/useUserAuthorization';
import { useSyncStatusIndicator } from '../hooks/useSyncStatusIndicator';
import { useTasksStore } from '../stores/tasksStore';
import GoogleIcon from './svg-icons/GoogleIcon';
import SyncStatusIcon from './svg-icons/SyncStatusIcon';
import SignOutConfirmationModal from './SignOutConfirmationModal';
import styles from './UserProfileControls.module.css';

export default function UserProfileControls() {
	const {
		user,
		displayName,
		isLoading,
		isSignOutConfirmationRequired,
		signInWithGoogle,
		signOut,
		confirmSignOut,
		cancelSignOutConfirmation,
		updateDisplayName,
	} = useUserAuthorization();
	const { state: syncStatusState, tooltipText: syncStatusTooltipText } = useSyncStatusIndicator();
	const areTasksLoading = useTasksStore(s => s.isLoading);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const displayNameRef = useRef<HTMLSpanElement>(null);

	async function onSignInClick() {
		setErrorMessage(null);
		try {
			await signInWithGoogle();
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : 'Failed to sign in.');
		}
	}

	async function onSignOutClick() {
		setErrorMessage(null);
		try {
			await signOut();
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : 'Failed to sign out.');
		}
	}

	async function onConfirmSignOutClick() {
		setErrorMessage(null);
		try {
			await confirmSignOut();
		} 
		catch (err) {
			setErrorMessage(err instanceof Error ? err.message : 'Failed to sign out.');
		}
	}

	async function onDisplayNameBlur(event: React.FocusEvent<HTMLSpanElement>) {
		const newDisplayName = event.currentTarget.textContent ?? '';
		if (!newDisplayName.trim() || newDisplayName === displayName) {
			if (displayNameRef.current) displayNameRef.current.textContent = displayName;
			return;
		}
		try {
			await updateDisplayName(newDisplayName);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : 'Failed to update display name.');
			if (displayNameRef.current) displayNameRef.current.textContent = displayName;
		}
	}

	if (isLoading || areTasksLoading) return null;

	if (!user) {
		return (
			<div className={styles.controls}>
				<button onClick={onSignInClick} className="button small outlined">
					<GoogleIcon className={styles.googleIcon} />
					Sign in with Google
				</button>
				{errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
			</div>
		);
	}

	return (
		<div className={styles.controls}>
			<span className={styles.syncStatusIcon} title={syncStatusTooltipText} aria-label={syncStatusTooltipText}>
				<SyncStatusIcon state={syncStatusState} />
			</span>
			<span
				ref={displayNameRef}
				contentEditable
				suppressContentEditableWarning
				onBlur={onDisplayNameBlur}
				className={styles.displayName}
			>
				{displayName}
			</span>
			<button onClick={onSignOutClick} className="button small">
				Sign out
			</button>
			{errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
			<SignOutConfirmationModal
				isOpen={isSignOutConfirmationRequired}
				onConfirm={onConfirmSignOutClick}
				onClose={cancelSignOutConfirmation}
			/>
		</div>
	);
}

import { useEffect, useState } from 'react';

const REQUIRED_CONFIRMATION_PHRASE = 'delete my changes';

interface Props {
	isOpen: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export default function SignOutConfirmationModal({ isOpen, onConfirm, onClose }: Props) {
	const [typedPhrase, setTypedPhrase] = useState('');
	const isPhraseConfirmed = typedPhrase.trim().toLowerCase() === REQUIRED_CONFIRMATION_PHRASE;

	useEffect(() => {
		if (isOpen) setTypedPhrase('');
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			className="modal-overlay"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="modal-backdrop" />
			<div className="modal">
				<h2 className="modal-title">Sign out with unsynced changes?</h2>
				<p>
					Some of your changes haven't finished syncing to the cloud yet. Signing out now will leave this
					device's copy of them behind. To continue, type "{REQUIRED_CONFIRMATION_PHRASE}" below.
				</p>
				<input
					type="text"
					value={typedPhrase}
					onChange={e => setTypedPhrase(e.target.value)}
					placeholder={REQUIRED_CONFIRMATION_PHRASE}
					className="field"
					autoFocus
				/>
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={onConfirm} className="button danger" disabled={!isPhraseConfirmed}>
						Sign out
					</button>
				</div>
			</div>
		</div>
	);
}

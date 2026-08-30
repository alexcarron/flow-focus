import { useEffect } from 'react';

interface Props {
	headingText: string;
	descriptionText: string;
	confirmButtonLabel?: string;
	cancelButtonLabel?: string;
	isConfirmDanger?: boolean;
	isOpen: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export default function ConfirmModal({
	headingText,
	descriptionText,
	confirmButtonLabel = 'Confirm',
	cancelButtonLabel = 'Cancel',
	isConfirmDanger = true,
	isOpen,
	onConfirm,
	onClose,
}: Props) {
	useEffect(() => {
		if (!isOpen) return;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Delete') {
				event.preventDefault();
				onConfirm();
			}
		}

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isOpen, onConfirm]);

	if (!isOpen) return null;

	return (
		<div
			className="modal-overlay"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="modal-backdrop" />
			<div className="modal">
				<h2 className="modal-title">{headingText}</h2>
				<p>{descriptionText}</p>
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						{cancelButtonLabel}
					</button>
					<button onClick={onConfirm} className={isConfirmDanger ? 'button danger' : 'button'}>
						{confirmButtonLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

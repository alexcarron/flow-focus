interface Props {
	stepLabel: string;
	isOpen: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export default function DeleteStepConfirmModal({ stepLabel, isOpen, onConfirm, onClose }: Props) {
	if (!isOpen) return null;

	return (
		<div
			className="modal-overlay"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="modal-backdrop" />
			<div className="modal">
				<h2 className="modal-title">Delete step?</h2>
				<p>{`"${stepLabel}" will be permanently deleted. This cannot be undone.`}</p>
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={onConfirm} className="button danger">
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}

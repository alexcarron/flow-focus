import { useEffect, useState } from 'react';
import CheckboxInput from './inputs/CheckboxInput';

interface Props {
	isOpen: boolean;
	onConfirm: (shouldKeepLocalData: boolean) => void;
	onDecline: () => void;
}

export default function MigrateLocalDataToCloudConfirmationModal({ isOpen, onConfirm, onDecline }: Props) {
	const [shouldKeepLocalData, setShouldKeepLocalData] = useState(false);

	useEffect(() => {
		if (isOpen) setShouldKeepLocalData(false);
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="modal-overlay">
			<div className="modal-backdrop" />
			<div className="modal">
				<h2 className="modal-title">Add your tasks to your account?</h2>
				<p>
					You have tasks and/or settings saved on this browser that aren't connected to any account, but the account you just signed into doesn't have any tasks in it yet.
				</p>
				<p>
					Do you want to move the tasks from this browser into your account?
				</p>
				<p>
					If you choose not to, your account will just start empty, and the tasks on this browser will come back when you sign out.
				</p>
				<CheckboxInput
					value={shouldKeepLocalData}
					onChange={setShouldKeepLocalData}
					label="Keep a copy of the tasks on this browser, so they're still here if I sign out"
				/>
				<div className="modal-actions">
					<button onClick={onDecline} className="button">
						No, start my account with no tasks
					</button>
					<button onClick={() => onConfirm(shouldKeepLocalData)} className="button primary">
						Yes, move my tasks to my account
					</button>
				</div>
			</div>
		</div>
	);
}

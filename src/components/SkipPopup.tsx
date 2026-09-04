import { useState } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import DatetimeInput from './inputs/DatetimeInput';

interface Props {
	task: Task;
	isOpen: boolean;
	onClose: () => void;
}

export default function SkipPopup({ task, isOpen, onClose }: Props) {
	const [deferUntilDate, setDeferUntilDate] = useState<Date | null>(null);
	const deferTaskUntil = useTasksStore(s => s.deferTaskUntil);

	if (!isOpen) return null;

	function handleConfirm() {
		if (deferUntilDate !== null) {
			deferTaskUntil(task, deferUntilDate);
		}
		onClose();
	}

	return (
		<div
			className="modal-overlay"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="modal-backdrop" />
			<div className="modal">
				<h2 className="modal-title">Skip task until…</h2>
				<DatetimeInput
					value={deferUntilDate}
					onChange={setDeferUntilDate}
					label="New Start Date"
					defaultTimeOfDay="morning"
				/>
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={handleConfirm} className="button primary" disabled={deferUntilDate === null}>
						Skip
					</button>
				</div>
			</div>
		</div>
	);
}

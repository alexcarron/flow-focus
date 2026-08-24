import { useState } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import DurationInput from './inputs/DurationInput';

interface Props {
	task: Task;
	isOpen: boolean;
	onClose: () => void;
}

const DEFAULT_SKIP_MS = 3_600_000; // 1 hour

export default function SkipPopup({ task, isOpen, onClose }: Props) {
	const [durationMs, setDurationMs] = useState<number | null>(DEFAULT_SKIP_MS);
	const deferTask = useTasksStore(s => s.deferTask);

	if (!isOpen) return null;

	function handleConfirm() {
		if (durationMs !== null) {
			deferTask(task, durationMs);
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
				<h2 className="modal-title">Skip task for…</h2>
				<DurationInput
					value={durationMs}
					onChange={setDurationMs}
					label="Defer by"
				/>
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={handleConfirm} className="button primary">
						Skip
					</button>
				</div>
			</div>
		</div>
	);
}

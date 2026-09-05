import { useState, useEffect } from 'react';
import Task from '../model/task/Task';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import { StartTimeAfterEndTimeError, StartTimeAfterDeadlineError } from '../model/task/TaskTimingError';
import { useTasksStore } from '../stores/tasksStore';
import TimingOptionsInput from './inputs/TimingOptionsInput';

interface Props {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
}

export default function TimingOptionsPopup({ task, isOpen, onClose }: Props) {
	const setTimingOptions = useTasksStore(s => s.setTimingOptions);
	const [options, setOptions] = useState<TaskTimingOptions | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (task && isOpen) {
			setOptions(task.getTaskTimingOptions());
			setError(null);
		}
	}, [task, isOpen]);

	if (!isOpen || !task || !options) return null;

	function handleConfirm() {
		if (!task || !options) return;

		try {
			setTimingOptions(task, options);
		} catch (timingError) {
			if (timingError instanceof StartTimeAfterEndTimeError) {
				setError('Start time cannot be after end time.');
			} else if (timingError instanceof StartTimeAfterDeadlineError) {
				setError('Start time cannot be after the deadline.');
			} else {
				setError('Failed to update timing options.');
			}
			return;
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
				<h2 className="modal-title">Timing Options</h2>
				<TimingOptionsInput value={options} onChange={setOptions} />
				{error && <p className="modal-error">{error}</p>}
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={handleConfirm} className="button primary">
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
}

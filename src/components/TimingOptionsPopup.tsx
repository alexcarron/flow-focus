import { useState } from 'react';
import Task from '../model/task/Task';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import { getDateOrderErrorMessage } from '../model/task/TaskTimingError';
import { useTasksStore } from '../stores/tasksStore';
import TimingOptionsInput from './inputs/TimingOptionsInput';
import ErrorMessage from './errors/ErrorMessage';

interface Props {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
}

export default function TimingOptionsPopup({ task, isOpen, onClose }: Props) {
	const setTimingOptions = useTasksStore(s => s.setTimingOptions);
	const [options, setOptions] = useState<TaskTimingOptions | null>(() => task && isOpen ? task.getTaskTimingOptions() : null);
	const [error, setError] = useState<string | null>(null);
	const [taskOnPreviousRender, setTaskOnPreviousRender] = useState(task);
	const [wasOpenOnPreviousRender, setWasOpenOnPreviousRender] = useState(isOpen);

	if (task !== taskOnPreviousRender || isOpen !== wasOpenOnPreviousRender) {
		setTaskOnPreviousRender(task);
		setWasOpenOnPreviousRender(isOpen);
		if (task && isOpen) {
			setOptions(task.getTaskTimingOptions());
			setError(null);
		}
	}

	if (!isOpen || !task || !options) return null;

	function handleConfirm() {
		if (!task || !options) return;

		try {
			setTimingOptions(task, options);
		} catch (timingError) {
			setError(getDateOrderErrorMessage(timingError) ?? 'Failed to update timing options.');
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
				<ErrorMessage message={error} />
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

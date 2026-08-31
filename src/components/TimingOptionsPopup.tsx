import { useState, useEffect } from 'react';
import Task from '../model/task/Task';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
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

	useEffect(() => {
		if (task && isOpen) {
			setOptions(task.getTaskTimingOptions());
		}
	}, [task, isOpen]);

	if (!isOpen || !task || !options) return null;

	function handleConfirm() {
		if (task && options) {
			setTimingOptions(task, options);
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

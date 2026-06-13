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
			className="fixed inset-0 z-50 flex items-center justify-center"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="absolute inset-0 bg-black/60 pointer-events-none" />
			<div className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
				<h2 className="text-lg font-semibold text-white">Timing Options</h2>
				<TimingOptionsInput value={options} onChange={setOptions} />
				<div className="flex gap-2 justify-end">
					<button
						onClick={onClose}
						className="px-4 py-1.5 text-sm rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
					>
						Cancel
					</button>
					<button
						onClick={handleConfirm}
						className="px-4 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
}

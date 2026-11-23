import { useMemo, useState } from 'react';
import Task from '../model/task/Task';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import { getTaskTimingErrorMessage } from '../model/task/TaskTimingError';
import { canTaskBePrerequisiteTaskOfTask } from '../model/task/sequence/taskSequence';
import { selectTasksInPriorityOrder, useTasksStore } from '../stores/tasksStore';
import TimingOptionsInput from './inputs/TimingOptionsInput';
import PrerequisiteTasksInput from './inputs/PrerequisiteTasksInput';
import ErrorMessage from './errors/ErrorMessage';

interface Props {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
}

export default function TimingOptionsPopup({ task, isOpen, onClose }: Props) {
	const setTimingOptionsAndPrerequisiteTasks = useTasksStore(s => s.setTimingOptionsAndPrerequisiteTasks);
	const tasks = useTasksStore(s => s.tasks);
	const [options, setOptions] = useState<TaskTimingOptions | null>(() => task && isOpen ? task.getTaskTimingOptions() : null);
	const [prerequisiteTaskIDs, setPrerequisiteTaskIDs] = useState<string[]>(() => task && isOpen ? task.getPrerequisiteTaskIDs() : []);
	const [error, setError] = useState<string | null>(null);
	const [taskOnPreviousRender, setTaskOnPreviousRender] = useState(task);
	const [wasOpenOnPreviousRender, setWasOpenOnPreviousRender] = useState(isOpen);

	if (task !== taskOnPreviousRender || isOpen !== wasOpenOnPreviousRender) {
		setTaskOnPreviousRender(task);
		setWasOpenOnPreviousRender(isOpen);
		if (task && isOpen) {
			setOptions(task.getTaskTimingOptions());
			setPrerequisiteTaskIDs(task.getPrerequisiteTaskIDs());
			setError(null);
		}
	}

	const tasksInPriorityOrder = useMemo(
		() => isOpen ? selectTasksInPriorityOrder(useTasksStore.getState()) : [],
		[isOpen, tasks]
	);

	if (!isOpen || !task || !options) return null;

	const prerequisiteTasks = tasks.filter(otherTask => prerequisiteTaskIDs.includes(otherTask.id));
	const candidateTasksInPriorityOrder = tasksInPriorityOrder.filter(candidateTask =>
		!prerequisiteTaskIDs.includes(candidateTask.id) &&
		canTaskBePrerequisiteTaskOfTask({
			candidateTask,
			dependentTask: task,
			tasks,
		})
	);

	function handleConfirm() {
		if (!task || !options) return;

		try {
			setTimingOptionsAndPrerequisiteTasks({
				task,
				timingOptions: options,
				prerequisiteTaskIDs,
			});
		} catch (timingError) {
			setError(getTaskTimingErrorMessage(timingError) ?? 'Failed to update timing options.');
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
				{options.recurrenceDuration === null && (
					<PrerequisiteTasksInput
						prerequisiteTasks={prerequisiteTasks}
						candidateTasksInPriorityOrder={candidateTasksInPriorityOrder}
						onAdd={prerequisiteTask => setPrerequisiteTaskIDs(previous => [...previous, prerequisiteTask.id])}
						onRemove={prerequisiteTask => setPrerequisiteTaskIDs(previous => previous.filter(prerequisiteTaskID => prerequisiteTaskID !== prerequisiteTask.id))}
					/>
				)}
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

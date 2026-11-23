import { useState } from 'react';
import Task from '../../model/task/Task';
import PrerequisiteTaskChip from '../PrerequisiteTaskChip';
import PrerequisiteTaskPickerPopup from '../PrerequisiteTaskPickerPopup';
import FieldDescription from './FieldDescription';
import styles from './PrerequisiteTasksInput.module.css';

interface Props {
	prerequisiteTasks: Task[];
	candidateTasksInPriorityOrder: Task[];
	onAdd: (prerequisiteTask: Task) => void;
	onRemove: (prerequisiteTask: Task) => void;
}

export default function PrerequisiteTasksInput({ prerequisiteTasks, candidateTasksInPriorityOrder, onAdd, onRemove }: Props) {
	const [pickerAnchorPosition, setPickerAnchorPosition] = useState<{ x: number; y: number } | null>(null);

	function openPickerBelowButton(button: HTMLButtonElement) {
		const buttonRectangle = button.getBoundingClientRect();
		setPickerAnchorPosition({ x: buttonRectangle.left, y: buttonRectangle.bottom });
	}

	return (
		<div className={styles.container}>
			<FieldDescription
				text="This task stays hidden until these tasks are completed. Leave blank if it doesn't have to wait for another task."
				className={styles.description}
			/>
			<label className={styles.heading}>Do after tasks</label>
			<div className={styles.chipsRow}>
				{prerequisiteTasks.map(prerequisiteTask => (
					<PrerequisiteTaskChip
						key={prerequisiteTask.id}
						prerequisiteTask={prerequisiteTask}
						onRemove={() => onRemove(prerequisiteTask)}
					/>
				))}
				<button
					type="button"
					onClick={event => openPickerBelowButton(event.currentTarget)}
					className="button small"
				>
					+ Add
				</button>
			</div>
			<PrerequisiteTaskPickerPopup
				anchorPosition={pickerAnchorPosition}
				candidateTasksInPriorityOrder={candidateTasksInPriorityOrder}
				onPick={onAdd}
				onClose={() => setPickerAnchorPosition(null)}
			/>
		</div>
	);
}

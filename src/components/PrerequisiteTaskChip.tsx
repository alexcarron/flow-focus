import Task from '../model/task/Task';
import CloseIcon from './svg-icons/CloseIcon';
import styles from './PrerequisiteTaskChip.module.css';

interface Props {
	prerequisiteTask: Task;
	onRemove: () => void;
}

export default function PrerequisiteTaskChip({ prerequisiteTask, onRemove }: Props) {
	const prerequisiteTaskName = prerequisiteTask.getDescription();
	const nameClassName = prerequisiteTask.getIsComplete() ? `${styles.name} ${styles.nameCompleted}` : styles.name;

	return (
		<span className={styles.chip}>
			<span className={nameClassName} title={prerequisiteTaskName}>{prerequisiteTaskName}</span>
			<button
				type="button"
				onClick={onRemove}
				className={`${styles.removeButton} touch-hit-area`}
				aria-label={`Stop waiting for ${prerequisiteTaskName}`}
				title={`Stop waiting for ${prerequisiteTaskName}`}
			>
				<CloseIcon className={styles.removeIcon} />
			</button>
		</span>
	);
}

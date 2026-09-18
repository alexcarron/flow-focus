import { useTasksStore } from '../stores/tasksStore';
import UndoIcon from './svg-icons/UndoIcon';
import RedoIcon from './svg-icons/RedoIcon';
import styles from './UndoRedoButtons.module.css';

export default function UndoRedoButtons() {
	const canUndo = useTasksStore(s => s.undoStack.length > 0);
	const canRedo = useTasksStore(s => s.redoStack.length > 0);
	const undo = useTasksStore(s => s.undo);
	const redo = useTasksStore(s => s.redo);

	return (
		<div className={styles.buttons}>
			<button
				type="button"
				onClick={undo}
				disabled={!canUndo}
				aria-label="Undo"
				className={`button icon touch-hit-area ${styles.button}`}
			>
				<UndoIcon className={styles.icon} />
			</button>
			<button
				type="button"
				onClick={redo}
				disabled={!canRedo}
				aria-label="Redo"
				className={`button icon touch-hit-area ${styles.button}`}
			>
				<RedoIcon className={styles.icon} />
			</button>
		</div>
	);
}

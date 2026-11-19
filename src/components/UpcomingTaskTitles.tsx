import { useShallow } from 'zustand/react/shallow';
import { useTasksStore, selectUpcomingTasks } from '../stores/tasksStore';
import styles from './UpcomingTaskTitles.module.css';

export default function UpcomingTaskTitles() {
	const upcomingTasks = useTasksStore(useShallow(selectUpcomingTasks));
	const temporarilyFocusTask = useTasksStore(state => state.temporarilyFocusTask);
	useTasksStore(state => state.tasks);

	if (upcomingTasks.length === 0) return null;

	return (
		<ul className={styles.titles}>
			{upcomingTasks.map(task => (
				<li key={task.id} className={styles.titleRow}>
					<button
						type="button"
						className={styles.title}
						onClick={() => temporarilyFocusTask(task)}
					>
						{task.getDescription()}
					</button>
				</li>
			))}
		</ul>
	);
}

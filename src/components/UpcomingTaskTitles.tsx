import { useShallow } from 'zustand/react/shallow';
import { useTasksStore, selectUpcomingTaskTitles } from '../stores/tasksStore';
import styles from './UpcomingTaskTitles.module.css';

export default function UpcomingTaskTitles() {
	const upcomingTaskTitles = useTasksStore(useShallow(selectUpcomingTaskTitles));

	if (upcomingTaskTitles.length === 0) return null;

	return (
		<ul className={styles.titles}>
			{upcomingTaskTitles.map((title, index) => (
				<li key={index} className={styles.title}>{title}</li>
			))}
		</ul>
	);
}

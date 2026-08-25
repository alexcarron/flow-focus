import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useTasksStore } from './stores/tasksStore';
import { useSettingsStore } from './stores/settingsStore';
import FocusPage from './pages/FocusPage';
import TasksManagerPage from './pages/TasksManagerPage';
import TaskCreatorPage from './pages/TaskCreatorPage';
import SettingsPage from './pages/SettingsPage';
import styles from './App.module.css';

function navLinkClass({ isActive }: { isActive: boolean }) {
	return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

export default function App() {
	const isLoading = useTasksStore(s => s.isLoading);
	const loadTasks = useTasksStore(s => s.loadTasks);
	const loadSettings = useSettingsStore(s => s.loadSettings);

	useEffect(() => {
		loadTasks();
		loadSettings();
	}, [loadTasks, loadSettings]);

	return (
		<div className={styles.app}>
			<nav className={styles.nav}>
				<NavLink to="/" end className={navLinkClass}>
					Focus
				</NavLink>
				<NavLink to="/tasks" className={navLinkClass}>
					All Tasks
				</NavLink>
				<NavLink to="/create-task" className={navLinkClass}>
					Create Task
				</NavLink>
				<NavLink to="/settings" className={navLinkClass}>
					Settings
				</NavLink>
			</nav>

			{isLoading ? (
				<div className={styles.loading}>
					<div className={styles.spinner} />
				</div>
			) : (
				<main className={styles.content}>
					<Routes>
						<Route path="/" element={<FocusPage />} />
						<Route path="/tasks" element={<TasksManagerPage />} />
						<Route path="/create-task" element={<TaskCreatorPage />} />
						<Route path="/settings" element={<SettingsPage />} />
					</Routes>
				</main>
			)}
		</div>
	);
}

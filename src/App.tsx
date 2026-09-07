import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useTasksStore } from './stores/tasksStore';
import { useSettingsStore } from './stores/settingsStore';
import { useUserAuthorization } from './hooks/useUserAuthorization';
import { useRepositorySwitcher } from './hooks/useRepositorySwitcher';
import FocusPage from './components/pages/FocusPage';
import TasksManagerPage from './components/pages/TasksManagerPage';
import TaskCreatorPage from './components/pages/TaskCreatorPage';
import QuickToDoPage from './components/pages/QuickToDoPage';
import SettingsPage from './components/pages/SettingsPage';
import UserProfileControls from './components/UserProfileControls';
import ConfirmModal from './components/ConfirmModal';
import styles from './App.module.css';

function navLinkClass({ isActive }: { isActive: boolean }) {
	return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

export default function App() {
	const isLoading = useTasksStore(s => s.isLoading);
	const loadTasks = useTasksStore(s => s.loadTasks);
	const loadSettings = useSettingsStore(s => s.loadSettings);
	const { user } = useUserAuthorization();

	useEffect(() => {
		loadTasks();
		loadSettings();
	}, [loadTasks, loadSettings]);

	const { isMigrationConfirmationRequired, confirmMigration, declineMigration } = useRepositorySwitcher(user);

	return (
		<div className={styles.app}>
			<nav className={styles.nav}>
				<NavLink to="/" end className={navLinkClass}>
					Focus
				</NavLink>
				<NavLink to="/tasks" className={navLinkClass}>
					Manage Tasks
				</NavLink>
				<NavLink to="/create-task" className={navLinkClass}>
					Create Task
				</NavLink>
				<NavLink to="/quick-to-do" className={navLinkClass}>
					Quick To Do
				</NavLink>
				<NavLink to="/settings" className={navLinkClass}>
					Settings
				</NavLink>
				<UserProfileControls />
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
						<Route path="/quick-to-do" element={<QuickToDoPage />} />
						<Route path="/settings" element={<SettingsPage />} />
					</Routes>
				</main>
			)}

			<ConfirmModal
				headingText="Move your local task data to this account?"
				descriptionText="You have tasks, settings, and/or a quick to-do checklist saved on this browser, and the account you signed into has no tasks yet. Do you want to move them to your account, losing access to them if you sign out? If you say no, your account starts empty. "
				confirmButtonLabel="Yes, move it"
				cancelButtonLabel="No, start with no tasks"
				isConfirmDanger={false}
				isOpen={isMigrationConfirmationRequired}
				onConfirm={confirmMigration}
				onClose={declineMigration}
			/>
		</div>
	);
}

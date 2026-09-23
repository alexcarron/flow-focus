import { useEffect } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useTasksStore } from './stores/tasksStore';
import { useSettingsStore } from './stores/settingsStore';
import { useTagsStore } from './stores/tagsStore';
import { useUserAuthorization } from './hooks/useUserAuthorization';
import { useRepositorySwitcher } from './hooks/useRepositorySwitcher';
import FocusPage from './components/pages/FocusPage';
import TasksManagerPage from './components/pages/TasksManagerPage';
import TaskCreatorPage from './components/pages/TaskCreatorPage';
import QuickToDoPage from './components/pages/QuickToDoPage';
import SettingsPage from './components/pages/SettingsPage';
import UserProfileControls from './components/UserProfileControls';
import UndoRedoButtons from './components/UndoRedoButtons';
import { useIsTouchDevice } from './hooks/useIsTouchDevice';
import MigrateLocalDataToCloudConfirmationModal from './components/MigrateLocalDataToCloudConfirmationModal';
import styles from './App.module.css';

function navLinkClass({ isActive }: { isActive: boolean }) {
	return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

export default function App() {
	const areTasksLoading = useTasksStore(state => state.isLoading);
	const loadTasks = useTasksStore(state => state.loadTasks);
	const loadSettings = useSettingsStore(state => state.loadSettings);
	const loadTags = useTagsStore(state => state.loadTags);
	const { user, isLoading: isUserAuthorizationLoading } = useUserAuthorization();
	const isAppDataSettling = areTasksLoading || isUserAuthorizationLoading;
	const isTouchDevice = useIsTouchDevice();

	useEffect(() => {
		loadTasks();
		loadSettings();
		loadTags();
	}, [loadTasks, loadSettings, loadTags]);

	const { isMigrationConfirmationRequired, confirmMigration, declineMigration } = useRepositorySwitcher(user, isUserAuthorizationLoading);

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
				{isTouchDevice && <UndoRedoButtons />}
				<UserProfileControls />
			</nav>

			{isAppDataSettling ? (
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
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</main>
			)}

			<MigrateLocalDataToCloudConfirmationModal
				isOpen={isMigrationConfirmationRequired}
				onConfirm={confirmMigration}
				onDecline={declineMigration}
			/>
		</div>
	);
}

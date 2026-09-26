import { useEffect } from 'react';
import { useTasksStore, selectPriorityTask } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useHasInteractedSinceRegainingFocus } from '../../hooks/useHasInteractedSinceRegainingFocus';
import TaskCard from '../TaskCard';
import QuickAddTaskBar from '../QuickAddTaskBar';
import QuickToDoChecklistSection from '../QuickToDoChecklistSection';
import styles from './FocusPage.module.css';

const PRIORITY_TASK_PLACEHOLDER_TIERS_LONGEST_FIRST = [
	'Quickly add a task like "Finish Chapter 7 tomorrow"',
	'Quickly add a task like "Read Chp.7 tue"',
	'Quickly add a task here',
	'Read Chp.7 tue',
];

const NO_TASKS_LEFT_PLACEHOLDER_TIERS_LONGEST_FIRST = [
	'There\'s no tasks left. Quickly add one here like "Finish Chapter 7 tomorrow"',
	'There\'s no tasks left. Quickly add one here like "Read Chp.7 tue"',
	'There\'s no tasks left. Quickly add one here',
	'There\'s no tasks left. Add more here',
	'No tasks left, add more here',
	'No tasks left',
];

export default function FocusPage() {
	const priorityTask = useTasksStore(selectPriorityTask);
	const completeNextStep = useTasksStore(s => s.completeNextStep);
	const shouldShowQuickAddTaskBar = useSettingsStore(s => s.shouldShowQuickAddTaskBarOnFocusPage);
	const hasInteractedSinceRegainingFocus = useHasInteractedSinceRegainingFocus();

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.repeat || !priorityTask || !document.hasFocus() || !hasInteractedSinceRegainingFocus) return;
			const focused = document.activeElement as HTMLElement;
			if (
				focused.matches('button, input, select, textarea, a, [role="checkbox"]') ||
				focused.hasAttribute('contenteditable')
			) return;

			if (
				event.key === 'Enter' &&
				!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey
			) {
				completeNextStep(priorityTask);
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [priorityTask, completeNextStep, hasInteractedSinceRegainingFocus]);

	return (
		<div className={styles.page}>
			{shouldShowQuickAddTaskBar && (
				<QuickAddTaskBar
					placeholderTiersLongestFirst={
						priorityTask
							? PRIORITY_TASK_PLACEHOLDER_TIERS_LONGEST_FIRST
							: NO_TASKS_LEFT_PLACEHOLDER_TIERS_LONGEST_FIRST
					}
				/>
			)}
			{priorityTask ? (
				<TaskCard task={priorityTask} />
			) : (
				<div className={styles.emptyState}>
					{!shouldShowQuickAddTaskBar && (
						<p className={styles.emptyStateText}>Nothing to do right now</p>
					)}
					<QuickToDoChecklistSection />
				</div>
			)}
		</div>
	);
}

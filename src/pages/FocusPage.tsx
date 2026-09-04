import { useEffect, useRef } from 'react';
import { useTasksStore, selectPriorityTask } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import TaskCard from '../components/TaskCard';
import QuickAddTaskBar from '../components/QuickAddTaskBar';
import QuickToDoChecklistSection from '../components/QuickToDoChecklistSection';
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

	const lastTapTime = useRef(0);
	const tapCount = useRef(0);
	const DOUBLE_TAP_THRESHOLD = 400;

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.repeat || !priorityTask) return;
			const focused = document.activeElement as HTMLElement;
			if (
				focused.matches('button, input, select') ||
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
	}, [priorityTask, completeNextStep]);

	// Double-tap → complete next step
	function onTouchStart(event: React.TouchEvent) {
		const target = event.target as HTMLElement;
		if (
			target.hasAttribute('contenteditable') ||
			target.matches('button, input, select, textarea')
		) return;

		const now = Date.now();
		if (now - lastTapTime.current < DOUBLE_TAP_THRESHOLD) {
			tapCount.current++;
		} else {
			tapCount.current = 1;
		}
		lastTapTime.current = now;

		if (tapCount.current === 2 && priorityTask) {
			completeNextStep(priorityTask);
			tapCount.current = 0;
		}
	}

	return (
		<div className={styles.page} onTouchStart={onTouchStart}>
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

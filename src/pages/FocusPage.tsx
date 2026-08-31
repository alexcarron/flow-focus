import { useEffect, useRef } from 'react';
import { useTasksStore, selectPriorityTask } from '../stores/tasksStore';
import TaskCard from '../components/TaskCard';
import QuickToDoChecklistSection from '../components/QuickToDoChecklistSection';
import styles from './FocusPage.module.css';

export default function FocusPage() {
	const priorityTask = useTasksStore(selectPriorityTask);
	const completeNextStep = useTasksStore(s => s.completeNextStep);

	const lastTapTime = useRef(0);
	const tapCount = useRef(0);
	const DOUBLE_TAP_THRESHOLD = 400;

	// Enter key → complete next step
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
			{priorityTask ? (
				<TaskCard task={priorityTask} />
			) : (
				<div className={styles.emptyState}>
					<p className={styles.emptyStateText}>Nothing to do right now</p>
					<QuickToDoChecklistSection />
				</div>
			)}
		</div>
	);
}

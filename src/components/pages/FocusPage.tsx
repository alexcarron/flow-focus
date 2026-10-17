import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type Task from '../../model/task/Task';
import { flashElementWithAccentColor } from '../animations/flashElementWithAccentColor';
import { useTasksStore, selectPriorityTask } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useHasInteractedSinceRegainingFocus } from '../../hooks/useHasInteractedSinceRegainingFocus';
import { useActivePointerPositionGetter } from '../../hooks/useActivePointerPositionGetter';
import TaskCard from '../TaskCard';
import QuickAddTaskBar from '../QuickAddTaskBar';
import QuickToDoChecklistSection from '../QuickToDoChecklistSection';
import RemainingTasksSummary from '../RemainingTasksSummary';
import ConfettiBurst from '../animations/ConfettiBurst';
import { playCelebrationSound } from '../../audio/playCelebrationSound';
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
	const completeNextStep = useTasksStore(state => state.completeNextStep);
	const shouldShowQuickAddTaskBar = useSettingsStore(state => state.shouldShowQuickAddTaskBarOnFocusPage);
	const shouldShowRemainingTasksSummary = useSettingsStore(state => state.shouldShowRemainingTasksSummaryOnFocusPage);
	const shouldPlayCelebrationSound = useSettingsStore(state => state.shouldPlayCelebrationSound);
	const hasInteractedSinceRegainingFocus = useHasInteractedSinceRegainingFocus();
	const [confettiBursts, setConfettiBursts] = useState<{
		id: string,
		originX: number,
		originY: number,
		isOriginCursorPosition: boolean,
		undoStackLengthAfterCompletion: number,
	}[]>([]);
	const getActivePointerPosition = useActivePointerPositionGetter();
	const playingCelebrationSoundsRef = useRef<{
		undoStackLengthAfterCompletion: number,
		stopCelebrationSound: () => void,
	}[]>([]);

	useEffect(() => useTasksStore.subscribe(({ undoStack }) => {
		const celebrationSoundsWithCompletionUndone = playingCelebrationSoundsRef.current.filter(celebrationSound => celebrationSound.undoStackLengthAfterCompletion > undoStack.length);
		celebrationSoundsWithCompletionUndone.forEach(celebrationSound => celebrationSound.stopCelebrationSound());
		playingCelebrationSoundsRef.current = playingCelebrationSoundsRef.current.filter(celebrationSound => celebrationSound.undoStackLengthAfterCompletion <= undoStack.length);

		setConfettiBursts(previousConfettiBursts => {
			const confettiBurstsWithCompletionNotUndone = previousConfettiBursts.filter(confettiBurst => confettiBurst.undoStackLengthAfterCompletion <= undoStack.length);
			if (confettiBurstsWithCompletionNotUndone.length === previousConfettiBursts.length) return previousConfettiBursts;
			return confettiBurstsWithCompletionNotUndone;
		});
	}), []);

	const celebrateCompletion = useEffectEvent(() => {
		const completeTaskButton = document.querySelector<HTMLElement>('[data-complete-task-button]');
		if (completeTaskButton) flashElementWithAccentColor(completeTaskButton);

		const activePointerPosition = getActivePointerPosition();
		if (activePointerPosition) {
			celebrateCompletionAtPosition({ ...activePointerPosition, isCursorPosition: true });
			return;
		}

		const completeTaskButtonBounds = completeTaskButton?.getBoundingClientRect();
		if (completeTaskButtonBounds) {
			celebrateCompletionAtPosition({
				x: completeTaskButtonBounds.left + completeTaskButtonBounds.width / 2,
				y: completeTaskButtonBounds.top + completeTaskButtonBounds.height / 2,
				isCursorPosition: false,
			});
			return;
		}

		celebrateCompletionAtPosition({
			x: window.innerWidth / 2,
			y: window.innerHeight / 2,
			isCursorPosition: false,
		});
	});

	useEffect(() => {
		const getTaskIDToIsComplete = (tasks: Task[]) => new Map(tasks.map(task => [task.id, task.getIsComplete()]));
		let taskIDToWasComplete = getTaskIDToIsComplete(useTasksStore.getState().tasks);
		let previousUndoStackLength = useTasksStore.getState().undoStack.length;

		return useTasksStore.subscribe(({ tasks, undoStack }) => {
			const wasMutationJustMade = undoStack.length > previousUndoStackLength;
			const wasAnyTaskJustCompleted = tasks.some(task => taskIDToWasComplete.get(task.id) === false && task.getIsComplete());
			previousUndoStackLength = undoStack.length;
			taskIDToWasComplete = getTaskIDToIsComplete(tasks);
			if (wasMutationJustMade && wasAnyTaskJustCompleted) celebrateCompletion();
		});
	}, []);

	function celebrateCompletionAtPosition(completionPosition: { x: number, y: number, isCursorPosition: boolean }) {
		const undoStackLengthAfterCompletion = useTasksStore.getState().undoStack.length;
		if (shouldPlayCelebrationSound) {
			playingCelebrationSoundsRef.current.push({
				undoStackLengthAfterCompletion,
				stopCelebrationSound: playCelebrationSound(),
			});
		}
		setConfettiBursts(previousConfettiBursts => [
			...previousConfettiBursts,
			{
				id: crypto.randomUUID(),
				originX: completionPosition.x,
				originY: completionPosition.y,
				isOriginCursorPosition: completionPosition.isCursorPosition,
				undoStackLengthAfterCompletion,
			},
		]);
	}

	function removeConfettiBurst(confettiBurstID: string) {
		setConfettiBursts(previousConfettiBursts => previousConfettiBursts.filter(confettiBurst => confettiBurst.id !== confettiBurstID));
	}

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
				<>
					<TaskCard task={priorityTask} />
					{shouldShowRemainingTasksSummary && <RemainingTasksSummary />}
				</>
			) : (
				<div className={styles.emptyState}>
					{!shouldShowQuickAddTaskBar && (
						<p className={styles.emptyStateText}>Nothing to do right now</p>
					)}
					<QuickToDoChecklistSection />
				</div>
			)}
			{confettiBursts.map(confettiBurst => (
				<ConfettiBurst
					key={confettiBurst.id}
					originX={confettiBurst.originX}
					originY={confettiBurst.originY}
					isOriginCursorPosition={confettiBurst.isOriginCursorPosition}
					onFinish={() => removeConfettiBurst(confettiBurst.id)}
				/>
			))}
		</div>
	);
}

import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Task from '../model/task/Task';
import { getTasksThatCanBePrerequisiteTasksOfTask } from '../model/task/sequence/taskSequence';
import { useTasksStore, selectUpcomingTasks, selectTasksInPriorityOrder } from '../stores/tasksStore';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import { useCopyTaskAsMarkdown } from '../hooks/useCopyTaskAsMarkdown';
import ContextMenu from './context-menu/ContextMenu';
import ContextMenuButton from './context-menu/ContextMenuButton';
import PrerequisiteTaskPickerPopup from './PrerequisiteTaskPickerPopup';
import styles from './UpcomingTaskTitles.module.css';

export default function UpcomingTaskTitles() {
	const upcomingTasks = useTasksStore(useShallow(selectUpcomingTasks));
	const temporarilyFocusTask = useTasksStore(state => state.temporarilyFocusTask);
	const addPrerequisiteTaskToTask = useTasksStore(state => state.addPrerequisiteTaskToTask);
	const tasks = useTasksStore(state => state.tasks);
	const isTouchDevice = useIsTouchDevice();
	const copyTaskAsMarkdown = useCopyTaskAsMarkdown();
	const [contextMenu, setContextMenu] = useState<{ task: Task; x: number; y: number } | null>(null);
	const [prerequisiteTaskPicker, setPrerequisiteTaskPicker] = useState<{ dependentTask: Task; x: number; y: number } | null>(null);

	const dependentTaskNeedingPrerequisiteTaskList = contextMenu?.task ?? prerequisiteTaskPicker?.dependentTask ?? null;
	const candidatePrerequisiteTasksInPriorityOrder = useMemo(() => {
		if (dependentTaskNeedingPrerequisiteTaskList === null) return [];
		return getTasksThatCanBePrerequisiteTasksOfTask({
			dependentTask: dependentTaskNeedingPrerequisiteTaskList,
			tasks: selectTasksInPriorityOrder(useTasksStore.getState()),
		});
	}, [dependentTaskNeedingPrerequisiteTaskList, tasks]);

	if (upcomingTasks.length === 0 && prerequisiteTaskPicker === null) return null;

	return (
		<>
			<ul className={styles.titles}>
				{upcomingTasks.map(task => (
					<li
						key={task.id}
						className={styles.titleRow}
						onContextMenu={event => {
							event.preventDefault();
							setContextMenu({ task, x: event.clientX, y: event.clientY });
						}}
					>
						<button
							type="button"
							className={styles.title}
							onClick={() => temporarilyFocusTask(task)}
						>
							{task.getDescription()}
						</button>
						{isTouchDevice && (
							<ContextMenuButton
								label="Task options"
								className={styles.moreOptionsButton}
								onOpen={(x, y) => setContextMenu({ task, x, y })}
							/>
						)}
					</li>
				))}
			</ul>

			<ContextMenu
				position={contextMenu !== null ? { x: contextMenu.x, y: contextMenu.y } : null}
				onClose={() => setContextMenu(null)}
				items={contextMenu !== null ? [
					{ label: 'Focus this task', onClick: () => temporarilyFocusTask(contextMenu.task) },
					{ label: 'Copy task as Markdown', onClick: () => copyTaskAsMarkdown(contextMenu.task) },
					...(candidatePrerequisiteTasksInPriorityOrder.length > 0 ? [{ label: 'Do after…', onClick: () => setPrerequisiteTaskPicker({ dependentTask: contextMenu.task, x: contextMenu.x, y: contextMenu.y }) }] : []),
				] : []}
			/>

			<PrerequisiteTaskPickerPopup
				anchorPosition={prerequisiteTaskPicker !== null ? { x: prerequisiteTaskPicker.x, y: prerequisiteTaskPicker.y } : null}
				candidateTasksInPriorityOrder={candidatePrerequisiteTasksInPriorityOrder}
				onPick={prerequisiteTask => {
					if (prerequisiteTaskPicker === null) return;
					addPrerequisiteTaskToTask({ dependentTask: prerequisiteTaskPicker.dependentTask, prerequisiteTask });
				}}
				onClose={() => setPrerequisiteTaskPicker(null)}
			/>
		</>
	);
}

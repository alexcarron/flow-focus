import { useEffect, useMemo, useRef, useState } from 'react';
import Task from '../model/task/Task';
import getDetailDistinguishingTaskFromSameNamedTasks from '../model/task/getDetailDistinguishingTaskFromSameNamedTasks';
import styles from './PrerequisiteTaskPicker.module.css';

interface Props {
	candidateTasksInPriorityOrder: Task[];
	onPick: (task: Task) => void;
	onCancel: () => void;
}

function normalizeTaskName(taskName: string): string {
	return taskName.trim().replace(/\s+/g, ' ').toLowerCase();
}

export default function PrerequisiteTaskPicker({ candidateTasksInPriorityOrder, onPick, onCancel }: Props) {
	const [searchText, setSearchText] = useState('');
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const highlightedItemRef = useRef<HTMLButtonElement>(null);

	const matchingTasks = useMemo(() => {
		const normalizedSearchText = normalizeTaskName(searchText);
		return candidateTasksInPriorityOrder.filter(task => normalizeTaskName(task.getDescription()).includes(normalizedSearchText));
	}, [candidateTasksInPriorityOrder, searchText]);

	useEffect(() => {
		requestAnimationFrame(() => inputRef.current?.focus());
	}, []);

	useEffect(() => {
		highlightedItemRef.current?.scrollIntoView({ block: 'nearest' });
	}, [highlightedIndex]);

	function onKeyDown(event: React.KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			setHighlightedIndex(current => Math.min(current + 1, matchingTasks.length - 1));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			setHighlightedIndex(current => Math.max(current - 1, 0));
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			const highlightedTask = matchingTasks[highlightedIndex];
			if (highlightedTask !== undefined) onPick(highlightedTask);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onCancel();
		}
	}

	return (
		<div className={styles.picker}>
			<input
				ref={inputRef}
				type="text"
				value={searchText}
				onChange={event => {
					setSearchText(event.target.value);
					setHighlightedIndex(0);
				}}
				onKeyDown={onKeyDown}
				placeholder="Find a task..."
				aria-label="Find a task to do this after"
				className={`field ${styles.searchInput}`}
			/>
			<ul className={styles.taskList} role="listbox">
				{matchingTasks.map((task, index) => {
					const distinguishingDetail = getDetailDistinguishingTaskFromSameNamedTasks({
						task,
						tasks: candidateTasksInPriorityOrder,
					});
					return (
						<li key={task.id}>
							<button
								ref={index === highlightedIndex ? highlightedItemRef : undefined}
								type="button"
								role="option"
								aria-selected={index === highlightedIndex}
								onMouseEnter={() => setHighlightedIndex(index)}
								onClick={() => onPick(task)}
								title={task.getDescription()}
								className={index === highlightedIndex ? `${styles.taskOption} ${styles.taskOptionHighlighted}` : styles.taskOption}
							>
								<span className={styles.taskName}>{task.getDescription()}</span>
								{distinguishingDetail !== null && (
									<span className={styles.taskDetail}>{distinguishingDetail}</span>
								)}
							</button>
						</li>
					);
				})}
				{matchingTasks.length === 0 && (
					<li className={styles.emptyMessage}>
						{candidateTasksInPriorityOrder.length === 0 ? 'No tasks to pick' : 'No tasks match'}
					</li>
				)}
			</ul>
		</div>
	);
}

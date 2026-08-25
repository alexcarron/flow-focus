import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import ArrayInput from '../components/inputs/ArrayInput';
import CheckboxInput from '../components/inputs/CheckboxInput';
import TimingOptionsInput, { DEFAULT_DURATION } from '../components/inputs/TimingOptionsInput';
import { SHORTCUTS, matchesShortcut } from '../config/shortcuts';
import styles from './TaskCreatorPage.module.css';

const DEFAULT_TIMING: TaskTimingOptions = {
	startTime: null,
	endTime: null,
	deadline: null,
	minDuration: DEFAULT_DURATION,
	maxDuration: DEFAULT_DURATION,
	repeatInterval: null,
	isMandatory: false,
};

export default function TaskCreatorPage() {
	const navigate = useNavigate();
	const addTask = useTasksStore(s => s.addTask);
	const shouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.shouldKeepTaskDetailsAfterCreating);
	const setShouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.setShouldKeepTaskDetailsAfterCreating);

	const [name, setName] = useState('');
	const [steps, setSteps] = useState<string[]>([]);
	const [timing, setTiming] = useState<TaskTimingOptions>(DEFAULT_TIMING);
	const [error, setError] = useState<string | null>(null);

	const handleCreateRef = useRef(handleCreate);
	useEffect(() => { handleCreateRef.current = handleCreate; });

	useEffect(() => {
		const shortcuts = SHORTCUTS.taskCreator;
		function onKeyDown(event: KeyboardEvent) {
			if (matchesShortcut(event, shortcuts.submit)) {
				event.preventDefault();
				handleCreateRef.current();
			} else if (matchesShortcut(event, shortcuts.blur)) {
				(document.activeElement as HTMLElement)?.blur();
			}
		}
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	async function handleCreate() {
		if (!name.trim()) {
			setError('Task name is required');
			return;
		}

		const cleanedSteps = steps.map(step => step.trim()).filter(step => step !== '');

		const task = await addTask(name.trim(), timing);
		task.editSteps(cleanedSteps);

		await useTasksStore.getState().persistChangedTasks([task]);
		useTasksStore.getState().refreshTasks();

		setError(null);
		if (!shouldKeepTaskDetailsAfterCreating) {
			setName('');
			setSteps([]);
			setTiming(DEFAULT_TIMING);
		}
	}

	function handleReset() {
		setName('');
		setSteps([]);
		setTiming(DEFAULT_TIMING);
		setError(null);
	}

	return (
		<div className={styles.page}>
			<h1>Create Task</h1>

			{error && (
				<p className={styles.errorMessage}>{error}</p>
			)}

			<div className="field-group">
				<label className="field-label">Task name *</label>
				<input
					type="text"
					value={name}
					onChange={event => { setName(event.target.value); setError(null); }}
					placeholder="What needs to be done?"
					className="field large"
				/>
			</div>

			<div className="field-group">
				<label className="field-label">Steps</label>
				<ArrayInput
					value={steps}
					onChange={setSteps}
					placeholder="Type a step, or paste a checklist…"
				/>
			</div>

			<div className="field-group">
				<label className="field-label">Timing</label>
				<TimingOptionsInput value={timing} onChange={setTiming} />
			</div>

			<div className="field-group">
				<CheckboxInput
					value={shouldKeepTaskDetailsAfterCreating}
					onChange={setShouldKeepTaskDetailsAfterCreating}
					label="Keep task details when creating task"
				/>
			</div>

			<div className={styles.actions}>
				<button
					onClick={handleCreate}
					title="Create Task (Ctrl+Enter)"
					className={`button primary ${styles.submitButton}`}
				>
					Create Task
				</button>
				<button onClick={handleReset} className="button">
					Reset
				</button>
			</div>
		</div>
	);
}

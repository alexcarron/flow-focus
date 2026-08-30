import { useState, useEffect, useRef, useMemo } from 'react';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import parseTypedQuickInput, { escapeTokenInText } from '../model/typed-quick-input/parseTypedQuickInput';
import { TypedQuickInputToken } from '../model/typed-quick-input/TypedQuickInputToken';
import Time from '../model/time-management/Time';
import ArrayInput from '../components/inputs/ArrayInput';
import CheckboxInput from '../components/inputs/CheckboxInput';
import DatetimeInput from '../components/inputs/DatetimeInput';
import TypedQuickInput from '../components/inputs/TypedQuickInput';
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
	isMandatory: true,
};

const timingKeyToTokenField: Partial<Record<keyof TaskTimingOptions, TypedQuickInputToken['field']>> = {
	deadline: 'deadline',
	startTime: 'startTime',
	endTime: 'endTime',
	repeatInterval: 'repeatInterval',
	minDuration: 'duration',
	maxDuration: 'duration',
	isMandatory: 'isMandatory',
};

function findTokenForTimingKey(tokens: TypedQuickInputToken[], key: keyof TaskTimingOptions): TypedQuickInputToken | undefined {
	const tokenField = timingKeyToTokenField[key];
	if (!tokenField) return undefined;
	return tokens.find(token => token.field === tokenField);
}

export default function TaskCreatorPage() {
	const addTask = useTasksStore(s => s.addTask);
	const shouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.shouldKeepTaskDetailsAfterCreating);
	const setShouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.setShouldKeepTaskDetailsAfterCreating);
	const nightTime = useSettingsStore(s => s.nightTime);
	const morningTime = useSettingsStore(s => s.morningTime);

	const [name, setName] = useState('');
	const [steps, setSteps] = useState<string[]>([]);
	const [manualTiming, setManualTiming] = useState<TaskTimingOptions>(DEFAULT_TIMING);
	const [showMoreOptions, setShowMoreOptions] = useState(false);
	const [demotedRange, setDemotedRange] = useState<{ start: number; end: number } | null>(null);
	const [error, setError] = useState<string | null>(null);

	const parseResult = useMemo(
		() => parseTypedQuickInput({
			input: name,
			now: new Date(),
			nightTime: Time.fromString(nightTime),
			morningTime: Time.fromString(morningTime),
		}),
		[name, nightTime, morningTime]
	);
	const effectiveTiming: TaskTimingOptions = { ...manualTiming, ...parseResult.timing };

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

	function handleNameChange(nextName: string) {
		setName(nextName);
		setError(null);
	}

	function handleUnlinkToken(token: TypedQuickInputToken) {
		setName(escapeTokenInText(name, token));
		setDemotedRange({ start: token.startIndex, end: token.endIndex + 1 });
	}

	function handleTimingChange(nextTiming: TaskTimingOptions) {
		const changedKeys = (Object.keys(nextTiming) as Array<keyof TaskTimingOptions>)
			.filter(key => nextTiming[key] !== effectiveTiming[key]);

		for (const key of changedKeys) {
			const token = findTokenForTimingKey(parseResult.tokens, key);
			if (token) {
				setName(escapeTokenInText(name, token));
				setDemotedRange({ start: token.startIndex, end: token.endIndex + 1 });
				break;
			}
		}

		const changedTiming: Partial<TaskTimingOptions> = {};
		for (const key of changedKeys) {
			(changedTiming as Record<string, unknown>)[key] = nextTiming[key];
		}
		setManualTiming(previous => ({ ...previous, ...changedTiming }));
	}

	function handleDeadlineChange(deadline: Date | null) {
		handleTimingChange({ ...effectiveTiming, deadline });
	}

	async function handleCreate() {
		const description = parseResult.cleanedName.trim();
		if (!description) {
			setError('Task name is required');
			return;
		}

		const cleanedSteps = steps.map(step => step.trim()).filter(step => step !== '');

		const task = await addTask(description, effectiveTiming);
		task.editStepsText(cleanedSteps);

		await useTasksStore.getState().persistChangedTasks([task]);
		useTasksStore.getState().refreshTasks();

		setError(null);
		if (!shouldKeepTaskDetailsAfterCreating) {
			handleReset();
		}
	}

	function handleReset() {
		setName('');
		setSteps([]);
		setManualTiming(DEFAULT_TIMING);
		setDemotedRange(null);
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
				<TypedQuickInput
					value={name}
					onChange={handleNameChange}
					tokens={parseResult.tokens}
					onUnlinkToken={handleUnlinkToken}
					demotedRange={demotedRange}
					placeholder="Calculus Homework 3.2 due thursday takes 1-2 hours"
					onSubmit={() => handleCreateRef.current()}
				/>
			</div>

			{!showMoreOptions && (
				<DatetimeInput
					label="Deadline"
					value={effectiveTiming.deadline}
					onChange={handleDeadlineChange}
				/>
			)}

			<button
				type="button"
				onClick={() => setShowMoreOptions(previous => !previous)}
				className={`button ${styles.moreOptionsToggle}`}
			>
				{showMoreOptions ? 'Fewer options' : 'More options'}
			</button>

			{showMoreOptions && (
				<>
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
						<TimingOptionsInput value={effectiveTiming} onChange={handleTimingChange} />
					</div>
				</>
			)}

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

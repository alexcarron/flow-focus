import { useState, useEffect, useRef } from 'react';
import { useTasksStore } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import { TypedQuickInputToken } from '../../model/typed-quick-input/TypedQuickInputToken';
import Time from '../../model/time-management/Time';
import useTypedQuickInputEntry from '../../hooks/useTypedQuickInputEntry';
import Step from '../../model/task/step/Step';
import { createStep, pruneEmptySteps } from '../../model/task/step/stepTree';
import { appendRootNode, mapNode, reparentAndReorderNode, indentNode, unindentNode, moveNodeAmongSiblings, insertSiblingRelativeToNode, deleteNode } from '../../utilities/tree/orderedTree';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import StepsTreeEditor, { StepsTreeEditorHandle } from '../StepsTreeEditor';
import CheckboxInput from '../inputs/CheckboxInput';
import DatetimeInput from '../inputs/DatetimeInput';
import TypedQuickInput from '../inputs/TypedQuickInput';
import TimingOptionsInput from '../inputs/TimingOptionsInput';
import { SHORTCUTS, matchesShortcut } from '../../utilities/shortcuts';
import { StartTimeAfterEndTimeError, StartTimeAfterDeadlineError } from '../../model/task/TaskTimingError';
import styles from './TaskCreatorPage.module.css';

const DEFAULT_TIMING: TaskTimingOptions = {
	startTime: null,
	endTime: null,
	deadline: null,
	minDuration: null,
	maxDuration: null,
	recurrenceDuration: null,
	shouldNotSkipMissedOccurrences: false,
	isMandatory: true,
};

const timingKeyToTokenField: Partial<Record<keyof TaskTimingOptions, TypedQuickInputToken['field']>> = {
	deadline: 'deadline',
	startTime: 'startTime',
	endTime: 'endTime',
	recurrenceDuration: 'recurrenceDuration',
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

	const { name, setName, toggleTokenEscape, reset: resetTypedQuickInputEntry, ...parseResult } = useTypedQuickInputEntry({
		nightTime: Time.fromString(nightTime),
		morningTime: Time.fromString(morningTime),
	});
	const [steps, setSteps] = useState<Step[]>([]);
	const [manualTiming, setManualTiming] = useState<TaskTimingOptions>(DEFAULT_TIMING);
	const [showMoreOptions, setShowMoreOptions] = useState(false);
	const [demotedRange, setDemotedRange] = useState<{ start: number; end: number } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmationKey, setConfirmationKey] = useState(0);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const stepsEditorRef = useRef<StepsTreeEditorHandle>(null);
	const isTouchDevice = useIsTouchDevice();

	const effectiveTiming: TaskTimingOptions = { ...manualTiming, ...parseResult.timing };

	const handleCreateRef = useRef(handleCreate);
	useEffect(() => { handleCreateRef.current = handleCreate; });

	const isCreatingTaskRef = useRef(false);

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

	function handleToggleTokenEscape(field: TypedQuickInputToken['field'], matchedText: string, startIndex: number, endIndex: number) {
		toggleTokenEscape(field, matchedText, startIndex, endIndex);
		setDemotedRange({ start: startIndex, end: endIndex });
	}

	function addStepAndFocus() {
		const newStep = createStep('');
		setSteps(previous => appendRootNode(previous, newStep));
		setTimeout(() => stepsEditorRef.current?.focusStep(newStep.id), 0);
	}

	function handleShiftEnter() {
		setShowMoreOptions(true);
		addStepAndFocus();
	}

	function handleTimingChange(nextTiming: TaskTimingOptions) {
		const changedKeys = (Object.keys(nextTiming) as Array<keyof TaskTimingOptions>)
			.filter(key => nextTiming[key] !== effectiveTiming[key]);

		for (const key of changedKeys) {
			const token = findTokenForTimingKey(parseResult.tokens, key);
			if (token) {
				toggleTokenEscape(token.field, token.matchedText, token.startIndex, token.endIndex);
				setDemotedRange({ start: token.startIndex, end: token.endIndex });
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
		if (isCreatingTaskRef.current) return;

		const description = parseResult.cleanedName.trim();
		if (!description) {
			setError('Task name is required');
			return;
		}

		isCreatingTaskRef.current = true;
		setIsCreatingTask(true);
		try {
			const typedStepNodes = (parseResult.steps ?? []).map(createStep);
			const combinedSteps = [...typedStepNodes, ...pruneEmptySteps(steps)];

			let task;
			try {
				task = await addTask(description, effectiveTiming);
			} catch (creationError) {
				if (creationError instanceof StartTimeAfterEndTimeError) {
					setError('Start time cannot be after end time.');
				} else if (creationError instanceof StartTimeAfterDeadlineError) {
					setError('Start time cannot be after the deadline.');
				} else {
					setError('Failed to create task.');
				}
				return;
			}
			task.replaceAllSteps(combinedSteps);

			await useTasksStore.getState().persistChangedTasks([task]);
			useTasksStore.getState().refreshTasks();

			setError(null);
			setConfirmationKey(previous => previous + 1);
			if (!shouldKeepTaskDetailsAfterCreating) {
				handleReset();
			}
		} finally {
			isCreatingTaskRef.current = false;
			setIsCreatingTask(false);
		}
	}

	function handleReset() {
		resetTypedQuickInputEntry();
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
					escapedTokens={parseResult.escapedTokens}
					onToggleTokenEscape={handleToggleTokenEscape}
					demotedRange={demotedRange}
					placeholderTiersLongestFirst={['Calculus Homework 3.2 due thursday takes 1-2 hours']}
					onSubmit={() => handleCreateRef.current()}
					onShiftEnter={handleShiftEnter}
					disabled={isCreatingTask}
				/>
			</div>

			{!showMoreOptions && (
				<DatetimeInput
					label="Deadline"
					value={effectiveTiming.deadline}
					onChange={handleDeadlineChange}
					defaultTimeOfDay="night"
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
						{steps.length > 0 && (
							<StepsTreeEditor
								ref={stepsEditorRef}
								steps={steps}
								isTouchDevice={isTouchDevice}
								showCheckboxes={false}
								hasOverallLeftMargin={false}
								onSetStepText={(stepID, text) => setSteps(previous => mapNode(previous, stepID, step => ({ ...step, text })))}
								onReparentStep={(stepID, newParentID, index) => setSteps(previous => reparentAndReorderNode(previous, stepID, newParentID, index))}
								onIndentStep={stepID => setSteps(previous => indentNode(previous, stepID))}
								onUnindentStep={stepID => setSteps(previous => unindentNode(previous, stepID))}
								onMoveStepUp={stepID => setSteps(previous => moveNodeAmongSiblings(previous, stepID, 'up'))}
								onMoveStepDown={stepID => setSteps(previous => moveNodeAmongSiblings(previous, stepID, 'down'))}
								onInsertStepBefore={stepID => { const newStep = createStep(''); setSteps(previous => insertSiblingRelativeToNode(previous, stepID, 'before', newStep)); return newStep.id; }}
								onInsertStepAfter={stepID => { const newStep = createStep(''); setSteps(previous => insertSiblingRelativeToNode(previous, stepID, 'after', newStep)); return newStep.id; }}
								onRequestDeleteStep={stepID => setSteps(previous => deleteNode(previous, stepID))}
								onBackspaceDeleteEmptyStep={stepID => { setSteps(previous => deleteNode(previous, stepID)); return true; }}
							/>
						)}
						<button
							type="button"
							onClick={addStepAndFocus}
							className={`button ${styles.addStepButton}`}
						>
							+ Add step
						</button>
					</div>

					<div className="field-group">
						<label className="section-label">Timing</label>
						<TimingOptionsInput value={effectiveTiming} onChange={handleTimingChange} />
					</div>
				</>
			)}

			<div className={styles.actions}>
				<button
					onClick={handleCreate}
					title="Create Task (Ctrl+Enter)"
					className={`button primary ${styles.submitButton}`}
					disabled={isCreatingTask}
				>
					Create Task
				</button>
				<button onClick={handleReset} className="button">
					Reset
				</button>
			</div>

			{confirmationKey > 0 && (
				<p key={confirmationKey} className={styles.confirmationMessage}>Task created</p>
			)}

			<CheckboxInput
				value={shouldKeepTaskDetailsAfterCreating}
				onChange={setShouldKeepTaskDetailsAfterCreating}
				label="Keep task details when creating task"
				className={styles.keepDetailsToggle}
			/>
		</div>
	);
}

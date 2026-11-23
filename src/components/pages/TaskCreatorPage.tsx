import { useState, useEffect, useRef, useMemo } from 'react';
import { selectTasksInPriorityOrder, useTasksStore } from '../../stores/tasksStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTagsStore } from '../../stores/tagsStore';
import Tag from '../../model/tag/Tag';
import Task from '../../model/task/Task';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import { canTaskBePrerequisiteTask } from '../../model/task/sequence/taskSequence';
import { TypedQuickInputToken } from '../../model/typed-quick-input/TypedQuickInputToken';
import Time from '../../model/time-management/Time';
import useTypedQuickInputEntry from '../../hooks/useTypedQuickInputEntry';
import useTaskTagSelection from '../../hooks/useTaskTagSelection';
import sortTagsByUsageCount from '../../utilities/sortTagsByUsageCount';
import Step from '../../model/task/step/Step';
import { createStep, pruneEmptySteps, convertPastedListItemsIntoSteps, insertStepsAfterStepReplacingItIfBlank } from '../../model/task/step/stepTree';
import { appendRootNode, mapNode, reparentAndReorderNode, indentNode, unindentNode, moveNodeAmongSiblings, insertSiblingRelativeToNode, deleteNode, getNodeIDsInDepthFirstOrder } from '../../utilities/tree/orderedTree';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { useRefToLatestValue } from '../../hooks/useRefToLatestValue';
import StepsTreeEditor, { StepsTreeEditorHandle } from '../StepsTreeEditor';
import CheckboxInput from '../inputs/CheckboxInput';
import DatetimeInput from '../inputs/DatetimeInput';
import TypedQuickInput from '../inputs/TypedQuickInput';
import TimingOptionsInput from '../inputs/TimingOptionsInput';
import PrerequisiteTasksInput from '../inputs/PrerequisiteTasksInput';
import AddTagPopover from '../AddTagPopover';
import TagChip from '../TagChip';
import ErrorMessage from '../errors/ErrorMessage';
import { SHORTCUTS, matchesShortcut } from '../../utilities/shortcuts';
import { getTaskTimingErrorMessage, WAITING_TASK_CANNOT_REPEAT_FIX_MESSAGE } from '../../model/task/TaskTimingError';
import styles from './TaskCreatorPage.module.css';

const TASK_NAME_PLACEHOLDER_TIERS_LONGEST_FIRST = [
	'Math Homework friday starts tomorrow due sunday takes 2 hours',
	'Math Homework friday due sunday takes 2 hours',
	'Math Homework friday due sunday',
	'Math Homework friday',
	'Math Homework',
	'Study',
];

const DEFAULT_TIMING: TaskTimingOptions = {
	startDate: null,
	targetDate: null,
	dueDate: null,
	minDuration: null,
	maxDuration: null,
	recurrenceDuration: null,
	shouldNotSkipMissedOccurrences: false,
};

const timingKeyToTokenField: Partial<Record<keyof TaskTimingOptions, TypedQuickInputToken['field']>> = {
	dueDate: 'dueDate',
	targetDate: 'targetDate',
	startDate: 'startDate',
	recurrenceDuration: 'recurrenceDuration',
	minDuration: 'duration',
	maxDuration: 'duration',
};

function findTokenForTimingKey(tokens: TypedQuickInputToken[], key: keyof TaskTimingOptions): TypedQuickInputToken | undefined {
	const tokenField = timingKeyToTokenField[key];
	if (!tokenField) return undefined;
	return tokens.find(token => token.field === tokenField);
}

export default function TaskCreatorPage() {
	const addTask = useTasksStore(s => s.addTask);
	const tasks = useTasksStore(s => s.tasks);
	const shouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.shouldKeepTaskDetailsAfterCreating);
	const setShouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.setShouldKeepTaskDetailsAfterCreating);
	const nightTime = useSettingsStore(s => s.nightTime);
	const morningTime = useSettingsStore(s => s.morningTime);
	const tags = useTagsStore(s => s.tags);
	const renameTag = useTagsStore(s => s.renameTag);
	const tagsSortedByUsageCount = useMemo(() => sortTagsByUsageCount({ tags, tasks }), [tags, tasks]);
	const prerequisiteTaskCandidatesInPriorityOrder = useMemo(
		() => selectTasksInPriorityOrder(useTasksStore.getState()).filter(canTaskBePrerequisiteTask),
		[tasks]
	);
	const prerequisiteTaskCandidates = useMemo(
		() => prerequisiteTaskCandidatesInPriorityOrder.map(task => ({ id: task.id, description: task.getDescription() })),
		[prerequisiteTaskCandidatesInPriorityOrder]
	);

	const {
		name,
		setName,
		setNameAndPinPrerequisiteTask,
		pinnedPrerequisiteTaskLocations,
		toggleTokenEscape,
		reset: resetTypedQuickInputEntry,
		...parseResult
	} = useTypedQuickInputEntry({
		nightTime: Time.fromString(nightTime),
		morningTime: Time.fromString(morningTime),
		existingTags: tags,
		prerequisiteTaskCandidates,
	});
	const {
		alreadyAddedTagIDs,
		notYetAddedTagNames,
		selectExistingTag,
		createAndAddTag,
		removeAlreadyAddedTag,
		removeNotYetAddedTagName,
		renameNotYetAddedTagName,
		reset: resetTagSelection,
	} = useTaskTagSelection({
		existingTags: tags,
		parsedTags: parseResult.tags,
		onStripRangeFromName: stripRangeFromName,
	});
	const [manuallyAddedPrerequisiteTaskIDs, setManuallyAddedPrerequisiteTaskIDs] = useState<string[]>([]);
	const [steps, setSteps] = useState<Step[]>([]);
	const [manualTiming, setManualTiming] = useState<TaskTimingOptions>(DEFAULT_TIMING);
	const [showMoreOptions, setShowMoreOptions] = useState(false);
	const [areStepsRevealed, setAreStepsRevealed] = useState(false);
	const [demotedRange, setDemotedRange] = useState<{ start: number; end: number } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmationKey, setConfirmationKey] = useState(0);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const stepsEditorRef = useRef<StepsTreeEditorHandle>(null);
	const isTouchDevice = useIsTouchDevice();

	const effectiveTiming: TaskTimingOptions = { ...manualTiming, ...parseResult.timing };
	const prerequisiteTaskIDs = [...new Set([...parseResult.prerequisiteTaskIDs, ...manuallyAddedPrerequisiteTaskIDs])];
	const prerequisiteTasks = prerequisiteTaskIDs
		.map(prerequisiteTaskID => tasks.find(task => task.id === prerequisiteTaskID))
		.filter((task): task is Task => task !== undefined);
	const remainingPrerequisiteTaskCandidatesInPriorityOrder = prerequisiteTaskCandidatesInPriorityOrder.filter(task => !prerequisiteTaskIDs.includes(task.id));
	const alreadyAddedTags = alreadyAddedTagIDs
		.map(tagID => tags.find(tag => tag.id === tagID))
		.filter((tag): tag is Tag => tag !== undefined);
	const hasAnyTags = alreadyAddedTags.length > 0 || notYetAddedTagNames.length > 0;

	const handleCreateRef = useRefToLatestValue(handleCreate);

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

	function stripRangeFromName(startIndex: number, endIndex: number) {
		const effectiveEndIndex = name[endIndex] === ' ' ? endIndex + 1 : endIndex;
		setName(name.slice(0, startIndex) + name.slice(effectiveEndIndex));
	}

	function removePrerequisiteTask(prerequisiteTask: Task) {
		if (manuallyAddedPrerequisiteTaskIDs.includes(prerequisiteTask.id)) {
			setManuallyAddedPrerequisiteTaskIDs(previous => previous.filter(prerequisiteTaskID => prerequisiteTaskID !== prerequisiteTask.id));
			return;
		}
		const typedPrerequisiteTaskMatch = parseResult.prerequisiteTaskMatches.find(match => match.prerequisiteTaskID === prerequisiteTask.id);
		if (typedPrerequisiteTaskMatch) stripRangeFromName(typedPrerequisiteTaskMatch.startIndex, typedPrerequisiteTaskMatch.endIndex);
	}

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
		setAreStepsRevealed(true);
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

	function handleDueDateChange(dueDate: Date | null) {
		handleTimingChange({ ...effectiveTiming, dueDate });
	}

	async function handleCreate() {
		if (isCreatingTaskRef.current) return;

		const description = parseResult.cleanedName.trim();
		if (!description) {
			setError('Task name is required');
			return;
		}

		const disabledToken = parseResult.tokens.find(token => token.isDisabled);
		if (disabledToken !== undefined) {
			setError(disabledToken.explanation);
			return;
		}

		const willTaskRepeat = effectiveTiming.recurrenceDuration !== null;
		if (willTaskRepeat && prerequisiteTaskIDs.length > 0) {
			setError(WAITING_TASK_CANNOT_REPEAT_FIX_MESSAGE);
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

				for (const tagName of notYetAddedTagNames) {
					const existingTag = useTagsStore.getState().tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
					const tag = existingTag ?? await useTagsStore.getState().addTag(tagName);
					task.addTagID(tag.id);
				}
				for (const tagID of alreadyAddedTagIDs) {
					task.addTagID(tagID);
				}
				for (const prerequisiteTaskID of prerequisiteTaskIDs) {
					task.addPrerequisiteTaskID(prerequisiteTaskID);
				}
			} catch (creationError) {
				setError(getTaskTimingErrorMessage(creationError) ?? 'Failed to create task.');
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
		resetTagSelection();
		setManuallyAddedPrerequisiteTaskIDs([]);
		setManualTiming(DEFAULT_TIMING);
		setDemotedRange(null);
		setError(null);
		setAreStepsRevealed(false);
	}

	return (
		<div className={styles.page}>
			<h1>Create Task</h1>

			<ErrorMessage message={error} />

			<div className="field-group">
				<label className="field-label">Task name *</label>
				<TypedQuickInput
					value={name}
					onChange={handleNameChange}
					tokens={parseResult.tokens}
					escapedTokens={parseResult.escapedTokens}
					onToggleTokenEscape={handleToggleTokenEscape}
					demotedRange={demotedRange}
					placeholderTiersLongestFirst={TASK_NAME_PLACEHOLDER_TIERS_LONGEST_FIRST}
					onSubmit={() => handleCreateRef.current()}
					onShiftEnter={handleShiftEnter}
					disabled={isCreatingTask}
					existingTagsSortedByUsage={tagsSortedByUsageCount}
					alreadyAddedTagIDs={alreadyAddedTagIDs}
					notYetAddedTagNames={notYetAddedTagNames}
					prerequisiteTaskCandidatesInPriorityOrder={prerequisiteTaskCandidatesInPriorityOrder}
					prerequisiteTaskMatches={parseResult.prerequisiteTaskMatches}
					manuallyAddedPrerequisiteTaskIDs={manuallyAddedPrerequisiteTaskIDs}
					pinnedPrerequisiteTaskLocations={pinnedPrerequisiteTaskLocations}
					onPinPrerequisiteTask={setNameAndPinPrerequisiteTask}
				/>
			</div>

			{(areStepsRevealed || showMoreOptions) && (
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
							onPasteListItems={(stepID, pastedListItems) => {
								const newSteps = convertPastedListItemsIntoSteps(pastedListItems);
								setSteps(previous => insertStepsAfterStepReplacingItIfBlank(previous, stepID, newSteps));
								return getNodeIDsInDepthFirstOrder(newSteps);
							}}
							onRequestDeleteStep={stepID => setSteps(previous => deleteNode(previous, stepID))}
							onBackspaceDeleteEmptyStep={stepID => { setSteps(previous => deleteNode(previous, stepID)); return true; }}
						/>
					)}
					{showMoreOptions && (
						<button
							type="button"
							onClick={addStepAndFocus}
							className={`button ${styles.addStepButton}`}
						>
							+ Add step
						</button>
					)}
				</div>
			)}

			{showMoreOptions && (
				<div className="field-group">
					<label className="field-label">Tags</label>
					<div className={styles.tagsRow}>
						{alreadyAddedTags.map(tag => (
							<TagChip
								key={tag.id}
								name={tag.name}
								onRename={newName => renameTag(tag.id, newName)}
								onRemove={() => removeAlreadyAddedTag(tag.id)}
							/>
						))}
						{notYetAddedTagNames.map(tagName => (
							<TagChip
								key={tagName}
								name={tagName}
								onRename={newName => renameNotYetAddedTagName(tagName, newName)}
								onRemove={() => removeNotYetAddedTagName(tagName)}
							/>
						))}
						<AddTagPopover
							existingTags={tags}
							alreadyAddedTagIDs={alreadyAddedTagIDs}
							notYetAddedTagNames={notYetAddedTagNames}
							onSelectExisting={selectExistingTag}
							onCreateAndAdd={createAndAddTag}
							shouldShowTriggerAsTextButton={!hasAnyTags}
						/>
					</div>
				</div>
			)}

			{!showMoreOptions && (
				<DatetimeInput
					label="Due date"
					value={effectiveTiming.dueDate}
					onChange={handleDueDateChange}
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
						<label className="section-label">Timing</label>
						<div className={styles.timingFields}>
							{effectiveTiming.recurrenceDuration === null && (
								<PrerequisiteTasksInput
									prerequisiteTasks={prerequisiteTasks}
									candidateTasksInPriorityOrder={remainingPrerequisiteTaskCandidatesInPriorityOrder}
									onAdd={prerequisiteTask => setManuallyAddedPrerequisiteTaskIDs(previous => [...previous, prerequisiteTask.id])}
									onRemove={removePrerequisiteTask}
								/>
							)}
							<TimingOptionsInput value={effectiveTiming} onChange={handleTimingChange} />
						</div>
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

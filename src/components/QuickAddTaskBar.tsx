import { useMemo, useRef, useState } from 'react';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useTagsStore } from '../stores/tagsStore';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import { TypedQuickInputField } from '../model/typed-quick-input/TypedQuickInputToken';
import Time from '../model/time-management/Time';
import useTypedQuickInputEntry from '../hooks/useTypedQuickInputEntry';
import useTaskTagSelection from '../hooks/useTaskTagSelection';
import sortTagsByUsageCount from '../utilities/sortTagsByUsageCount';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import Step from '../model/task/step/Step';
import { createStep, pruneEmptySteps } from '../model/task/step/stepTree';
import { appendRootNode, mapNode, reparentAndReorderNode, indentNode, unindentNode, moveNodeAmongSiblings, insertSiblingRelativeToNode, deleteNode } from '../utilities/tree/orderedTree';
import { StartTimeAfterEndTimeError, StartTimeAfterDeadlineError } from '../model/task/TaskTimingError';
import { DuplicateTagNameError, EmptyTagNameError } from '../persistence/TagRepository';
import StepsTreeEditor, { StepsTreeEditorHandle } from './StepsTreeEditor';
import TypedQuickInput from './inputs/TypedQuickInput';
import ErrorMessage from './errors/ErrorMessage';
import EyeOffIcon from './svg-icons/EyeOffIcon';
import styles from './QuickAddTaskBar.module.css';

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

interface Props {
	placeholderTiersLongestFirst: string[];
}

export default function QuickAddTaskBar({ placeholderTiersLongestFirst }: Props) {
	const addTask = useTasksStore(s => s.addTask);
	const tasks = useTasksStore(s => s.tasks);
	const nightTime = useSettingsStore(s => s.nightTime);
	const morningTime = useSettingsStore(s => s.morningTime);
	const setShouldShowQuickAddTaskBarOnFocusPage = useSettingsStore(s => s.setShouldShowQuickAddTaskBarOnFocusPage);
	const tags = useTagsStore(s => s.tags);
	const tagsSortedByUsageCount = useMemo(() => sortTagsByUsageCount({ tags, tasks }), [tags, tasks]);

	const { name, setName, toggleTokenEscape, reset: resetTypedQuickInputEntry, ...parseResult } = useTypedQuickInputEntry({
		nightTime: Time.fromString(nightTime),
		morningTime: Time.fromString(morningTime),
		existingTags: tags,
	});
	const {
		alreadyAddedTagIDs,
		notYetAddedTagNames,
		reset: resetTagSelection,
	} = useTaskTagSelection({
		existingTags: tags,
		parsedTags: parseResult.tags,
		onStripRangeFromName: (startIndex, endIndex) => {
			const effectiveEndIndex = name[endIndex] === ' ' ? endIndex + 1 : endIndex;
			setName(name.slice(0, startIndex) + name.slice(effectiveEndIndex));
		},
	});
	const [demotedRange, setDemotedRange] = useState<{ start: number; end: number } | null>(null);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isCreatingTaskRef = useRef(false);
	const [manualSteps, setManualSteps] = useState<Step[]>([]);
	const [isStepsSectionVisible, setIsStepsSectionVisible] = useState(false);
	const stepsEditorRef = useRef<StepsTreeEditorHandle>(null);
	const isTouchDevice = useIsTouchDevice();

	function handleToggleTokenEscape(field: TypedQuickInputField, matchedText: string, startIndex: number, endIndex: number) {
		toggleTokenEscape(field, matchedText, startIndex, endIndex);
		setDemotedRange({ start: startIndex, end: endIndex });
	}

	function addStepAndFocus() {
		const newStep = createStep('');
		setManualSteps(previous => appendRootNode(previous, newStep));
		setTimeout(() => stepsEditorRef.current?.focusStep(newStep.id), 0);
	}

	function handleShiftEnter() {
		setIsStepsSectionVisible(true);
		addStepAndFocus();
	}

	function handleNameChange(newName: string) {
		setErrorMessage(null);
		setName(newName);
	}

	async function handleCreate() {
		if (isCreatingTaskRef.current) return;

		const description = parseResult.cleanedName.trim();
		if (!description) return;

		isCreatingTaskRef.current = true;
		setIsCreatingTask(true);
		try {
			const timing: TaskTimingOptions = { ...DEFAULT_TIMING, ...parseResult.timing };
			const task = await addTask(description, timing);

			for (const tagName of notYetAddedTagNames) {
				const existingTag = useTagsStore.getState().tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
				const tag = existingTag ?? await useTagsStore.getState().addTag(tagName);
				task.addTagID(tag.id);
			}
			for (const tagID of alreadyAddedTagIDs) {
				task.addTagID(tagID);
			}

			const typedStepNodes = (parseResult.steps ?? []).map(createStep);
			const combinedSteps = [...typedStepNodes, ...pruneEmptySteps(manualSteps)];
			if (combinedSteps.length > 0) task.replaceAllSteps(combinedSteps);

			await useTasksStore.getState().persistChangedTasks([task]);
			useTasksStore.getState().refreshTasks();

			setErrorMessage(null);
			resetTypedQuickInputEntry();
			resetTagSelection();
			setDemotedRange(null);
			setManualSteps([]);
			setIsStepsSectionVisible(false);
		} catch (creationError) {
			if (creationError instanceof StartTimeAfterEndTimeError) {
				setErrorMessage('Start time cannot be after end time.');
			} else if (creationError instanceof StartTimeAfterDeadlineError) {
				setErrorMessage('Start time cannot be after the deadline.');
			} else if (creationError instanceof DuplicateTagNameError || creationError instanceof EmptyTagNameError) {
				setErrorMessage(creationError.message);
			} else {
				setErrorMessage('Failed to create task.');
			}
		} finally {
			isCreatingTaskRef.current = false;
			setIsCreatingTask(false);
		}
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.bar}>
				<TypedQuickInput
					value={name}
					onChange={handleNameChange}
					tokens={parseResult.tokens}
					escapedTokens={parseResult.escapedTokens}
					onToggleTokenEscape={handleToggleTokenEscape}
					demotedRange={demotedRange}
					placeholderTiersLongestFirst={placeholderTiersLongestFirst}
					onSubmit={handleCreate}
					onShiftEnter={handleShiftEnter}
					editorClassName={styles.editor}
					disabled={isCreatingTask}
					existingTagsSortedByUsage={tagsSortedByUsageCount}
					alreadyAddedTagIDs={alreadyAddedTagIDs}
					notYetAddedTagNames={notYetAddedTagNames}
				/>
				<button
					type="button"
					onClick={handleCreate}
					className={`button primary ${styles.createButton}`}
					title="Create task (Enter)"
					disabled={isCreatingTask}
				>
					Add
				</button>
				<button
					type="button"
					onClick={() => setShouldShowQuickAddTaskBarOnFocusPage(false)}
					className={`button icon ${styles.hideButton}`}
					aria-label="Hide quick-add bar"
					title="Hide quick-add bar"
				>
					<EyeOffIcon className={styles.hideIcon} />
				</button>
			</div>

			<ErrorMessage message={errorMessage} />

			{isStepsSectionVisible && (
				<div className={styles.stepsSection}>
					<span className={styles.stepsLabel}>Steps</span>
					{manualSteps.length > 0 && (
						<StepsTreeEditor
							ref={stepsEditorRef}
							steps={manualSteps}
							isTouchDevice={isTouchDevice}
							showCheckboxes={false}
							hasOverallLeftMargin={false}
							onSetStepText={(stepID, text) => setManualSteps(previous => mapNode(previous, stepID, step => ({ ...step, text })))}
							onReparentStep={(stepID, newParentID, index) => setManualSteps(previous => reparentAndReorderNode(previous, stepID, newParentID, index))}
							onIndentStep={stepID => setManualSteps(previous => indentNode(previous, stepID))}
							onUnindentStep={stepID => setManualSteps(previous => unindentNode(previous, stepID))}
							onMoveStepUp={stepID => setManualSteps(previous => moveNodeAmongSiblings(previous, stepID, 'up'))}
							onMoveStepDown={stepID => setManualSteps(previous => moveNodeAmongSiblings(previous, stepID, 'down'))}
							onInsertStepBefore={stepID => { const newStep = createStep(''); setManualSteps(previous => insertSiblingRelativeToNode(previous, stepID, 'before', newStep)); return newStep.id; }}
							onInsertStepAfter={stepID => { const newStep = createStep(''); setManualSteps(previous => insertSiblingRelativeToNode(previous, stepID, 'after', newStep)); return newStep.id; }}
							onRequestDeleteStep={stepID => setManualSteps(previous => deleteNode(previous, stepID))}
							onBackspaceDeleteEmptyStep={stepID => { setManualSteps(previous => deleteNode(previous, stepID)); return true; }}
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
			)}
		</div>
	);
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import parseTypedQuickInput, { escapeTokenInText } from '../model/typed-quick-input/parseTypedQuickInput';
import { TypedQuickInputToken } from '../model/typed-quick-input/TypedQuickInputToken';
import Time from '../model/time-management/Time';
import ArrayInput, { ArrayInputHandle } from './inputs/ArrayInput';
import TypedQuickInput from './inputs/TypedQuickInput';
import EyeOffIcon from './svg-icons/EyeOffIcon';
import styles from './QuickAddTaskBar.module.css';

const DEFAULT_TIMING: TaskTimingOptions = {
	startTime: null,
	endTime: null,
	deadline: null,
	minDuration: null,
	maxDuration: null,
	repeatInterval: null,
	isMandatory: true,
};

interface Props {
	placeholderTiersLongestFirst: string[];
}

export default function QuickAddTaskBar({ placeholderTiersLongestFirst }: Props) {
	const addTask = useTasksStore(s => s.addTask);
	const nightTime = useSettingsStore(s => s.nightTime);
	const morningTime = useSettingsStore(s => s.morningTime);
	const setShouldShowQuickAddTaskBarOnFocusPage = useSettingsStore(s => s.setShouldShowQuickAddTaskBarOnFocusPage);

	const [name, setName] = useState('');
	const [demotedRange, setDemotedRange] = useState<{ start: number; end: number } | null>(null);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const isCreatingTaskRef = useRef(false);
	const [manualSteps, setManualSteps] = useState<string[]>([]);
	const [isStepsSectionVisible, setIsStepsSectionVisible] = useState(false);
	const stepsInputRef = useRef<ArrayInputHandle>(null);

	const parseResult = useMemo(
		() => parseTypedQuickInput({
			input: name,
			now: new Date(),
			nightTime: Time.fromString(nightTime),
			morningTime: Time.fromString(morningTime),
		}),
		[name, nightTime, morningTime]
	);

	function handleUnlinkToken(token: TypedQuickInputToken) {
		setName(escapeTokenInText(name, token));
		setDemotedRange({ start: token.startIndex, end: token.endIndex + 1 });
	}

	function handleShiftEnter() {
		setIsStepsSectionVisible(true);
	}

	useEffect(() => {
		if (!isStepsSectionVisible) return;
		stepsInputRef.current?.focusRow(manualSteps.length);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isStepsSectionVisible]);

	async function handleCreate() {
		if (isCreatingTaskRef.current) return;

		const description = parseResult.cleanedName.trim();
		if (!description) return;

		isCreatingTaskRef.current = true;
		setIsCreatingTask(true);
		try {
			const timing: TaskTimingOptions = { ...DEFAULT_TIMING, ...parseResult.timing };
			const task = await addTask(description, timing);

			const combinedSteps = [
				...(parseResult.steps ?? []),
				...manualSteps.map(step => step.trim()).filter(step => step !== ''),
			];
			if (combinedSteps.length > 0) task.editStepsText(combinedSteps);

			await useTasksStore.getState().persistChangedTasks([task]);
			useTasksStore.getState().refreshTasks();

			setName('');
			setDemotedRange(null);
			setManualSteps([]);
			setIsStepsSectionVisible(false);
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
					onChange={setName}
					tokens={parseResult.tokens}
					onUnlinkToken={handleUnlinkToken}
					demotedRange={demotedRange}
					placeholderTiersLongestFirst={placeholderTiersLongestFirst}
					onSubmit={handleCreate}
					onShiftEnter={handleShiftEnter}
					editorClassName={styles.editor}
					disabled={isCreatingTask}
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

			{isStepsSectionVisible && (
				<div className={styles.stepsSection}>
					<span className={styles.stepsLabel}>Steps</span>
					<ArrayInput
						ref={stepsInputRef}
						value={manualSteps}
						onChange={setManualSteps}
						placeholder="Add a step, or paste a list…"
					/>
				</div>
			)}
		</div>
	);
}

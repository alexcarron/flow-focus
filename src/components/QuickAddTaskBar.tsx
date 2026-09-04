import { useMemo, useState } from 'react';
import { useTasksStore } from '../stores/tasksStore';
import { useSettingsStore } from '../stores/settingsStore';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import parseTypedQuickInput, { escapeTokenInText } from '../model/typed-quick-input/parseTypedQuickInput';
import { TypedQuickInputToken } from '../model/typed-quick-input/TypedQuickInputToken';
import Time from '../model/time-management/Time';
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

	async function handleCreate() {
		const description = parseResult.cleanedName.trim();
		if (!description) return;

		const timing: TaskTimingOptions = { ...DEFAULT_TIMING, ...parseResult.timing };
		const task = await addTask(description, timing);

		await useTasksStore.getState().persistChangedTasks([task]);
		useTasksStore.getState().refreshTasks();

		setName('');
		setDemotedRange(null);
	}

	return (
		<div className={styles.bar}>
			<TypedQuickInput
				value={name}
				onChange={setName}
				tokens={parseResult.tokens}
				onUnlinkToken={handleUnlinkToken}
				demotedRange={demotedRange}
				placeholderTiersLongestFirst={placeholderTiersLongestFirst}
				onSubmit={handleCreate}
				editorClassName={styles.editor}
			/>
			<button
				type="button"
				onClick={handleCreate}
				className={`button primary ${styles.createButton}`}
				title="Create task (Enter)"
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
	);
}

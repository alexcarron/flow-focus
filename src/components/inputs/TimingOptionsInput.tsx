import { useState, useEffect } from 'react';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import DatetimeInput from './DatetimeInput';
import DurationInput from './DurationInput';
import DurationRangeInput from './DurationRangeInput';
import CheckboxInput from './CheckboxInput';
import styles from './TimingOptionsInput.module.css';

interface Props {
	value: TaskTimingOptions;
	onChange: (value: TaskTimingOptions) => void;
}

const DEFAULT_DURATION = 1000 * 60 * 30;

export default function TimingOptionsInput({ value, onChange }: Props) {
	const [local, setLocal] = useState<TaskTimingOptions>(value);

	useEffect(() => { setLocal(value); }, [value]);

	function update(patch: Partial<TaskTimingOptions>) {
		const next = { ...local, ...patch };
		setLocal(next);
		onChange(next);
	}

	return (
		<div className={styles.fields}>
			<DatetimeInput
				label="Start time"
				description="When this task will begin to appear. It will stay hidden until then. Leave blank if you can start this task right now."
				value={local.startTime}
				onChange={startTime => update({ startTime })}
			/>
			<DatetimeInput
				label="End time"
				description="When this task will no longer be shown, even if you haven't completed it yet. Leave blank if this task can always be attempted."
				value={local.endTime}
				onChange={endTime => update({ endTime })}
			/>
			<DatetimeInput
				label="Deadline"
				description="When you want this task to be completed. Leave blank if it does not matter when you complete this task."
				value={local.deadline}
				onChange={deadline => update({ deadline })}
			/>
			<DurationRangeInput
				minDuration={local.minDuration}
				maxDuration={local.maxDuration}
				onChange={({ minDuration, maxDuration }) => update({ minDuration, maxDuration })}
			/>
			<div className={styles.repeatToggle}>
				<CheckboxInput
					value={local.repeatInterval !== null}
					onChange={checked => update({ repeatInterval: checked ? DEFAULT_DURATION : null })}
					label="Repeating"
				/>
			</div>
			{local.repeatInterval !== null && (
				<DurationInput
					label="Repeat interval"
					value={local.repeatInterval}
					onChange={repeatInterval => update({ repeatInterval })}
				/>
			)}
			<CheckboxInput
				value={local.isMandatory}
				onChange={isMandatory => update({ isMandatory })}
				label="Mandatory"
				description="Whether this task should jump ahead of other optional tasks that are due sooner."
			/>
		</div>
	);
}

export { DEFAULT_DURATION };

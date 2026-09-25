import { useState } from 'react';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import RecurrenceDuration from '../../model/task/recurrence/RecurrenceDuration';
import RecurrenceUnit from '../../model/task/recurrence/RecurrenceUnit';
import DatetimeInput from './DatetimeInput';
import RecurrenceDurationInput from './RecurrenceDurationInput';
import DurationRangeInput from './DurationRangeInput';
import CheckboxInput from './CheckboxInput';
import MandatoryIcon from '../svg-icons/MandatoryIcon';
import styles from './TimingOptionsInput.module.css';

interface Props {
	value: TaskTimingOptions;
	onChange: (value: TaskTimingOptions) => void;
}

const DEFAULT_RECURRENCE_DURATION: RecurrenceDuration = { amount: 1, unit: RecurrenceUnit.Day };

export default function TimingOptionsInput({ value, onChange }: Props) {
	const [isAdvancedRepeatingOpen, setIsAdvancedRepeatingOpen] = useState(false);

	function update(patch: Partial<TaskTimingOptions>) {
		onChange({ ...value, ...patch });
	}

	return (
		<div className={styles.fields}>
			<DatetimeInput
				label="Start time"
				description="When this task will begin to appear. It will stay hidden until then. Leave blank if you can start this task right now."
				value={value.startTime}
				onChange={startTime => update({ startTime })}
				defaultTimeOfDay="morning"
			/>
			<DatetimeInput
				label="End time"
				description="When this task will no longer be shown, even if you haven't completed it yet. Leave blank if this task can always be attempted."
				value={value.endTime}
				onChange={endTime => update({ endTime })}
				defaultTimeOfDay="night"
			/>
			<DatetimeInput
				label="Deadline"
				description="When you want to complete this task. Leave blank if it does not matter when this task is done."
				value={value.deadline}
				onChange={deadline => update({ deadline })}
				defaultTimeOfDay="night"
			/>
			<DurationRangeInput
				minDuration={value.minDuration}
				maxDuration={value.maxDuration}
				onChange={({ minDuration, maxDuration }) => update({ minDuration, maxDuration })}
			/>
			<div className={styles.repeatToggle}>
				<CheckboxInput
					value={value.recurrenceDuration !== null}
					onChange={checked => update({ recurrenceDuration: checked ? DEFAULT_RECURRENCE_DURATION : null })}
					label="Repeating"
				/>
			</div>
			{value.recurrenceDuration !== null && (
				<>
					<RecurrenceDurationInput
						label="Repeat every"
						value={value.recurrenceDuration}
						onChange={recurrenceDuration => update({ recurrenceDuration })}
					/>
					<div className={styles.advancedRepeating}>
						<button
							type="button"
							className={styles.advancedRepeatingToggle}
							aria-expanded={isAdvancedRepeatingOpen}
							onClick={() => setIsAdvancedRepeatingOpen(isOpen => !isOpen)}
						>
							{isAdvancedRepeatingOpen ? 'Hide advanced' : 'Advanced'}
						</button>
						{isAdvancedRepeatingOpen && (
							<CheckboxInput
								value={value.shouldNotSkipMissedOccurrences}
								onChange={shouldNotSkipMissedOccurrences => update({ shouldNotSkipMissedOccurrences })}
								label="Don't skip missed repeats"
								description="If a repeat's deadline passes without you completing it, keep showing that overdue repeat until you complete or skip it, instead of moving on to the current one."
							/>
						)}
					</div>
				</>
			)}
			<CheckboxInput
				value={value.isMandatory}
				onChange={isMandatory => update({ isMandatory })}
				label="Mandatory"
				description="Whether this task should jump ahead of other optional tasks that are due sooner."
				icon={<MandatoryIcon />}
				accentColor="var(--color-mandatory)"
			/>
		</div>
	);
}

export { DEFAULT_RECURRENCE_DURATION };

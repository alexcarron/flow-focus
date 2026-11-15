import { useState } from 'react';
import TaskTimingOptions from '../../model/task/TaskTimingOptions';
import RecurrenceDuration, { getWeekdaysOfRecurrenceDuration, hasRecurrenceWeekdays } from '../../model/task/recurrence/RecurrenceDuration';
import RecurrenceUnit from '../../model/task/recurrence/RecurrenceUnit';
import { getDefaultTargetDateOfWeekdayRepeat, moveAnchorOccurrenceToFirstRecurrenceWeekday } from '../../model/task/recurrence/recurrenceWeekdayOccurrences';
import Time from '../../model/time-management/Time';
import { getStartOfDay } from '../../utilities/dateFormatting';
import { useSettingsStore } from '../../stores/settingsStore';
import DatetimeInput from './DatetimeInput';
import RecurrenceDurationInput from './RecurrenceDurationInput';
import DurationRangeInput from './DurationRangeInput';
import CheckboxInput from './CheckboxInput';
import styles from './TimingOptionsInput.module.css';

interface Props {
	value: TaskTimingOptions;
	onChange: (value: TaskTimingOptions) => void;
}

const DEFAULT_RECURRENCE_DURATION: RecurrenceDuration = { amount: 1, unit: RecurrenceUnit.Day };

function getTodayAtTimeOfDay(timeOfDay: Time): Date {
	const todayAtTimeOfDay = getStartOfDay(new Date());
	todayAtTimeOfDay.setHours(timeOfDay.getHour(), timeOfDay.getMinute());
	return todayAtTimeOfDay;
}

export default function TimingOptionsInput({ value, onChange }: Props) {
	const [isAdvancedRepeatingOpen, setIsAdvancedRepeatingOpen] = useState(false);
	const morningTime = Time.fromString(useSettingsStore(state => state.morningTime));
	const nightTime = Time.fromString(useSettingsStore(state => state.nightTime));

	function update(patch: Partial<TaskTimingOptions>) {
		onChange({ ...value, ...patch });
	}

	function updateRecurrenceDuration(recurrenceDuration: RecurrenceDuration) {
		if (!hasRecurrenceWeekdays(recurrenceDuration)) {
			update({ recurrenceDuration });
			return;
		}

		const wereWeekdaysSelectedBefore = value.recurrenceDuration !== null && hasRecurrenceWeekdays(value.recurrenceDuration);
		const anchorOccurrence = moveAnchorOccurrenceToFirstRecurrenceWeekday({
			startDate: value.startDate ?? getTodayAtTimeOfDay(morningTime),
			targetDate: value.targetDate,
			dueDate: value.dueDate,
			weekdays: getWeekdaysOfRecurrenceDuration(recurrenceDuration),
		});
		const hasTargetOrDueDate = anchorOccurrence.targetDate !== null || anchorOccurrence.dueDate !== null;
		if (!wereWeekdaysSelectedBefore && !hasTargetOrDueDate) {
			anchorOccurrence.targetDate = getDefaultTargetDateOfWeekdayRepeat({
				startDate: anchorOccurrence.startDate,
				endOfDayTimeOfDay: { hour: nightTime.getHour(), minute: nightTime.getMinute() },
			});
		}
		update({
			recurrenceDuration,
			...anchorOccurrence,
		});
	}

	return (
		<div className={styles.fields}>
			<DatetimeInput
				label="Start date"
				description="The earliest you can work on this task. It stays hidden until then. Leave blank if you can start it right now."
				value={value.startDate}
				onChange={startDate => update({ startDate })}
				defaultTimeOfDay="morning"
			/>
			<DatetimeInput
				label="Target date"
				description="When you'd ideally like this done. Missing it just means your plan slipped. Leave blank if you're not aiming for a date."
				value={value.targetDate}
				onChange={targetDate => update({ targetDate })}
				defaultTimeOfDay="night"
			/>
			<DatetimeInput
				label="Due date"
				description="When this has to be done. Only a due date can make a task urgent. Leave blank if it doesn't have to be done by a certain date."
				value={value.dueDate}
				onChange={dueDate => update({ dueDate })}
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
						onChange={updateRecurrenceDuration}
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
								description="If you don't complete a repeat before the next one starts, keep showing the missed one until you complete or skip it, instead of moving on to the current one."
							/>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export { DEFAULT_RECURRENCE_DURATION };

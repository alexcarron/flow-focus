import RecurrenceDuration, { canRecurrenceDurationHaveWeekdays, getWeekdaysOfRecurrenceDuration } from '../../model/task/recurrence/RecurrenceDuration';
import RecurrenceUnit, { RECURRENCE_UNITS_LARGEST_FIRST, isRecurrenceUnit } from '../../model/task/recurrence/RecurrenceUnit';
import Weekday, { getAbbreviatedNameOfWeekday, getFullNameOfWeekday, WEEKDAYS_FROM_MONDAY } from '../../model/time-management/Weekday';
import styles from './DurationInput.module.css';
import recurrenceStyles from './RecurrenceDurationInput.module.css';

interface Props {
	value: RecurrenceDuration;
	onChange: (value: RecurrenceDuration) => void;
	label?: string;
	className?: string;
}

const MINIMUM_AMOUNT = 1;

const unitOptionsSmallestFirst = [...RECURRENCE_UNITS_LARGEST_FIRST].reverse();

function pluralizeUnit(unit: RecurrenceUnit, amount: number): string {
	return amount === 1 ? unit : `${unit}s`;
}

function changeAmountAndUnitKeepingAllowedWeekdays({ amount, unit, weekdays }: RecurrenceDuration): RecurrenceDuration {
	if (weekdays === undefined || !canRecurrenceDurationHaveWeekdays({ amount, unit })) return { amount, unit };
	return {
		amount,
		unit,
		weekdays,
	};
}

function toggleWeekdayOfRecurrenceDuration({ recurrenceDuration, weekday }: { recurrenceDuration: RecurrenceDuration; weekday: Weekday }): RecurrenceDuration {
	const selectedWeekdays = getWeekdaysOfRecurrenceDuration(recurrenceDuration);
	const wasWeekdaySelected = selectedWeekdays.includes(weekday);
	const weekdaysFromMonday = WEEKDAYS_FROM_MONDAY.filter(candidateWeekday => {
		if (candidateWeekday === weekday) return !wasWeekdaySelected;
		return selectedWeekdays.includes(candidateWeekday);
	});
	if (weekdaysFromMonday.length === 0) return { amount: recurrenceDuration.amount, unit: recurrenceDuration.unit };
	return {
		amount: recurrenceDuration.amount,
		unit: recurrenceDuration.unit,
		weekdays: weekdaysFromMonday,
	};
}

export default function RecurrenceDurationInput({ value, onChange, label, className = '' }: Props) {
	const selectedWeekdays = getWeekdaysOfRecurrenceDuration(value);

	return (
		<div className={`field-group ${className}`}>
			{label && <label className="field-label">{label}</label>}
			<div className={styles.control}>
				<input
					type="number"
					min={MINIMUM_AMOUNT}
					step={1}
					value={value.amount}
					className={`field ${styles.amount}`}
					onChange={event => {
						const parsedAmount = parseInt(event.target.value, 10);
						if (isNaN(parsedAmount)) return;
						onChange(changeAmountAndUnitKeepingAllowedWeekdays({ ...value, amount: Math.max(MINIMUM_AMOUNT, parsedAmount) }));
					}}
				/>
				<select
					value={value.unit}
					tabIndex={-1}
					className="field"
					onChange={event => {
						const selectedUnit = event.target.value;
						if (!isRecurrenceUnit(selectedUnit)) return;
						onChange(changeAmountAndUnitKeepingAllowedWeekdays({ ...value, unit: selectedUnit }));
					}}
				>
					{unitOptionsSmallestFirst.map(unit => (
						<option key={unit} value={unit}>{pluralizeUnit(unit, value.amount)}</option>
					))}
				</select>
			</div>
			{canRecurrenceDurationHaveWeekdays(value) && (
				<div className={recurrenceStyles.weekdayToggles} role="group" aria-label="Repeat on weekdays">
					{WEEKDAYS_FROM_MONDAY.map(weekday => {
						const isSelected = selectedWeekdays.includes(weekday);
						return (
							<button
								key={weekday}
								type="button"
								aria-pressed={isSelected}
								aria-label={getFullNameOfWeekday(weekday)}
								title={getFullNameOfWeekday(weekday)}
								className={isSelected ? `${recurrenceStyles.weekdayToggle} ${recurrenceStyles.weekdayToggleSelected}` : recurrenceStyles.weekdayToggle}
								onClick={() => onChange(toggleWeekdayOfRecurrenceDuration({ recurrenceDuration: value, weekday }))}
							>
								{getAbbreviatedNameOfWeekday(weekday).charAt(0)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

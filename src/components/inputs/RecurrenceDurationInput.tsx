import RecurrenceDuration from '../../model/task/recurrence/RecurrenceDuration';
import RecurrenceUnit, { RECURRENCE_UNITS_LARGEST_FIRST, isRecurrenceUnit } from '../../model/task/recurrence/RecurrenceUnit';
import styles from './DurationInput.module.css';

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

export default function RecurrenceDurationInput({ value, onChange, label, className = '' }: Props) {
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
						onChange({ ...value, amount: Math.max(MINIMUM_AMOUNT, parsedAmount) });
					}}
				/>
				<select
					value={value.unit}
					tabIndex={-1}
					className="field"
					onChange={event => {
						const selectedUnit = event.target.value;
						if (!isRecurrenceUnit(selectedUnit)) return;
						onChange({ ...value, unit: selectedUnit });
					}}
				>
					{unitOptionsSmallestFirst.map(unit => (
						<option key={unit} value={unit}>{pluralizeUnit(unit, value.amount)}</option>
					))}
				</select>
			</div>
		</div>
	);
}

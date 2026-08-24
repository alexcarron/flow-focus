import { useState, useEffect } from 'react';
import { formatTime } from '../../utils/formatters';
import { SHORTCUTS, matchesShortcut, formatShortcut } from '../../config/shortcuts';
import styles from './DurationInput.module.css';

interface Props {
	value: number | null;
	onChange: (value: number | null) => void;
	label?: string;
	className?: string;
}

const UNIT_OPTIONS = [
	{ label: 'milliseconds', ms: 1 },
	{ label: 'seconds', ms: 1000 },
	{ label: 'minutes', ms: 60_000 },
	{ label: 'hours', ms: 3_600_000 },
	{ label: 'days', ms: 86_400_000 },
	{ label: 'weeks', ms: 604_800_000 },
];

const UNIT_SHORTCUT_MAP: Array<{ ms: number; shortcut: typeof SHORTCUTS.duration[keyof typeof SHORTCUTS.duration] }> = [
	{ ms: 1000, shortcut: SHORTCUTS.duration.unitSeconds },
	{ ms: 60_000, shortcut: SHORTCUTS.duration.unitMinutes },
	{ ms: 3_600_000, shortcut: SHORTCUTS.duration.unitHours },
	{ ms: 86_400_000, shortcut: SHORTCUTS.duration.unitDays },
	{ ms: 604_800_000, shortcut: SHORTCUTS.duration.unitWeeks },
];

function detectUnit(ms: number | null): number {
	if (ms === null || ms === 0) return 60_000;
	for (let i = UNIT_OPTIONS.length - 1; i >= 0; i--) {
		if (ms % UNIT_OPTIONS[i].ms === 0) return UNIT_OPTIONS[i].ms;
	}
	return 1;
}

const shortcuts = SHORTCUTS.duration;

export default function DurationInput({ value, onChange, label, className = '' }: Props) {
	const [unitMs, setUnitMs] = useState<number>(() => detectUnit(value));

	useEffect(() => {
		if (value !== null && value !== 0 && value % unitMs !== 0) {
			setUnitMs(detectUnit(value));
		}
	}, [value]);

	const amount = value !== null ? value / unitMs : 0;

	function adjust(delta: number) {
		const current = value ?? 0;
		const newVal = Math.max(0, current + delta * unitMs);
		onChange(newVal);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		for (const { ms, shortcut } of UNIT_SHORTCUT_MAP) {
			if (matchesShortcut(event, shortcut)) {
				event.preventDefault();
				setUnitMs(ms);
				return;
			}
		}
		if (matchesShortcut(event, shortcuts.clear)) {
			event.preventDefault();
			onChange(null);
		} else if (matchesShortcut(event, shortcuts.increment10)) {
			event.preventDefault();
			adjust(10);
		} else if (matchesShortcut(event, shortcuts.decrement10)) {
			event.preventDefault();
			adjust(-10);
		} else if (matchesShortcut(event, shortcuts.increment1)) {
			event.preventDefault();
			adjust(1);
		} else if (matchesShortcut(event, shortcuts.decrement1)) {
			event.preventDefault();
			adjust(-1);
		}
	}

	return (
		<div className={`field-group ${className}`}>
			{label && <label className="field-label">{label}</label>}
			<div className={styles.control}>
				<button
					type="button"
					tabIndex={-1}
					title={`-10 units (${formatShortcut(shortcuts.decrement10)})`}
					onClick={() => adjust(-10)}
					className="button adjust"
				>
					-10
				</button>
				<button
					type="button"
					tabIndex={-1}
					title={`-1 unit (${formatShortcut(shortcuts.decrement1)})`}
					onClick={() => adjust(-1)}
					className="button adjust"
				>
					-1
				</button>
				<input
					type="number"
					min={0}
					value={amount}
					className={`field ${styles.amount}`}
					onChange={event => {
						const parsedValue = parseFloat(event.target.value);
						onChange(isNaN(parsedValue) ? null : Math.round(parsedValue * unitMs));
					}}
					onKeyDown={handleKeyDown}
				/>
				<select
					value={unitMs}
					tabIndex={-1}
					className="field"
					onChange={event => {
						const newUnitMs = parseInt(event.target.value);
						setUnitMs(newUnitMs);
						onChange(Math.round(amount) * newUnitMs);
					}}
				>
					{UNIT_OPTIONS.map(opt => (
						<option key={opt.ms} value={opt.ms}>{opt.label}</option>
					))}
				</select>
				<button
					type="button"
					tabIndex={-1}
					title={`+1 unit (${formatShortcut(shortcuts.increment1)})`}
					onClick={() => adjust(1)}
					className="button adjust"
				>
					+1
				</button>
				<button
					type="button"
					tabIndex={-1}
					title={`+10 units (${formatShortcut(shortcuts.increment10)})`}
					onClick={() => adjust(10)}
					className="button adjust"
				>
					+10
				</button>
			</div>
			{value !== null && (
				<span className={styles.hint}>
					{formatTime(value)}
				</span>
			)}
		</div>
	);
}

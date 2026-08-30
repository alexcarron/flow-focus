import { SHORTCUTS, matchesShortcut, formatShortcut } from '../../config/shortcuts';
import { useSettingsStore } from '../../stores/settingsStore';
import Time from '../../model/time-management/Time';
import FieldDescription from './FieldDescription';
import styles from './DatetimeInput.module.css';

interface Props {
	value: Date | null;
	onChange: (value: Date | null) => void;
	label?: string;
	description?: string;
	className?: string;
}

function toLocalDatetimeString(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
		`T${pad(date.getHours())}:${pad(date.getMinutes())}`
	);
}

function adjustDate(base: Date | null, days: number): Date {
	const d = base ? new Date(base) : new Date();
	d.setDate(d.getDate() + days);
	return d;
}

function setTimeOfDay(base: Date | null, hours: number, minutes: number): Date {
	const d = base ? new Date(base) : new Date();
	d.setHours(hours, minutes, 0, 0);
	return d;
}

function toToday(base: Date | null): Date {
	const now = new Date();
	const d = base ? new Date(base) : now;
	d.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
	return d;
}

const shortcuts = SHORTCUTS.datetime;

export default function DatetimeInput({ value, onChange, label, description, className = '' }: Props) {
	const morningTime = useSettingsStore(s => s.morningTime);
	const nightTime = useSettingsStore(s => s.nightTime);
	const morning = Time.fromString(morningTime);
	const night = Time.fromString(nightTime);

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Tab') {
			event.preventDefault();
			const tabbable = Array.from(
				document.querySelectorAll<HTMLElement>(
					'input:not([tabindex="-1"]), select:not([tabindex="-1"]), [tabindex="0"]'
				)
			);
			const idx = tabbable.indexOf(event.currentTarget);
			if (idx !== -1) {
				const target = event.shiftKey ? tabbable[idx - 1] : tabbable[idx + 1];
				target?.focus();
			}
			return;
		}
		if (matchesShortcut(event, shortcuts.today)) {
			event.preventDefault();
			onChange(toToday(value));
		} else if (matchesShortcut(event, shortcuts.morning)) {
			event.preventDefault();
			onChange(setTimeOfDay(value, morning.getHour(), morning.getMinute()));
		} else if (matchesShortcut(event, shortcuts.night)) {
			event.preventDefault();
			onChange(setTimeOfDay(value, night.getHour(), night.getMinute()));
		} else if (matchesShortcut(event, shortcuts.nextDay)) {
			event.preventDefault();
			onChange(adjustDate(value, 1));
		} else if (matchesShortcut(event, shortcuts.prevDay)) {
			event.preventDefault();
			onChange(adjustDate(value, -1));
		} else if (matchesShortcut(event, shortcuts.clear)) {
			event.preventDefault();
			onChange(null);
		}
	}

	return (
		<div className={`${styles.container} ${className}`}>
			{description && <FieldDescription text={description} className={styles.description} />}
			{label && <label className={styles.heading}>{label}</label>}
			<input
				type="datetime-local"
				value={value ? toLocalDatetimeString(value) : ''}
				className="field"
				onChange={event => {
					onChange(event.target.value ? new Date(event.target.value) : null);
				}}
				onKeyDown={handleKeyDown}
			/>
			<div className={styles.quickActions}>
				<button
					type="button"
					tabIndex={-1}
					title={`Today (${formatShortcut(shortcuts.today)})`}
					onClick={() => onChange(toToday(value))}
					className="button adjust"
				>
					Today
				</button>
				<button
					type="button"
					tabIndex={-1}
					title={`−1 day (${formatShortcut(shortcuts.prevDay)})`}
					onClick={() => onChange(adjustDate(value, -1))}
					className="button adjust"
				>
					−1d
				</button>
				<button
					type="button"
					tabIndex={-1}
					title={`+1 day (${formatShortcut(shortcuts.nextDay)})`}
					onClick={() => onChange(adjustDate(value, 1))}
					className="button adjust"
				>
					+1d
				</button>
				<button
					type="button"
					tabIndex={-1}
					title={`Morning ${morningTime} (${formatShortcut(shortcuts.morning)})`}
					onClick={() => onChange(setTimeOfDay(value, morning.getHour(), morning.getMinute()))}
					className="button adjust"
				>
					Morning
				</button>
				<button
					type="button"
					tabIndex={-1}
					title={`Night ${nightTime} (${formatShortcut(shortcuts.night)})`}
					onClick={() => onChange(setTimeOfDay(value, night.getHour(), night.getMinute()))}
					className="button adjust"
				>
					Night
				</button>
				{value && (
					<button
						type="button"
						tabIndex={-1}
						onClick={() => onChange(null)}
						className={styles.clearButton}
					>
						Clear
					</button>
				)}
			</div>
		</div>
	);
}

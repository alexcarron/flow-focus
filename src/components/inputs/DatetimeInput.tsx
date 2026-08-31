import { useEffect, useRef, useState } from 'react';
import { SHORTCUTS, matchesShortcut, formatShortcut } from '../../config/shortcuts';
import { useSettingsStore } from '../../stores/settingsStore';
import Time from '../../model/time-management/Time';
import parseDatePhrase from '../../model/typed-quick-input/parseDatePhrase';
import FieldDescription from './FieldDescription';
import styles from './DatetimeInput.module.css';

type TimeOfDayPreset = 'morning' | 'night';

interface Props {
	value: Date | null;
	onChange: (value: Date | null) => void;
	label?: string;
	description?: string;
	className?: string;
	defaultTimeOfDay?: TimeOfDayPreset;
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

function isUnmodifiedLetterKeydown(event: React.KeyboardEvent): boolean {
	return (
		event.key.length === 1 &&
		/[a-zA-Z]/.test(event.key) &&
		!event.ctrlKey &&
		!event.altKey &&
		!event.metaKey
	);
}

function formatTimeOfDay(hour: number, minute: number): string {
	return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const shortcuts = SHORTCUTS.datetime;

export default function DatetimeInput({ value, onChange, label, description, className = '', defaultTimeOfDay }: Props) {
	const morningTime = useSettingsStore(s => s.morningTime);
	const nightTime = useSettingsStore(s => s.nightTime);
	const morning = Time.fromString(morningTime);
	const night = Time.fromString(nightTime);

	const [isDateFocused, setIsDateFocused] = useState(false);
	const showEmptyPlaceholder = !value && !isDateFocused;
	const [isTypingMode, setIsTypingMode] = useState(false);
	const [typedText, setTypedText] = useState('');
	const typedInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isTypingMode) typedInputRef.current?.focus();
	}, [isTypingMode]);

	function timeOfDayPresetToTime(preset: TimeOfDayPreset): Time {
		return preset === 'morning' ? morning : night;
	}

	function applyDefaultTimeOfDayToBareDatePick(pickedDate: Date, wasEmptyBeforePick: boolean): Date {
		if (!wasEmptyBeforePick || !defaultTimeOfDay) return pickedDate;
		const time = timeOfDayPresetToTime(defaultTimeOfDay);
		return setTimeOfDay(pickedDate, time.getHour(), time.getMinute());
	}

	function resolveTypedPhraseDate(phraseDate: Date, explicitTimeOfDay: { hour: number; minute: number } | undefined): Date {
		const resolved = new Date(phraseDate);
		if (explicitTimeOfDay) {
			resolved.setHours(explicitTimeOfDay.hour, explicitTimeOfDay.minute, 0, 0);
			return resolved;
		}
		if (defaultTimeOfDay) {
			const time = timeOfDayPresetToTime(defaultTimeOfDay);
			resolved.setHours(time.getHour(), time.getMinute(), 0, 0);
			return resolved;
		}
		if (value) {
			resolved.setHours(value.getHours(), value.getMinutes(), 0, 0);
			return resolved;
		}
		resolved.setHours(0, 0, 0, 0);
		return resolved;
	}

	const parsedTypedPhrase = typedText.trim()
		? parseDatePhrase({ text: typedText, morningTime: morning, nightTime: night })
		: null;

	function commitTypedText() {
		if (parsedTypedPhrase) {
			onChange(resolveTypedPhraseDate(parsedTypedPhrase.date, parsedTypedPhrase.timeOfDay));
		}
		setIsTypingMode(false);
		setTypedText('');
	}

	function cancelTypedText() {
		setIsTypingMode(false);
		setTypedText('');
	}

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
		} else if (isUnmodifiedLetterKeydown(event)) {
			event.preventDefault();
			setTypedText(event.key);
			setIsTypingMode(true);
		}
	}

	return (
		<div className={`${styles.container} ${className}`}>
			{description && <FieldDescription text={description} className={styles.description} />}
			{label && <label className={styles.heading}>{label}</label>}
			{isTypingMode ? (
				<div className={styles.typedEntry}>
					<input
						ref={typedInputRef}
						type="text"
						value={typedText}
						placeholder="Type a date and time (e.g. 'tomorrow' or 'sep 3 11pm')"
						className="field"
						onChange={event => setTypedText(event.target.value)}
						onKeyDown={event => {
							if (event.key === 'Enter') {
								event.preventDefault();
								commitTypedText();
							} else if (event.key === 'Escape') {
								event.preventDefault();
								cancelTypedText();
							}
						}}
						onBlur={commitTypedText}
					/>
					<span className={parsedTypedPhrase ? styles.previewMatched : styles.previewUnmatched}>
						{parsedTypedPhrase
							? `${parsedTypedPhrase.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}${
								parsedTypedPhrase.timeOfDay
									? ` at ${formatTimeOfDay(parsedTypedPhrase.timeOfDay.hour, parsedTypedPhrase.timeOfDay.minute)}`
									: ''
							}`
							: typedText
								? 'No match yet. Press Escape to cancel'
								: ''}
					</span>
				</div>
			) : (
				<div className={styles.dateFieldWrapper}>
					<input
						type="datetime-local"
						value={value ? toLocalDatetimeString(value) : ''}
						className={`field ${showEmptyPlaceholder ? styles.dateInputTextHidden : ''}`}
						onFocus={() => setIsDateFocused(true)}
						onBlur={() => setIsDateFocused(false)}
						onChange={event => {
							const wasEmptyBeforePick = value === null;
							const pickedValue = event.target.value ? new Date(event.target.value) : null;
							onChange(pickedValue ? applyDefaultTimeOfDayToBareDatePick(pickedValue, wasEmptyBeforePick) : null);
							event.currentTarget.focus();
						}}
						onKeyDown={handleKeyDown}
					/>
					{showEmptyPlaceholder && (
						<div className={styles.emptyPlaceholder}>Pick or type a date and time (e.g. 'tomorrow' or 'sep 3 11pm')</div>
					)}
				</div>
			)}
			{!isTypingMode && (
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
			)}
		</div>
	);
}

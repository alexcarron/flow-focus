import { useState } from 'react';
import DurationInput from './DurationInput';
import FieldDescription from './FieldDescription';
import { TimeUnitName, timeUnits } from '../../model/time-management/StandardTimeUnit';
import styles from './DurationRangeInput.module.css';

interface Props {
	minDuration: number | null;
	maxDuration: number | null;
	onChange: (patch: { minDuration: number | null; maxDuration: number | null }) => void;
}

type DurationPresetBound = { amount: number; unit: TimeUnitName };
type DurationPreset = { label: string; min: DurationPresetBound; max: DurationPresetBound };

const DURATION_PRESETS: DurationPreset[] = [
	{ label: 'A few minutes', min: { amount: 0, unit: TimeUnitName.Minutes }, max: { amount: 15, unit: TimeUnitName.Minutes } },
	{ label: 'Less than an hour', min: { amount: 15, unit: TimeUnitName.Minutes }, max: { amount: 50, unit: TimeUnitName.Minutes } },
	{ label: 'About an hour', min: { amount: 30, unit: TimeUnitName.Minutes }, max: { amount: 90, unit: TimeUnitName.Minutes } },
	{ label: 'A few hours', min: { amount: 1, unit: TimeUnitName.Hours }, max: { amount: 4, unit: TimeUnitName.Hours } },
	{ label: 'All day', min: { amount: 4, unit: TimeUnitName.Hours }, max: { amount: 16, unit: TimeUnitName.Hours } },
];

function durationPresetBoundToMilliseconds(bound: DurationPresetBound): number {
	return bound.amount * timeUnits[bound.unit].milliseconds;
}

export default function DurationRangeInput({ minDuration, maxDuration, onChange }: Props) {
	const [isRangeExpanded, setIsRangeExpanded] = useState(minDuration !== maxDuration);
	const [appliedPreset, setAppliedPreset] = useState<DurationPreset | null>(null);

	function applyPreset(preset: DurationPreset) {
		setIsRangeExpanded(true);
		setAppliedPreset(preset);
		onChange({
			minDuration: durationPresetBoundToMilliseconds(preset.min),
			maxDuration: durationPresetBoundToMilliseconds(preset.max),
		});
	}

	function collapseToSingleDuration() {
		setIsRangeExpanded(false);
		onChange({ minDuration, maxDuration: minDuration });
	}

	const minForcedUnitMs = appliedPreset ? timeUnits[appliedPreset.min.unit].milliseconds : undefined;
	const maxForcedUnitMs = appliedPreset ? timeUnits[appliedPreset.max.unit].milliseconds : undefined;

	return (
		<div className={styles.container}>
			<FieldDescription
				text="How long you estimate this task will take. Leave blank if unsure."
				className={styles.description}
			/>
			<label className={styles.heading}>Duration</label>

			{isRangeExpanded ? (
				<div className={styles.rangeSection}>
					<div className={styles.rangeFields}>
						<DurationInput
							label="Min duration"
							value={minDuration}
							onChange={newMinDuration => onChange({ minDuration: newMinDuration, maxDuration })}
							forcedUnitMs={minForcedUnitMs}
						/>
						<span className={styles.rangeSeparator}>to</span>
						<DurationInput
							label="Max duration"
							value={maxDuration}
							onChange={newMaxDuration => onChange({ minDuration, maxDuration: newMaxDuration })}
							forcedUnitMs={maxForcedUnitMs}
						/>
					</div>
				</div>
			) : (
				<div className={styles.singleSection}>
					<DurationInput
						value={minDuration}
						onChange={duration => onChange({ minDuration: duration, maxDuration: duration })}
						forcedUnitMs={minForcedUnitMs}
					/>
				</div>
			)}

			<div className={styles.presets}>
				{DURATION_PRESETS.map(preset => (
					<button
						key={preset.label}
						type="button"
						className={`button adjust ${styles.presetButton}`}
						onClick={() => applyPreset(preset)}
					>
						{preset.label}
					</button>
				))}
			</div>

			{isRangeExpanded
			? (
				<button
					type="button"
					className={styles.linkButton}
					onClick={collapseToSingleDuration}
				>
					Use a single duration instead
				</button>
			)
			: (
				<button
					type="button"
					className={styles.linkButton}
					onClick={() => setIsRangeExpanded(true)}
				>
					Give a specific duration range instead
				</button>
			)}
		</div>
	);
}

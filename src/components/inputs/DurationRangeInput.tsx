import { useState } from 'react';
import DurationInput from './DurationInput';
import styles from './DurationRangeInput.module.css';

interface Props {
	minDuration: number | null;
	maxDuration: number | null;
	onChange: (patch: { minDuration: number | null; maxDuration: number | null }) => void;
}

const DURATION_PRESETS = [
	{ label: 'A few minutes', minDuration: 0, maxDuration: 15 * 60_000 },
	{ label: 'Less than an hour', minDuration: 15 * 60_000, maxDuration: 50 * 60_000 },
	{ label: 'About an hour', minDuration: 30 * 60_000, maxDuration: 90 * 60_000 },
	{ label: 'A few hours', minDuration: 3_600_000, maxDuration: 4 * 3_600_000 },
	{ label: 'All day', minDuration: 4 * 3_600_000, maxDuration: 16 * 3_600_000 },
];

export default function DurationRangeInput({ minDuration, maxDuration, onChange }: Props) {
	const [isRangeExpanded, setIsRangeExpanded] = useState(minDuration !== maxDuration);

	function applyPreset(preset: typeof DURATION_PRESETS[number]) {
		setIsRangeExpanded(true);
		onChange({ minDuration: preset.minDuration, maxDuration: preset.maxDuration });
	}

	function collapseToSingleDuration() {
		setIsRangeExpanded(false);
		onChange({ minDuration, maxDuration: minDuration });
	}

	return (
		<div className={styles.container}>
			<label className={styles.heading}>Duration</label>
			<p className={styles.description}>How long will this task take? Leave blank if unsure</p>

			{isRangeExpanded ? (
				<div className={styles.rangeSection}>
					<div className={styles.rangeFields}>
						<DurationInput
							label="Min duration"
							value={minDuration}
							onChange={newMinDuration => onChange({ minDuration: newMinDuration, maxDuration })}
						/>
						<span className={styles.rangeSeparator}>to</span>
						<DurationInput
							label="Max duration"
							value={maxDuration}
							onChange={newMaxDuration => onChange({ minDuration, maxDuration: newMaxDuration })}
						/>
					</div>
				</div>
			) : (
				<div className={styles.singleSection}>
					<DurationInput
						value={minDuration}
						onChange={duration => onChange({ minDuration: duration, maxDuration: duration })}
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

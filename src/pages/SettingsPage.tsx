import { useRef, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTasksStore } from '../stores/tasksStore';
import { applyBackup, createBackup, downloadBackup, readBackupFile, BackupData } from '../utilities/backup';
import ConfirmModal from '../components/ConfirmModal';
import CheckboxInput from '../components/inputs/CheckboxInput';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
	const morningTime = useSettingsStore(s => s.morningTime);
	const nightTime = useSettingsStore(s => s.nightTime);
	const bedtime = useSettingsStore(s => s.bedtime);
	const wakeTime = useSettingsStore(s => s.wakeTime);
	const shouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.shouldKeepTaskDetailsAfterCreating);
	const setMorningTime = useSettingsStore(s => s.setMorningTime);
	const setNightTime = useSettingsStore(s => s.setNightTime);
	const setBedtime = useSettingsStore(s => s.setBedtime);
	const setWakeTime = useSettingsStore(s => s.setWakeTime);
	const setShouldKeepTaskDetailsAfterCreating = useSettingsStore(s => s.setShouldKeepTaskDetailsAfterCreating);

	const tasks = useTasksStore(s => s.tasks);
	const [backupStatus, setBackupStatus] = useState<string | null>(null);
	const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleExport() {
		downloadBackup(createBackup(), 'flow-focus-backup');
		setBackupStatus('Backup exported.');
	}

	async function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;

		let data;
		try {
			data = await readBackupFile(file);
		} catch (err) {
			setBackupStatus(err instanceof Error ? err.message : 'Failed to read backup file.');
			return;
		}

		setPendingImportData(data);
	}

	async function confirmImport() {
		if (pendingImportData === null) return;
		const data = pendingImportData;
		setPendingImportData(null);

		if (tasks.length > 0) {
			downloadBackup(createBackup(), 'flow-focus-pre-import-backup');
		}

		await applyBackup(data);
		setBackupStatus(`Imported ${data.tasks.length} task${data.tasks.length === 1 ? '' : 's'}.`);
	}

	return (
		<div className={styles.page}>
			<h1>Settings</h1>

			<section className={styles.section}>
				<div>
					<h2 className={styles.sectionHeading}>Time Shortcuts</h2>
					<p className={styles.sectionDescription}>
						Used by the "Morning" and "Night" quick-set buttons when picking a date and time.
					</p>
				</div>

				<div className="field-group">
					<label className="field-label">Morning</label>
					<input
						type="time"
						value={morningTime}
						onChange={event => setMorningTime(event.target.value)}
						className="field large"
					/>
				</div>

				<div className="field-group">
					<label className="field-label">Night</label>
					<input
						type="time"
						value={nightTime}
						onChange={event => setNightTime(event.target.value)}
						className="field large"
					/>
				</div>
			</section>

			<section className={styles.section}>
				<div>
					<h2 className={styles.sectionHeading}>Sleep Schedule</h2>
					<p className={styles.sectionDescription}>
						Time spent asleep is subtracted when calculating how much time you have left to complete a task.
					</p>
				</div>

				<div className="field-group">
					<label className="field-label">Bedtime</label>
					<input
						type="time"
						value={bedtime}
						onChange={event => setBedtime(event.target.value)}
						className="field large"
					/>
				</div>

				<div className="field-group">
					<label className="field-label">Wake-up time</label>
					<input
						type="time"
						value={wakeTime}
						onChange={event => setWakeTime(event.target.value)}
						className="field large"
					/>
				</div>
			</section>

			<section className={styles.section}>
				<div>
					<h2 className={styles.sectionHeading}>Task Creation</h2>
				</div>

				<CheckboxInput
					value={shouldKeepTaskDetailsAfterCreating}
					onChange={setShouldKeepTaskDetailsAfterCreating}
					label="Keep task details when creating task"
				/>
			</section>

			<section className={styles.section}>
				<div>
					<h2 className={styles.sectionHeading}>Backup & Restore</h2>
					<p className={styles.sectionDescription}>
						Export all tasks and settings to a JSON file, or import a previously exported file.
						Importing replaces all current tasks and settings.
					</p>
				</div>

				<div className={styles.buttonRow}>
					<button onClick={handleExport} className="button outlined">
						Export Backup
					</button>
					<button onClick={() => fileInputRef.current?.click()} className="button outlined">
						Import Backup
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept="application/json"
						onChange={handleImportFileChange}
						className={styles.hiddenFileInput}
					/>
				</div>

				{backupStatus && <p className={styles.statusMessage}>{backupStatus}</p>}
			</section>

			<ConfirmModal
				headingText="Import backup?"
				descriptionText="Importing will replace all current tasks and settings with the contents of this file. This cannot be undone."
				confirmButtonLabel="Import"
				isOpen={pendingImportData !== null}
				onClose={() => setPendingImportData(null)}
				onConfirm={confirmImport}
			/>
		</div>
	);
}

import { useRef, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTasksStore } from '../stores/tasksStore';
import { applyBackup, createBackup, downloadBackup, readBackupFile } from '../utils/backup';

const TIME_INPUT_CLASSES =
	'bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]';

const BUTTON_CLASSES =
	'bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-medium text-white hover:border-indigo-500 transition-colors';

export default function SettingsPage() {
	const morningTime = useSettingsStore(s => s.morningTime);
	const nightTime = useSettingsStore(s => s.nightTime);
	const bedtime = useSettingsStore(s => s.bedtime);
	const wakeTime = useSettingsStore(s => s.wakeTime);
	const setMorningTime = useSettingsStore(s => s.setMorningTime);
	const setNightTime = useSettingsStore(s => s.setNightTime);
	const setBedtime = useSettingsStore(s => s.setBedtime);
	const setWakeTime = useSettingsStore(s => s.setWakeTime);

	const tasks = useTasksStore(s => s.tasks);
	const [backupStatus, setBackupStatus] = useState<string | null>(null);
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

		const confirmed = window.confirm(
			'Importing will replace all current tasks and settings with the contents of this file. This cannot be undone. Continue?'
		);
		if (!confirmed) return;

		if (tasks.length > 0) {
			downloadBackup(createBackup(), 'flow-focus-pre-import-backup');
		}

		await applyBackup(data);
		setBackupStatus(`Imported ${data.tasks.length} task${data.tasks.length === 1 ? '' : 's'}.`);
	}

	return (
		<div className="max-w-lg mx-auto p-6 flex flex-col gap-8">
			<h1 className="text-xl font-bold text-white">Settings</h1>

			<section className="flex flex-col gap-3">
				<div>
					<h2 className="text-sm font-semibold text-gray-300">Time Shortcuts</h2>
					<p className="text-xs text-gray-500 mt-1">
						Used by the "Morning" and "Night" quick-set buttons when picking a date and time.
					</p>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs text-gray-400">Morning</label>
					<input
						type="time"
						value={morningTime}
						onChange={event => setMorningTime(event.target.value)}
						className={TIME_INPUT_CLASSES}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs text-gray-400">Night</label>
					<input
						type="time"
						value={nightTime}
						onChange={event => setNightTime(event.target.value)}
						className={TIME_INPUT_CLASSES}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<div>
					<h2 className="text-sm font-semibold text-gray-300">Sleep Schedule</h2>
					<p className="text-xs text-gray-500 mt-1">
						Time spent asleep is subtracted when calculating how much time you have left to complete a task.
					</p>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs text-gray-400">Bedtime</label>
					<input
						type="time"
						value={bedtime}
						onChange={event => setBedtime(event.target.value)}
						className={TIME_INPUT_CLASSES}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs text-gray-400">Wake-up time</label>
					<input
						type="time"
						value={wakeTime}
						onChange={event => setWakeTime(event.target.value)}
						className={TIME_INPUT_CLASSES}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<div>
					<h2 className="text-sm font-semibold text-gray-300">Backup & Restore</h2>
					<p className="text-xs text-gray-500 mt-1">
						Export all tasks and settings to a JSON file, or import a previously exported file.
						Importing replaces all current tasks and settings.
					</p>
				</div>

				<div className="flex gap-2">
					<button onClick={handleExport} className={BUTTON_CLASSES}>
						Export Backup
					</button>
					<button onClick={() => fileInputRef.current?.click()} className={BUTTON_CLASSES}>
						Import Backup
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept="application/json"
						onChange={handleImportFileChange}
						className="hidden"
					/>
				</div>

				{backupStatus && <p className="text-xs text-gray-400">{backupStatus}</p>}
			</section>
		</div>
	);
}

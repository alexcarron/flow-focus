import { useSettingsStore } from '../stores/settingsStore';

const TIME_INPUT_CLASSES =
  'bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]';

export default function SettingsPage() {
  const morningTime = useSettingsStore(s => s.morningTime);
  const nightTime = useSettingsStore(s => s.nightTime);
  const bedtime = useSettingsStore(s => s.bedtime);
  const wakeTime = useSettingsStore(s => s.wakeTime);
  const setMorningTime = useSettingsStore(s => s.setMorningTime);
  const setNightTime = useSettingsStore(s => s.setNightTime);
  const setBedtime = useSettingsStore(s => s.setBedtime);
  const setWakeTime = useSettingsStore(s => s.setWakeTime);

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
            onChange={e => setMorningTime(e.target.value)}
            className={TIME_INPUT_CLASSES}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Night</label>
          <input
            type="time"
            value={nightTime}
            onChange={e => setNightTime(e.target.value)}
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
            onChange={e => setBedtime(e.target.value)}
            className={TIME_INPUT_CLASSES}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Wake-up time</label>
          <input
            type="time"
            value={wakeTime}
            onChange={e => setWakeTime(e.target.value)}
            className={TIME_INPUT_CLASSES}
          />
        </div>
      </section>
    </div>
  );
}

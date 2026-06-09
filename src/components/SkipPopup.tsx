import { useState } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import DurationInput from './inputs/DurationInput';

interface Props {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SKIP_MS = 3_600_000; // 1 hour

export default function SkipPopup({ task, isOpen, onClose }: Props) {
  const [durationMs, setDurationMs] = useState<number | null>(DEFAULT_SKIP_MS);
  const deferTask = useTasksStore(s => s.deferTask);

  if (!isOpen) return null;

  function handleConfirm() {
    if (durationMs !== null) {
      deferTask(task, durationMs);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="relative z-10 bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 flex flex-col gap-4 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Skip task for…</h2>
        <DurationInput
          value={durationMs}
          onChange={setDurationMs}
          label="Defer by"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-sm rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

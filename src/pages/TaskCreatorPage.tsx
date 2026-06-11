import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasksStore } from '../stores/tasksStore';
import TaskTimingOptions from '../model/task/TaskTimingOptions';
import ArrayInput from '../components/inputs/ArrayInput';
import TimingOptionsInput, { DEFAULT_DURATION } from '../components/inputs/TimingOptionsInput';
import { SHORTCUTS, matchesShortcut } from '../config/shortcuts';

const DEFAULT_TIMING: TaskTimingOptions = {
  startTime: null,
  endTime: null,
  deadline: null,
  minDuration: DEFAULT_DURATION,
  maxDuration: DEFAULT_DURATION,
  repeatInterval: null,
  isMandatory: false,
};

export default function TaskCreatorPage() {
  const navigate = useNavigate();
  const addTask = useTasksStore(s => s.addTask);

  const [name, setName] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [timing, setTiming] = useState<TaskTimingOptions>(DEFAULT_TIMING);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRef = useRef(handleCreate);
  useEffect(() => { handleCreateRef.current = handleCreate; });

  useEffect(() => {
    const sc = SHORTCUTS.taskCreator;
    function onKeyDown(e: KeyboardEvent) {
      if (matchesShortcut(e, sc.submit)) {
        e.preventDefault();
        handleCreateRef.current();
      } else if (matchesShortcut(e, sc.blur)) {
        (document.activeElement as HTMLElement)?.blur();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Task name is required');
      return;
    }
    const invalidSteps = steps.filter(s => s.trim() === '');
    if (invalidSteps.length > 0) {
      setError('All steps must have text');
      return;
    }

    const task = await addTask(name.trim(), timing);
    task.editSteps(steps);

    // Persist the task with steps (addTask already handles timing/recurring)
    await useTasksStore.getState().persistChangedTasks([task]);
    useTasksStore.getState().refreshTasks();

    // Stay on the page; only clear the name so timing/steps can be reused
    setName('');
    setError(null);
  }

  function handleReset() {
    setName('');
    setSteps([]);
    setTiming(DEFAULT_TIMING);
    setError(null);
  }

  return (
    <div className="max-w-lg mx-auto p-6 flex flex-col gap-5">
      <h1 className="text-xl font-bold text-white">Create Task</h1>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Task name *</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="What needs to be done?"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">Steps</label>
        <ArrayInput
          value={steps}
          onChange={setSteps}
          placeholder="Add a step…"
        />
      </div>

      {/* Timing */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 mb-1">Timing</label>
        <TimingOptionsInput value={timing} onChange={setTiming} />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          title="Create Task (Ctrl+Enter)"
          className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
        >
          Create Task
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

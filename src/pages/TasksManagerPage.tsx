import { useState } from 'react';
import { useTasksStore, selectTasksInPriorityOrder } from '../stores/tasksStore';
import Task from '../model/task/Task';
import Duration from '../model/time-management/Duration';
import { formatDate, formatTime } from '../utils/formatters';
import TextInput from '../components/inputs/TextInput';
import CheckboxInput from '../components/inputs/CheckboxInput';
import TimingOptionsPopup from '../components/TimingOptionsPopup';

enum Filter { None, Active, MustStartToday }
enum SortBy { Priority, Name, Steps, TimeAvailable, Duration, RepeatInterval }
enum SortDir { Asc, Desc }

const FILTER_LABELS: Record<Filter, string> = {
  [Filter.None]: 'All',
  [Filter.Active]: 'Active',
  [Filter.MustStartToday]: 'Must Start Today',
};

const SORT_LABELS: Record<SortBy, string> = {
  [SortBy.Priority]: 'Priority',
  [SortBy.Name]: 'Name',
  [SortBy.Steps]: 'Steps',
  [SortBy.TimeAvailable]: 'Time Available',
  [SortBy.Duration]: 'Duration',
  [SortBy.RepeatInterval]: 'Repeat',
};

function applyFilter(tasks: Task[], filter: Filter): Task[] {
  const now = new Date();
  if (filter === Filter.Active)
    return tasks.filter(t => t.isActive(now) && t.getDeadline() !== null);
  if (filter === Filter.MustStartToday)
    return tasks.filter(t => t.mustStartToday(now));
  return tasks;
}

function applySort(tasks: Task[], sortBy: SortBy, dir: SortDir): Task[] {
  const now = new Date();
  let sorted = [...tasks];

  if (sortBy === SortBy.Name)
    sorted.sort((a, b) => a.getDescription().localeCompare(b.getDescription()));
  else if (sortBy === SortBy.Steps)
    sorted.sort((a, b) => a.getSteps().length - b.getSteps().length);
  else if (sortBy === SortBy.TimeAvailable)
    sorted.sort((a, b) => a.getTimeToComplete(now) - b.getTimeToComplete(now));
  else if (sortBy === SortBy.Duration)
    sorted.sort((a, b) => a.getMaxRequiredTime(now) - b.getMaxRequiredTime(now));
  else if (sortBy === SortBy.RepeatInterval)
    sorted.sort((a, b) => {
      if (a.getRepeatInterval() === null) return -1;
      if (b.getRepeatInterval() === null) return 1;
      return a.getRepeatInterval()! - b.getRepeatInterval()!;
    });

  if (dir === SortDir.Desc) sorted.reverse();
  return sorted;
}

function toDurationString(ms: number): string {
  const d = Duration.fromMilliseconds(ms);
  const amount = d.getAmountOfUnits();
  const unit = d.getTimeUnit().name;
  return amount === 1 ? unit.slice(0, -1) : `${amount} ${unit}`;
}

function getDurationRange(minMs: number | null, maxMs: number | null, now: Date): string {
  if (minMs === null && maxMs === null) return '—';
  const start = Duration.fromMilliseconds(minMs ?? 0);
  const end = Duration.fromMilliseconds(maxMs ?? 0);
  const [s, e] = Duration.getDurationRangeStrings(start, end);
  return e ? `${s}–${e}` : s;
}

export default function TasksManagerPage() {
  const tasks = useTasksStore(selectTasksInPriorityOrder);
  const setStep = useTasksStore(s => s.setStep);
  const setDescription = useTasksStore(s => s.setDescription);
  const setStepComplete = useTasksStore(s => s.setStepComplete);
  const setComplete = useTasksStore(s => s.setComplete);
  const setMandatory = useTasksStore(s => s.setMandatory);
  const deleteTask = useTasksStore(s => s.deleteTask);
  const refreshTasks = useTasksStore(s => s.refreshTasks);
  const persistChangedTasks = useTasksStore(s => s.persistChangedTasks);
  const store: RowActions = { setStep, setDescription, setStepComplete, setComplete, setMandatory, deleteTask, refreshTasks, persistChangedTasks };
  const [filter, setFilter] = useState<Filter>(Filter.None);
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.Priority);
  const [sortDir, setSortDir] = useState<SortDir>(SortDir.Asc);
  const [timingTask, setTimingTask] = useState<Task | null>(null);

  const now = new Date();
  const displayed = applyFilter(applySort(tasks, sortBy, sortDir), filter);

  function toggleFilter() {
    setFilter(f => ((f + 1) % 3) as Filter);
  }

  function toggleSort(col: SortBy) {
    if (sortBy === col) {
      setSortDir(d => d === SortDir.Asc ? SortDir.Desc : SortDir.Asc);
    } else {
      setSortBy(col);
      setSortDir(SortDir.Asc);
    }
  }

  function sortIcon(col: SortBy): string {
    if (sortBy !== col) return '↕';
    return sortDir === SortDir.Asc ? '↑' : '↓';
  }

  return (
    <div className="p-4 overflow-x-auto">
      {/* Controls */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={toggleFilter}
          className="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
        >
          Filter: {FILTER_LABELS[filter]}
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            {(Object.entries(SORT_LABELS) as [string, string][]).map(([key, label]) => (
              <th
                key={key}
                className="pb-2 pr-3 font-medium cursor-pointer hover:text-white select-none whitespace-nowrap"
                onClick={() => toggleSort(parseInt(key) as SortBy)}
              >
                {label} <span className="text-xs">{sortIcon(parseInt(key) as SortBy)}</span>
              </th>
            ))}
            <th className="pb-2 font-medium text-gray-400">Done</th>
            <th className="pb-2 font-medium text-gray-400">Mandatory</th>
            <th className="pb-2 font-medium text-gray-400">Deadline</th>
            <th className="pb-2 font-medium text-gray-400">Start</th>
            <th className="pb-2 font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((task, idx) => (
            <TaskRow
              key={task.dbId ?? idx}
              task={task}
              now={now}
              store={store}
              onOpenTiming={() => setTimingTask(task)}
            />
          ))}
        </tbody>
      </table>

      {displayed.length === 0 && (
        <p className="text-gray-500 text-center py-8">No tasks match the current filter</p>
      )}

      <TimingOptionsPopup
        task={timingTask}
        isOpen={timingTask !== null}
        onClose={() => setTimingTask(null)}
      />
    </div>
  );
}

interface RowActions {
  setStep: (task: Task, old: string, n: string) => void;
  setDescription: (task: Task, v: string) => void;
  setStepComplete: (task: Task, step: string, v: boolean) => void;
  setComplete: (task: Task, v: boolean) => void;
  setMandatory: (task: Task, v: boolean) => void;
  deleteTask: (task: Task) => Promise<void>;
  refreshTasks: () => void;
  persistChangedTasks: (tasks: Task[]) => Promise<void>;
}

interface RowProps {
  task: Task;
  now: Date;
  store: RowActions;
  onOpenTiming: () => void;
}

function TaskRow({ task, now, store, onOpenTiming }: RowProps) {
  const steps = task.getSteps();
  const minMs = task.getMinRequiredTime() ?? null;
  const maxMs = task.hasMaxRequiredTime() ? task.getMaxRequiredTime(now) : null;
  const startTime = task.getStartTime();
  const displayStartTime = startTime && startTime > now ? startTime : null;

  function onStepChange(oldStep: string, newStep: string) {
    if (newStep !== oldStep) store.setStep(task, oldStep, newStep);
  }

  function onStepKeyDown(step: string, e: React.KeyboardEvent) {
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      task.createStepLeftOfStep(step);
      store.refreshTasks();
      store.persistChangedTasks([task]);
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      task.createStepRightOfStep(step);
      store.refreshTasks();
      store.persistChangedTasks([task]);
    }
  }

  return (
    <tr className="border-b border-gray-800 align-top hover:bg-gray-900/50">
      {/* Priority (implicit – no content, just ordering) */}
      <td className="py-2 pr-3 text-gray-500 text-xs">
        —
      </td>

      {/* Name */}
      <td className="py-2 pr-3 min-w-[10rem] max-w-xs">
        <TextInput
          value={task.getDescription()}
          onChange={v => store.setDescription(task, v)}
          className="text-white"
        />
      </td>

      {/* Steps */}
      <td className="py-2 pr-3 min-w-[8rem]">
        <div className="flex flex-col gap-0.5">
          {steps.map(step => (
            <div key={step} className="flex items-center gap-1">
              <CheckboxInput
                value={task.isStepComplete(step)}
                onChange={v => store.setStepComplete(task, step, v)}
              />
              <TextInput
                value={step}
                onChange={newVal => onStepChange(step, newVal)}
                onKeyDown={e => onStepKeyDown(step, e)}
                className="text-gray-300 text-xs"
              />
            </div>
          ))}
        </div>
      </td>

      {/* Time Available */}
      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">
        {task.getDeadline()
          ? formatTime(task.getTimeToComplete(now))
          : '∞'}
      </td>

      {/* Duration */}
      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">
        {minMs !== null || maxMs !== null
          ? getDurationRange(minMs, maxMs, now)
          : '—'}
      </td>

      {/* Repeat */}
      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">
        {task.getRepeatInterval() !== null
          ? toDurationString(task.getRepeatInterval()!)
          : '—'}
      </td>

      {/* Done */}
      <td className="py-2 pr-3">
        <CheckboxInput
          value={task.getIsComplete()}
          onChange={v => store.setComplete(task, v)}
        />
      </td>

      {/* Mandatory */}
      <td className="py-2 pr-3">
        <CheckboxInput
          value={task.getIsMandatory()}
          onChange={v => store.setMandatory(task, v)}
        />
      </td>

      {/* Deadline */}
      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">
        {formatDate(task.getDeadline(), '—')}
      </td>

      {/* Start */}
      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">
        {displayStartTime ? formatDate(displayStartTime) : '—'}
      </td>

      {/* Actions */}
      <td className="py-2">
        <div className="flex gap-1">
          <button
            onClick={onOpenTiming}
            className="px-2 py-0.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
            title="Edit timing"
          >
            ⏱
          </button>
          <button
            onClick={() => store.deleteTask(task)}
            className="px-2 py-0.5 text-xs rounded bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

import { useState, useEffect } from 'react';
import { formatTime } from '../../utils/formatters';
import { SHORTCUTS, matchesShortcut, formatShortcut } from '../../config/shortcuts';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  className?: string;
}

const UNIT_OPTIONS = [
  { label: 'milliseconds', ms: 1 },
  { label: 'seconds',      ms: 1000 },
  { label: 'minutes',      ms: 60_000 },
  { label: 'hours',        ms: 3_600_000 },
  { label: 'days',         ms: 86_400_000 },
  { label: 'weeks',        ms: 604_800_000 },
];

const UNIT_SHORTCUT_MAP: Array<{ ms: number; shortcut: typeof SHORTCUTS.duration[keyof typeof SHORTCUTS.duration] }> = [
  { ms: 1000,        shortcut: SHORTCUTS.duration.unitSeconds },
  { ms: 60_000,      shortcut: SHORTCUTS.duration.unitMinutes },
  { ms: 3_600_000,   shortcut: SHORTCUTS.duration.unitHours },
  { ms: 86_400_000,  shortcut: SHORTCUTS.duration.unitDays },
  { ms: 604_800_000, shortcut: SHORTCUTS.duration.unitWeeks },
];

function detectUnit(ms: number | null): number {
  if (ms === null || ms === 0) return 60_000;
  for (let i = UNIT_OPTIONS.length - 1; i >= 0; i--) {
    if (ms % UNIT_OPTIONS[i].ms === 0) return UNIT_OPTIONS[i].ms;
  }
  return 1;
}

const sc = SHORTCUTS.duration;

export default function DurationInput({ value, onChange, label, className = '' }: Props) {
  const [unitMs, setUnitMs] = useState<number>(() => detectUnit(value));

  useEffect(() => {
    if (value !== null && value !== 0 && value % unitMs !== 0) {
      setUnitMs(detectUnit(value));
    }
  }, [value]);

  const amount = value !== null ? value / unitMs : 0;

  function adjust(delta: number) {
    const current = value ?? 0;
    const newVal = Math.max(0, current + delta * unitMs);
    onChange(newVal);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    for (const { ms, shortcut } of UNIT_SHORTCUT_MAP) {
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault();
        setUnitMs(ms);
        return;
      }
    }
    if (matchesShortcut(e, sc.clear)) {
      e.preventDefault();
      onChange(null);
    } else if (matchesShortcut(e, sc.increment10)) {
      e.preventDefault();
      adjust(10);
    } else if (matchesShortcut(e, sc.decrement10)) {
      e.preventDefault();
      adjust(-10);
    } else if (matchesShortcut(e, sc.increment1)) {
      e.preventDefault();
      adjust(1);
    } else if (matchesShortcut(e, sc.decrement1)) {
      e.preventDefault();
      adjust(-1);
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          tabIndex={-1}
          title={`-10 units (${formatShortcut(sc.decrement10)})`}
          onClick={() => adjust(-10)}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          -10
        </button>
        <button
          type="button"
          tabIndex={-1}
          title={`-1 unit (${formatShortcut(sc.decrement1)})`}
          onClick={() => adjust(-1)}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          -1
        </button>
        <input
          type="number"
          min={0}
          value={amount}
          className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500 text-center"
          onChange={e => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) ? null : Math.round(v * unitMs));
          }}
          onKeyDown={handleKeyDown}
        />
        <select
          value={unitMs}
          tabIndex={-1}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500"
          onChange={e => {
            const newUnitMs = parseInt(e.target.value);
            setUnitMs(newUnitMs);
            onChange(Math.round(amount) * newUnitMs);
          }}
        >
          {UNIT_OPTIONS.map(opt => (
            <option key={opt.ms} value={opt.ms}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          tabIndex={-1}
          title={`+1 unit (${formatShortcut(sc.increment1)})`}
          onClick={() => adjust(1)}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          +1
        </button>
        <button
          type="button"
          tabIndex={-1}
          title={`+10 units (${formatShortcut(sc.increment10)})`}
          onClick={() => adjust(10)}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          +10
        </button>
      </div>
      {value !== null && (
        <span className="text-xs text-gray-500">
          {formatTime(value)}
        </span>
      )}
    </div>
  );
}

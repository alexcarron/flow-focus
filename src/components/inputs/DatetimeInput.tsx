import { SHORTCUTS, matchesShortcut, formatShortcut } from '../../config/shortcuts';

interface Props {
  value: Date | null;
  onChange: (value: Date | null) => void;
  label?: string;
  className?: string;
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

const sc = SHORTCUTS.datetime;

export default function DatetimeInput({ value, onChange, label, className = '' }: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const tabbable = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([tabindex="-1"]), select:not([tabindex="-1"]), [tabindex="0"]'
        )
      );
      const idx = tabbable.indexOf(e.currentTarget);
      if (idx !== -1) {
        const target = e.shiftKey ? tabbable[idx - 1] : tabbable[idx + 1];
        target?.focus();
      }
      return;
    }
    if (matchesShortcut(e, sc.today)) {
      e.preventDefault();
      onChange(toToday(value));
    } else if (matchesShortcut(e, sc.morning)) {
      e.preventDefault();
      onChange(setTimeOfDay(value, 7, 0));
    } else if (matchesShortcut(e, sc.night)) {
      e.preventDefault();
      onChange(setTimeOfDay(value, 23, 0));
    } else if (matchesShortcut(e, sc.nextDay)) {
      e.preventDefault();
      onChange(adjustDate(value, 1));
    } else if (matchesShortcut(e, sc.prevDay)) {
      e.preventDefault();
      onChange(adjustDate(value, -1));
    } else if (matchesShortcut(e, sc.clear)) {
      e.preventDefault();
      onChange(null);
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <input
        type="datetime-local"
        value={value ? toLocalDatetimeString(value) : ''}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
        onChange={e => {
          onChange(e.target.value ? new Date(e.target.value) : null);
        }}
        onKeyDown={handleKeyDown}
      />
      <div className="flex gap-1 flex-wrap">
        <button
          type="button"
          tabIndex={-1}
          title={`Today (${formatShortcut(sc.today)})`}
          onClick={() => onChange(toToday(value))}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          Today
        </button>
        <button
          type="button"
          tabIndex={-1}
          title={`−1 day (${formatShortcut(sc.prevDay)})`}
          onClick={() => onChange(adjustDate(value, -1))}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          −1d
        </button>
        <button
          type="button"
          tabIndex={-1}
          title={`+1 day (${formatShortcut(sc.nextDay)})`}
          onClick={() => onChange(adjustDate(value, 1))}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          +1d
        </button>
        <button
          type="button"
          tabIndex={-1}
          title={`Morning 07:00 (${formatShortcut(sc.morning)})`}
          onClick={() => onChange(setTimeOfDay(value, 7, 0))}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          Morning
        </button>
        <button
          type="button"
          tabIndex={-1}
          title={`Night 23:00 (${formatShortcut(sc.night)})`}
          onClick={() => onChange(setTimeOfDay(value, 23, 0))}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          Night
        </button>
        {value && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange(null)}
            className="px-2 py-0.5 text-xs text-gray-500 hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

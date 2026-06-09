import { formatTime } from '../../utils/formatters';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  className?: string;
}

const UNIT_OPTIONS = [
  { label: 'milliseconds', ms: 1 },
  { label: 'seconds', ms: 1000 },
  { label: 'minutes', ms: 60_000 },
  { label: 'hours', ms: 3_600_000 },
  { label: 'days', ms: 86_400_000 },
  { label: 'weeks', ms: 604_800_000 },
];

function detectUnit(ms: number | null): number {
  if (ms === null || ms === 0) return 60_000;
  for (let i = UNIT_OPTIONS.length - 1; i >= 0; i--) {
    if (ms % UNIT_OPTIONS[i].ms === 0) return UNIT_OPTIONS[i].ms;
  }
  return 1;
}

export default function DurationInput({ value, onChange, label, className = '' }: Props) {
  const unitMs = detectUnit(value);
  const amount = value !== null ? value / unitMs : 0;

  function adjust(delta: number) {
    const current = value ?? 0;
    const newVal = Math.max(0, current + delta * unitMs);
    onChange(newVal);
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-10)}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          -10
        </button>
        <button
          type="button"
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
        />
        <select
          value={unitMs}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500"
          onChange={e => {
            const newUnitMs = parseInt(e.target.value);
            onChange(Math.round(amount) * newUnitMs);
          }}
        >
          {UNIT_OPTIONS.map(opt => (
            <option key={opt.ms} value={opt.ms}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => adjust(1)}
          className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        >
          +1
        </button>
        <button
          type="button"
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

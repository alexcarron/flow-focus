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

export default function DatetimeInput({ value, onChange, label, className = '' }: Props) {
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
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-gray-500 hover:text-red-400 self-start"
        >
          Clear
        </button>
      )}
    </div>
  );
}

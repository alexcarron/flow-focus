interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export default function CheckboxInput({ value, onChange, label, className = '' }: Props) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <div
        role="checkbox"
        aria-checked={value}
        tabIndex={0}
        onClick={() => onChange(!value)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange(!value); }}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          value ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-gray-500'
        }`}
      >
        {value && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  );
}

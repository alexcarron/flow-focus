import { useRef, useEffect } from 'react';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  onItemKeyDown?: (index: number, step: string, e: React.KeyboardEvent) => void;
}

export default function ArrayInput({ value, onChange, placeholder, className = '', onItemKeyDown }: Props) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  function update(index: number, newVal: string) {
    const next = [...value];
    next[index] = newVal;
    onChange(next);
  }

  function add() {
    onChange([...value, '']);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  useEffect(() => {
    refs.current = refs.current.slice(0, value.length);
  }, [value.length]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <span
            ref={el => { refs.current[i] = el; }}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder ?? 'Step...'}
            className="flex-1 outline-none bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm min-w-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
            onBlur={e => update(i, (e.target as HTMLSpanElement).textContent ?? '')}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange([...value.slice(0, i + 1), '', ...value.slice(i + 1)]);
                setTimeout(() => refs.current[i + 1]?.focus(), 0);
              }
              onItemKeyDown?.(i, item, e);
            }}
          >
            {item}
          </span>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-600 hover:text-red-400 text-xs px-1"
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-indigo-400 hover:text-indigo-300 self-start"
      >
        + Add step
      </button>
    </div>
  );
}

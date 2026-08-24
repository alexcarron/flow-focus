import { useRef, useEffect } from 'react';

interface Props {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	onKeyDown?: (event: React.KeyboardEvent) => void;
}

export default function TextInput({ value, onChange, placeholder, className = '', onKeyDown }: Props) {
	const ref = useRef<HTMLSpanElement>(null);
	const isComposing = useRef(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (el.textContent !== value) {
			el.textContent = value;
		}
	}, [value]);

	return (
		<span
			ref={ref}
			contentEditable
			suppressContentEditableWarning
			data-placeholder={placeholder}
			className={`editable-text ${className}`}
			onCompositionStart={() => { isComposing.current = true; }}
			onCompositionEnd={() => { isComposing.current = false; }}
			onInput={event => {
				if (!isComposing.current) {
					onChange((event.target as HTMLSpanElement).textContent ?? '');
				}
			}}
			onKeyDown={onKeyDown}
		/>
	);
}

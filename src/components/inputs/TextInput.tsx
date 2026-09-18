import { useRef, useEffect } from 'react';
import { useCommitOnEnter } from '../../hooks/useCommitOnEnter';
import { mergeRefs } from '../../utilities/mergeRefs';

interface Props {
	value: string;
	onChange?: (value: string) => void;
	onCommit?: (value: string) => void;
	placeholder?: string;
	className?: string;
	onKeyDown?: (event: React.KeyboardEvent) => void;
}

export default function TextInput({ value, onChange, onCommit, placeholder, className = '', onKeyDown }: Props) {
	const ref = useRef<HTMLSpanElement>(null);
	const isComposing = useRef(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (el.textContent !== value) {
			el.textContent = value;
		}
	}, [value]);

	const commitOnEnterRef = useCommitOnEnter<HTMLSpanElement>();

	function readText(element: HTMLSpanElement): string {
		return element.textContent ?? '';
	}

	return (
		<span
			ref={mergeRefs(ref, commitOnEnterRef)}
			contentEditable
			suppressContentEditableWarning
			spellCheck={false}
			data-placeholder={placeholder}
			className={`editable-text ${className}`}
			onCompositionStart={() => { isComposing.current = true; }}
			onCompositionEnd={event => {
				isComposing.current = false;
				onChange?.(readText(event.currentTarget));
			}}
			onInput={event => {
				if (!isComposing.current) {
					onChange?.(readText(event.currentTarget));
				}
			}}
			onBlur={event => {
				const text = readText(event.currentTarget);
				if (text !== value) onCommit?.(text);
			}}
			onKeyDown={onKeyDown}
		/>
	);
}

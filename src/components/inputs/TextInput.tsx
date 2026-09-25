import { useRef, useLayoutEffect } from 'react';
import { useCommitOnEnter } from '../../hooks/useCommitOnEnter';
import { usePlainTextContentEditable } from '../../hooks/usePlainTextContentEditable';
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
	const spanElementRef = useRef<HTMLSpanElement>(null);
	const isComposing = useRef(false);

	useLayoutEffect(() => {
		const spanElement = spanElementRef.current;
		if (!spanElement) return;
		if (spanElement.textContent !== value) {
			spanElement.textContent = value;
		}
	}, [value]);

	const commitOnEnterRef = useCommitOnEnter<HTMLSpanElement>();
	const { onKeyDown: onPlainTextKeyDown, onPaste } = usePlainTextContentEditable();

	function readText(element: HTMLSpanElement): string {
		return element.textContent ?? '';
	}

	return (
		<span
			ref={mergeRefs(spanElementRef, commitOnEnterRef)}
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
			onPaste={onPaste}
			onKeyDown={event => {
				onPlainTextKeyDown(event);
				onKeyDown?.(event);
			}}
		/>
	);
}

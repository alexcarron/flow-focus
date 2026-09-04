import { forwardRef, useImperativeHandle, useRef } from 'react';
import parsePastedTextIntoListItems from '../../utilities/parsePastedTextIntoListItems';
import DeleteIcon from '../svg-icons/DeleteIcon';
import styles from './ArrayInput.module.css';

interface Props {
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	className?: string;
	onItemKeyDown?: (index: number, step: string, e: React.KeyboardEvent) => void;
	renderRowPrefix?: (index: number, item: string) => React.ReactNode;
	getRowProps?: (index: number, item: string) => { 'data-step-row'?: string; className?: string; style?: React.CSSProperties; ref?: (element: HTMLDivElement | null) => void; onMouseDown?: (event: React.MouseEvent) => void };
	onRowContextMenu?: (index: number, item: string, event: React.MouseEvent) => void;
}

export interface ArrayInputHandle {
	focusRow: (index: number) => void;
	focusRowAtPosition: (index: number, cursorPosition?: number) => void;
}

export default forwardRef<ArrayInputHandle, Props>(function ArrayInput({ value, onChange, placeholder, className = '', onItemKeyDown, renderRowPrefix, getRowProps, onRowContextMenu }: Props, ref) {
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const displayedRows = [...value, ''];
	const trailingRowIndex = value.length;

	function commitWithoutTrailingEmpties(nextValue: string[]) {
		const trimmed = [...nextValue];
		while (trimmed.length > 0 && trimmed[trimmed.length - 1].trim() === '') {
			trimmed.pop();
		}
		onChange(trimmed);
	}

	function focusRowSoon(index: number) {
		setTimeout(() => inputRefs.current[index]?.focus(), 0);
	}

	function focusRowAtPositionSoon(index: number, cursorPosition?: number) {
		setTimeout(() => {
			const inputElement = inputRefs.current[index];
			if (!inputElement) return;
			inputElement.focus();
			const position = cursorPosition ?? inputElement.value.length;
			inputElement.setSelectionRange(position, position);
		}, 0);
	}

	useImperativeHandle(ref, () => ({ focusRow: focusRowSoon, focusRowAtPosition: focusRowAtPositionSoon }));

	function changeRow(index: number, text: string) {
		const next = [...value];
		if (index < value.length) {
			next[index] = text;
		} else {
			next.push(text);
		}
		commitWithoutTrailingEmpties(next);
	}

	function removeRow(index: number) {
		commitWithoutTrailingEmpties(value.filter((_, i) => i !== index));
		focusRowSoon(Math.max(0, index - 1));
	}

	function insertEmptyRowAfter(index: number) {
		const next = [...value];
		const insertAt = index + 1;
		next.splice(insertAt, 0, '');
		onChange(next);
		focusRowSoon(insertAt);
	}

	function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
		const pastedText = e.clipboardData.getData('text');
		if (!pastedText.includes('\n')) {
			return;
		}

		const pastedSteps = parsePastedTextIntoListItems(pastedText);
		if (pastedSteps.length === 0) {
			return;
		}

		e.preventDefault();

		const next = [...value];
		if (index >= value.length) {
			next.push(...pastedSteps);
		} else if (next[index].trim() === '') {
			next.splice(index, 1, ...pastedSteps);
		} else {
			next.splice(index + 1, 0, ...pastedSteps);
		}

		commitWithoutTrailingEmpties(next);
		focusRowSoon(next.length);
	}

	function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
		const isTrailingRow = index === trailingRowIndex;

		if (e.key === 'Enter' && !e.ctrlKey) {
			e.preventDefault();
			if (isTrailingRow) {
				// The trailing row is already the place to start the next step
			} else if (index === value.length - 1) {
				focusRowSoon(trailingRowIndex);
			} else {
				insertEmptyRowAfter(index);
			}
		} else if (e.key === 'Tab' && !e.shiftKey && !isTrailingRow) {
			e.preventDefault();
			focusRowSoon(index + 1);
		} else if (e.key === 'ArrowUp' && !e.altKey && !e.ctrlKey && !e.shiftKey && !isTrailingRow) {
			if (index > 0) {
				e.preventDefault();
				focusRowAtPositionSoon(index - 1);
			}
		} else if (e.key === 'ArrowDown' && !e.altKey && !e.ctrlKey && !e.shiftKey && !isTrailingRow) {
			if (index < value.length - 1) {
				e.preventDefault();
				focusRowAtPositionSoon(index + 1);
			}
		} else if (
			e.key === 'Backspace' &&
			e.currentTarget.value === '' &&
			!isTrailingRow &&
			value.length > 0
		) {
			e.preventDefault();
			removeRow(index);
		}

		onItemKeyDown?.(index, displayedRows[index], e);
	}

	return (
		<div className={`${styles.list} ${className}`}>
			{displayedRows.map((item, i) => {
				const isTrailingRow = i === trailingRowIndex;
				const { className: rowPropsClassName, ...rowProps } = (!isTrailingRow ? getRowProps?.(i, item) : undefined) ?? {};
				return (
					<div
						key={i}
						className={rowPropsClassName ? `${styles.row} ${rowPropsClassName}` : styles.row}
						onContextMenu={event => {
							if (!isTrailingRow) onRowContextMenu?.(i, item, event);
						}}
						{...rowProps}
					>
						{renderRowPrefix && (isTrailingRow
							? (value.length > 0 && <div className={styles.rowPrefixSpacer} />)
							: renderRowPrefix(i, item))}
						<input
							ref={el => { inputRefs.current[i] = el; }}
							type="text"
							value={item}
							placeholder={isTrailingRow ? (placeholder ?? 'Add a step, or paste a list…') : 'Step…'}
							className={`field ${styles.input}`}
							onChange={e => changeRow(i, e.target.value)}
							onPaste={e => handlePaste(i, e)}
							onKeyDown={e => handleKeyDown(i, e)}
						/>
						{!isTrailingRow && (
							<button
								type="button"
								onClick={() => removeRow(i)}
								className={`button icon danger ${styles.removeButton}`}
								aria-label="Remove step"
							>
								<DeleteIcon className={styles.removeIcon} />
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
});

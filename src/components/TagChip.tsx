import { useEffect, useRef, useState } from 'react';
import { DuplicateTagNameError, EmptyTagNameError } from '../persistence/TagRepository';
import TextInput from './inputs/TextInput';
import CloseIcon from './svg-icons/CloseIcon';
import ErrorPopover from './errors/ErrorPopover';
import styles from './TagChip.module.css';

interface Props {
	name: string;
	onRename: (newName: string) => Promise<void>;
	onRemove: () => void;
}

export default function TagChip({ name, onRename, onRemove }: Props) {
	const [isEditing, setIsEditing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const containerRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!isEditing) return;
		const editableElement = containerRef.current?.querySelector<HTMLElement>('[contenteditable]');
		editableElement?.focus();
		const selectionRange = document.createRange();
		if (editableElement) selectionRange.selectNodeContents(editableElement);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(selectionRange);
	}, [isEditing]);

	async function commitRename(newName: string) {
		try {
			await onRename(newName);
			setIsEditing(false);
			setErrorMessage(null);
		} catch (error) {
			if (error instanceof DuplicateTagNameError || error instanceof EmptyTagNameError) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage('Failed to rename tag.');
			}
		}
	}

	return (
		<span ref={containerRef} className={styles.chip}>
			{isEditing ? (
				<TextInput
					value={name}
					onChange={() => setErrorMessage(null)}
					onCommit={commitRename}
					className={styles.nameInput}
					onKeyDown={event => {
						if (event.key === 'Escape') {
							setIsEditing(false);
							setErrorMessage(null);
						}
					}}
				/>
			) : (
				<button type="button" className={styles.nameButton} onClick={() => setIsEditing(true)} title="Click to rename">
					{name}
				</button>
			)}
			<button type="button" onClick={onRemove} className={`${styles.removeButton} touch-hit-area`} aria-label={`Remove tag ${name}`} title={`Remove tag ${name}`}>
				<CloseIcon className={styles.removeIcon} />
			</button>
			<ErrorPopover message={errorMessage} />
		</span>
	);
}

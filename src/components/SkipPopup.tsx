import { useEffect, useRef, useState } from 'react';
import Task from '../model/task/Task';
import { SkipUntilDateInPastError } from '../model/task/TaskTimingError';
import { useTasksStore } from '../stores/tasksStore';
import DatetimeInput from './inputs/DatetimeInput';
import ErrorMessage from './errors/ErrorMessage';

interface Props {
	task: Task;
	isOpen: boolean;
	onClose: () => void;
}

export default function SkipPopup({ task, isOpen, onClose }: Props) {
	const [skipUntilDate, setSkipUntilDate] = useState<Date | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const skipTaskUntil = useTasksStore(s => s.skipTaskUntil);
	const skipCurrentOccurrence = useTasksStore(s => s.skipCurrentOccurrence);
	const datetimeInputContainerRef = useRef<HTMLDivElement>(null);
	const canSkipCurrentOccurrence = task.isRecurring() && task.getShouldNotSkipMissedOccurrences();

	function handleSkipCurrentOccurrence() {
		skipCurrentOccurrence(task);
		onClose();
	}

	function handleConfirm(overrideDate: Date | null = skipUntilDate) {
		if (overrideDate !== null) {
			try {
				skipTaskUntil(task, overrideDate);
			} catch (skipError) {
				if (skipError instanceof SkipUntilDateInPastError) {
					setErrorMessage('Choose a date and time in the future to skip until.');
				} else {
					setErrorMessage('Failed to skip task.');
				}
				return;
			}
		}
		onClose();
	}

	useEffect(() => {
		if (isOpen) setErrorMessage(null);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Enter') return;
			if (datetimeInputContainerRef.current?.contains(document.activeElement)) return;
			if (skipUntilDate === null) return;
			event.preventDefault();
			handleConfirm();
		}

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});

	if (!isOpen) return null;

	return (
		<div
			className="modal-overlay"
			onClick={e => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="modal-backdrop" />
			<div className="modal">
				<h2 className="modal-title">Skip task until…</h2>
				<div ref={datetimeInputContainerRef}>
					<DatetimeInput
						value={skipUntilDate}
						onChange={setSkipUntilDate}
						onSubmit={handleConfirm}
						label="Skip Until"
						defaultTimeOfDay="morning"
					/>
				</div>
				<ErrorMessage message={errorMessage} />
				<div className="modal-actions">
					{canSkipCurrentOccurrence && (
						<button onClick={handleSkipCurrentOccurrence} className="button">
							Skip this occurrence
						</button>
					)}
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={() => handleConfirm()} className="button primary" disabled={skipUntilDate === null}>
						Skip
					</button>
				</div>
			</div>
		</div>
	);
}

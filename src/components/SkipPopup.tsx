import { useEffect, useRef, useState } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import DatetimeInput from './inputs/DatetimeInput';

interface Props {
	task: Task;
	isOpen: boolean;
	onClose: () => void;
}

export default function SkipPopup({ task, isOpen, onClose }: Props) {
	const [deferUntilDate, setDeferUntilDate] = useState<Date | null>(null);
	const deferTaskUntil = useTasksStore(s => s.deferTaskUntil);
	const datetimeInputContainerRef = useRef<HTMLDivElement>(null);

	function handleConfirm(overrideDate: Date | null = deferUntilDate) {
		if (overrideDate !== null) {
			deferTaskUntil(task, overrideDate);
		}
		onClose();
	}

	useEffect(() => {
		if (!isOpen) return;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Enter') return;
			if (datetimeInputContainerRef.current?.contains(document.activeElement)) return;
			if (deferUntilDate === null) return;
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
						value={deferUntilDate}
						onChange={setDeferUntilDate}
						onSubmit={handleConfirm}
						label="New Start Date"
						defaultTimeOfDay="morning"
					/>
				</div>
				<div className="modal-actions">
					<button onClick={onClose} className="button">
						Cancel
					</button>
					<button onClick={() => handleConfirm()} className="button primary" disabled={deferUntilDate === null}>
						Skip
					</button>
				</div>
			</div>
		</div>
	);
}

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Task from '../model/task/Task';
import { useIsNarrowViewport } from '../hooks/useIsNarrowViewport';
import { useOutsideClickAndEscape } from '../hooks/useOutsideClickAndEscape';
import PrerequisiteTaskPicker from './PrerequisiteTaskPicker';
import styles from './PrerequisiteTaskPickerPopup.module.css';

const MODAL_BOTTOM_SHEET_MAX_WIDTH_PX = 599;
const VIEWPORT_EDGE_MARGIN_PX = 8;

interface Props {
	anchorPosition: { x: number; y: number } | null;
	candidateTasksInPriorityOrder: Task[];
	onPick: (task: Task) => void;
	onClose: () => void;
}

export default function PrerequisiteTaskPickerPopup({ anchorPosition, candidateTasksInPriorityOrder, onPick, onClose }: Props) {
	const isNarrowViewport = useIsNarrowViewport(MODAL_BOTTOM_SHEET_MAX_WIDTH_PX);
	const popoverRef = useRef<HTMLDivElement>(null);
	const [clampedPosition, setClampedPosition] = useState<{ x: number; y: number } | null>(null);
	const isPopoverOpen = anchorPosition !== null && !isNarrowViewport;

	useOutsideClickAndEscape(popoverRef, isPopoverOpen, onClose);

	useLayoutEffect(() => {
		const popover = popoverRef.current;
		if (anchorPosition === null || popover === null) {
			setClampedPosition(null);
			return;
		}
		const maximumX = window.innerWidth - popover.offsetWidth - VIEWPORT_EDGE_MARGIN_PX;
		const maximumY = window.innerHeight - popover.offsetHeight - VIEWPORT_EDGE_MARGIN_PX;
		setClampedPosition({
			x: Math.max(VIEWPORT_EDGE_MARGIN_PX, Math.min(anchorPosition.x, maximumX)),
			y: Math.max(VIEWPORT_EDGE_MARGIN_PX, Math.min(anchorPosition.y, maximumY)),
		});
	}, [anchorPosition, isNarrowViewport]);

	if (anchorPosition === null) return null;

	function pickAndClose(task: Task) {
		onPick(task);
		onClose();
	}

	const picker = (
		<PrerequisiteTaskPicker
			candidateTasksInPriorityOrder={candidateTasksInPriorityOrder}
			onPick={pickAndClose}
			onCancel={onClose}
		/>
	);

	if (isNarrowViewport) {
		return createPortal(
			<div
				className="modal-overlay"
				onClick={event => { if (event.target === event.currentTarget) onClose(); }}
			>
				<div className="modal-backdrop" />
				<div className="modal">
					<h2 className="modal-title">Do after…</h2>
					{picker}
					<div className="modal-actions">
						<button type="button" onClick={onClose} className="button">
							Cancel
						</button>
					</div>
				</div>
			</div>,
			document.body
		);
	}

	const displayedPosition = clampedPosition ?? anchorPosition;
	return createPortal(
		<div
			ref={popoverRef}
			className={styles.popover}
			style={{ left: displayedPosition.x, top: displayedPosition.y }}
		>
			{picker}
		</div>,
		document.body
	);
}

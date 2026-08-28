import { useState, useEffect, useRef } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import { useShrinkToFit } from '../hooks/useShrinkToFit';
import { useStepCheckboxDrag } from '../hooks/useStepCheckboxDrag';
import StepCheckbox from './StepCheckbox';
import { formatDate } from '../utils/formatters';
import SkipPopup from './SkipPopup';
import TimingOptionsPopup from './TimingOptionsPopup';
import ContextMenu from './context-menu/ContextMenu';
import ConfirmModal from './ConfirmModal';
import DeleteIcon from './svg-icons/DeleteIcon';
import TimingIcon from './svg-icons/TimingIcon';
import styles from './TaskCard.module.css';

interface Props {
	task: Task;
}

function getTimeString(ms: number): string {
	const isNegative = ms < 0;
	const abs = Math.abs(ms);

	const timeUnits = [
		{ ms: 52.1775 * 7 * 24 * 3600000, name: 'year' },
		{ ms: 7 * 24 * 3600000, name: 'week' },
		{ ms: 24 * 3600000, name: 'day' },
		{ ms: 3600000, name: 'hour' },
		{ ms: 60000, name: 'minute' },
	];

	for (const unit of timeUnits) {
		if (abs >= unit.ms) {
			const count = Math.floor(abs / unit.ms);
			return `${count} ${unit.name}${count !== 1 ? 's' : ''} ${isNegative ? 'ago' : 'left'}`;
		}
	}

	return '';
}

export default function TaskCard({ task }: Props) {
	const store = useTasksStore();
	const [currentTime, setCurrentTime] = useState(new Date());
	const [isSkipOpen, setIsSkipOpen] = useState(false);
	const [isTimingOpen, setIsTimingOpen] = useState(false);
	const [stepContextMenu, setStepContextMenu] = useState<{ step: string; x: number; y: number } | null>(null);
	const [stepPendingDeletion, setStepPendingDeletion] = useState<string | null>(null);
	const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
	const timeRef = useShrinkToFit<HTMLSpanElement>();

	const descRef = useRef<HTMLHeadingElement>(null);
	const nextStepRef = useRef<HTMLSpanElement>(null);

	const { stepsContainerRef, getCheckboxDragHandlers } = useStepCheckboxDrag({
		isStepChecked: step => task.isStepComplete(step),
		setStepChecked: (step, isChecked) => store.setStepComplete(task, step, isChecked),
	});

	useEffect(() => {
		const id = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	// Sync description contenteditable with task
	useEffect(() => {
		const el = descRef.current;
		if (el && el.textContent !== task.getDescription()) {
			el.textContent = task.getDescription();
		}
	}, [task.getDescription()]);

	// Sync next step contenteditable with task
	useEffect(() => {
		const el = nextStepRef.current;
		const step = task.getNextStep() ?? '';
		if (el && el.textContent !== step) {
			el.textContent = step;
		}
	}, [task.getNextStep()]);

	const deadline = task.getDeadline();
	const startTime = task.getStartTime();
	const timeUntilDeadline = task.getTimeUntilDeadline(currentTime);
	const timeLeftStr = timeUntilDeadline === Number.POSITIVE_INFINITY ? null : getTimeString(timeUntilDeadline);
	const progress = task.getProgress();
	const progressPct = progress * 94 + 3;
	const isSkippable = !task.isUrgent(currentTime);
	const nextStep = task.getNextStep();
	const steps = task.getSteps();
	const nextStepIndex = nextStep === null ? -1 : task.getStepIndex(nextStep);

	function onDescriptionBlur(event: React.FocusEvent<HTMLHeadingElement>) {
		const newDesc = event.currentTarget.textContent ?? '';
		if (newDesc !== task.getDescription()) {
			store.setDescription(task, newDesc);
		}
	}

	function onNextStepBlur(event: React.FocusEvent<HTMLSpanElement>) {
		const newStep = event.currentTarget.textContent ?? '';
		if (nextStep !== null && newStep !== nextStep) {
			store.setStep(task, nextStep, newStep);
		}
	}

	function onDeleteClick() {
		setIsDeleteTaskConfirmOpen(true);
	}

	function onStepCheckboxChange(step: string, isChecked: boolean, isShiftClick: boolean) {
		if (isShiftClick) {
			if (isChecked) {
				store.completeStepAndPrecedingSteps(task, step);
			}
			else {
				store.uncompleteStepAndFollowingSteps(task, step);
			}
		}
		else {
			store.setStepComplete(task, step, isChecked);
		}
	}

	return (
		<div className={styles.card}>
			<div className={styles.progressTrack}>
				<div
					className={styles.progressBar}
					style={{ width: `${progressPct}%` }}
				/>
			</div>

			<h2
				ref={descRef}
				contentEditable
				suppressContentEditableWarning
				onBlur={onDescriptionBlur}
				className={styles.description}
			/>

			{task.hasNextStep() && (
				<div ref={stepsContainerRef} className={styles.steps}>
					{steps.map((step, stepIndex) => {
						const isCompleted = task.isStepComplete(step);
						const isCurrentStep = step === nextStep;
						const isPreviousStep = nextStepIndex !== -1 && stepIndex < nextStepIndex;

						return (
							<div
								key={step}
								className={isCurrentStep ? `${styles.stepRow} ${styles.stepRowCurrent}` : styles.stepRow}
								onContextMenu={event => {
									event.preventDefault();
									setStepContextMenu({ step, x: event.clientX, y: event.clientY });
								}}
							>
								<StepCheckbox
									step={step}
									isChecked={isCompleted}
									onToggle={onStepCheckboxChange}
									dragHandlers={getCheckboxDragHandlers(step)}
									className={isCompleted ? `${styles.stepCheckbox} ${styles.stepCheckboxChecked}` : styles.stepCheckbox}
									checkmarkClassName={styles.stepCheckmark}
								/>

								{isCurrentStep ? (
									<span
										ref={nextStepRef}
										contentEditable
										suppressContentEditableWarning
										onBlur={onNextStepBlur}
										className={styles.currentStep}
									/>
								) : (
									<span className={isPreviousStep ? styles.previousStep : styles.upcomingStep}>{step}</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			<div className={styles.meta}>
				{startTime && startTime > currentTime && (
					<span>Starts {formatDate(startTime)}</span>
				)}
				{deadline && (
					<span>Due {formatDate(deadline)}</span>
				)}
				{timeLeftStr && (
					<span ref={timeRef} className={styles.timeLeft}>
						{timeLeftStr}
					</span>
				)}
			</div>

			<div className={styles.actions}>
				{isSkippable && (
					<button
						onClick={() => setIsSkipOpen(true)}
						className={`button ${styles.actionButton} ${styles.actionGrows}`}
					>
						Skip
					</button>
				)}
				<button
					onClick={() => store.completeAllSteps(task)}
					className={`button button--primary ${styles.actionButton} ${styles.actionGrows}`}
				>
					Complete Task
				</button>
				<button
					onClick={() => setIsTimingOpen(true)}
					className={`button icon ${styles.actionButton} ${styles.actionButtonSquare}`}
					aria-label="Timing options"
					title="Timing options"
				>
					<TimingIcon className={styles.timingIcon} />
				</button>
				<button
					onClick={onDeleteClick}
					className={`button icon danger ${styles.actionButton} ${styles.actionButtonSquare}`}
					aria-label="Delete task"
					title="Delete task"
				>
					<DeleteIcon className={styles.deleteIcon} />
				</button>
			</div>

			<SkipPopup task={task} isOpen={isSkipOpen} onClose={() => setIsSkipOpen(false)} />
			<TimingOptionsPopup task={task} isOpen={isTimingOpen} onClose={() => setIsTimingOpen(false)} />

			<ContextMenu
				position={stepContextMenu !== null ? { x: stepContextMenu.x, y: stepContextMenu.y } : null}
				onClose={() => setStepContextMenu(null)}
				items={stepContextMenu !== null ? [
					{ label: 'Check all up to here', hintKeys: ['Shift', 'Click'], onClick: () => store.completeStepAndPrecedingSteps(task, stepContextMenu.step) },
					{ label: 'Uncheck all from here', hintKeys: ['Shift', 'Click'], onClick: () => store.uncompleteStepAndFollowingSteps(task, stepContextMenu.step) },
					{ label: 'Delete', isDanger: true, onClick: () => setStepPendingDeletion(stepContextMenu.step) },
				] : []}
			/>

			<ConfirmModal
				headingText="Delete step?"
				descriptionText={`"${stepPendingDeletion}" will be permanently deleted. This cannot be undone.`}
				confirmButtonLabel="Delete"
				isOpen={stepPendingDeletion !== null}
				onClose={() => setStepPendingDeletion(null)}
				onConfirm={() => {
					if (stepPendingDeletion !== null) {
						store.setSteps(task, task.getSteps().filter(step => step !== stepPendingDeletion));
					}
					setStepPendingDeletion(null);
				}}
			/>

			<ConfirmModal
				headingText="Delete task?"
				descriptionText={`"${task.getDescription()}" will be permanently deleted. This cannot be undone.`}
				confirmButtonLabel="Delete"
				isOpen={isDeleteTaskConfirmOpen}
				onClose={() => setIsDeleteTaskConfirmOpen(false)}
				onConfirm={() => {
					store.deleteTask(task);
					setIsDeleteTaskConfirmOpen(false);
				}}
			/>
		</div>
	);
}

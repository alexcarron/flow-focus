import { useState, useEffect, useRef } from 'react';
import Task from '../model/task/Task';
import { useTasksStore } from '../stores/tasksStore';
import { useShrinkToFit } from '../hooks/useShrinkToFit';
import { formatDate } from '../utils/formatters';
import SkipPopup from './SkipPopup';
import TimingOptionsPopup from './TimingOptionsPopup';
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
	const timeRef = useShrinkToFit<HTMLSpanElement>();

	const descRef = useRef<HTMLHeadingElement>(null);
	const nextStepRef = useRef<HTMLSpanElement>(null);

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

	function onStepCheckboxChange(step: string, isChecked: boolean) {
		if (isChecked) {
			store.completeStepAndPrecedingSteps(task, step);
		}
		else {
			store.setStepComplete(task, step, false);
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
				<div className={styles.steps}>
					{steps.map((step, stepIndex) => {
						const isCompleted = task.isStepComplete(step);
						const isCurrentStep = step === nextStep;
						const isPreviousStep = nextStepIndex !== -1 && stepIndex < nextStepIndex;

						return (
							<div
								key={step}
								className={isCurrentStep ? `${styles.stepRow} ${styles.stepRowCurrent}` : styles.stepRow}
							>
								<div
									role="checkbox"
									aria-checked={isCompleted}
									tabIndex={0}
									onClick={() => onStepCheckboxChange(step, !isCompleted)}
									onKeyDown={event => {
										if (event.key === ' ' || event.key === 'Enter') onStepCheckboxChange(step, !isCompleted);
									}}
									className={isCompleted ? `${styles.stepCheckbox} ${styles.stepCheckboxChecked}` : styles.stepCheckbox}
								>
									{isCompleted && (
										<svg className={styles.stepCheckmark} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									)}
								</div>

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
						className={`button ${styles.actionGrows}`}
					>
						Skip
					</button>
				)}
				<button
					onClick={() => store.completeAllSteps(task)}
					className={`button button--primary ${styles.actionGrows}`}
				>
					Complete Task
				</button>
				<button
					onClick={() => setIsTimingOpen(true)}
					className="button"
					aria-label="Timing options"
					title="Timing options"
				>
					⏱
				</button>
			</div>

			<SkipPopup task={task} isOpen={isSkipOpen} onClose={() => setIsSkipOpen(false)} />
			<TimingOptionsPopup task={task} isOpen={isTimingOpen} onClose={() => setIsTimingOpen(false)} />
		</div>
	);
}

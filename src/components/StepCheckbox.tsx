interface Props {
	step: string;
	isChecked: boolean;
	onToggle: (step: string, isChecked: boolean, isShiftClick: boolean) => void;
	dragHandlers: {
		onMouseDown: (event: React.MouseEvent) => void;
		onMouseEnter: (event: React.MouseEvent) => void;
	};
	className: string;
	checkmarkClassName?: string;
}

export default function StepCheckbox({ step, isChecked, onToggle, dragHandlers, className, checkmarkClassName }: Props) {
	return (
		<div
			role="checkbox"
			aria-checked={isChecked}
			tabIndex={0}
			data-step={step}
			onMouseDown={event => {
				event.stopPropagation();
				dragHandlers.onMouseDown(event);
			}}
			onMouseEnter={dragHandlers.onMouseEnter}
			onClick={event => {
				if (event.shiftKey) onToggle(step, !isChecked, true);
			}}
			onKeyDown={event => {
				if (event.key === ' ' || event.key === 'Enter') onToggle(step, !isChecked, event.shiftKey);
			}}
			className={className}
		>
			{isChecked && (
				<svg className={checkmarkClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			)}
		</div>
	);
}

interface Props {
	className?: string;
}

export default function TimingIcon({ className = '' }: Props) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="13" r="8" />
			<path d="M12 9v4l3 2" />
			<path d="M9 2h6" />
			<path d="M18.5 5.5l1.5-1.5" />
		</svg>
	);
}

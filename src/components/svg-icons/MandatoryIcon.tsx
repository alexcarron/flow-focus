interface Props {
	className?: string;
}

export default function MandatoryIcon({ className = '' }: Props) {
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
			<circle cx="12" cy="12" r="9" />
			<line x1="12" y1="7" x2="12" y2="13" />
			<line x1="12" y1="16.5" x2="12" y2="16.51" />
		</svg>
	);
}

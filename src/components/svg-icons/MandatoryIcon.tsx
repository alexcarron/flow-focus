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
			strokeWidth={3}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<line x1="12" y1="5" x2="12" y2="14" />
			<circle cx="12" cy="19" r="1.75" fill="currentColor" stroke="none" />
		</svg>
	);
}

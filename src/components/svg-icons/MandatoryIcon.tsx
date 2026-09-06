interface Props {
	className?: string;
}

export default function MandatoryIcon({ className = '' }: Props) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<rect x="9.5" y="4" width="3" height="12" rx="2.5" />
			<circle cx="12" cy="19" r="2.5" />
		</svg>
	);
}

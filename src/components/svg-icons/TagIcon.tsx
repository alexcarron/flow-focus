interface Props {
	className?: string;
}

export default function TagIcon({ className = '' }: Props) {
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
			<path d="M3 4.5V11a1.5 1.5 0 0 0 .44 1.06l8.5 8.5a1.5 1.5 0 0 0 2.12 0l6.5-6.5a1.5 1.5 0 0 0 0-2.12l-8.5-8.5A1.5 1.5 0 0 0 11 3H4.5A1.5 1.5 0 0 0 3 4.5z" />
			<circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	);
}

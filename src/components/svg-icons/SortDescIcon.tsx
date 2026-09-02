interface Props {
	className?: string;
}

export default function SortDescIcon({ className = '' }: Props) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	);
}

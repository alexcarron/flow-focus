interface Props {
	className?: string;
}

export default function SortIcon({ className = '' }: Props) {
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
			<path d="m3 16 4 4 4-4" />
			<path d="M7 20V4" />
			<path d="M11 4h10" />
			<path d="M11 8h7" />
			<path d="M11 12h4" />
		</svg>
	);
}

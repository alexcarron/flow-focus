interface Props {
	className?: string;
}

export default function FilterIcon({ className = '' }: Props) {
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
			<path d="M4 5h16" />
			<path d="M7 12h10" />
			<path d="M10 19h4" />
		</svg>
	);
}

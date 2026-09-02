interface Props {
	className?: string;
}

export default function SortUnsortedIcon({ className = '' }: Props) {
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
			<path d="M7 10l5-5 5 5" />
			<path d="M7 14l5 5 5-5" />
		</svg>
	);
}

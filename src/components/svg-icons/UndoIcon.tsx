interface Props {
	className?: string;
}

export default function UndoIcon({ className = '' }: Props) {
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
			<path d="M3 7v6h6" />
			<path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
		</svg>
	);
}

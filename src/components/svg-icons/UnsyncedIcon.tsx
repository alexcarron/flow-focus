interface Props {
	className?: string;
}

export default function UnsyncedIcon({ className = '' }: Props) {
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
			<path d="M7 8a6 6 0 0 1 10-3.5" />
			<polyline points="17 2 19 4.5 16.5 6" />
			<path d="M17 16a6 6 0 0 1 -10 3.5" />
			<polyline points="7 20 5 17.5 7.5 16" />
			<line x1="3" y1="3" x2="21" y2="21" strokeWidth={3} />
		</svg>
	);
}

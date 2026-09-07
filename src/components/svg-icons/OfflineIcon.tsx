interface Props {
	className?: string;
}

export default function OfflineIcon({ className = '' }: Props) {
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
			<circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
			<path d="M7 15.5a7 7 0 0 1 10 0" />
			<path d="M3 11a11 11 0 0 1 18 0" />
			<line x1="3" y1="3" x2="21" y2="21" />
		</svg>
	);
}

import { useId } from 'react';

interface Props {
	className?: string;
}

export default function SyncFailedIcon({ className = '' }: Props) {
	const slashCutoutMaskID = useId();

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
			<mask id={slashCutoutMaskID}>
				<rect x="0" y="0" width="24" height="24" fill="white" />
				<line x1="5" y1="5" x2="19" y2="19" stroke="black" strokeWidth={6.5} strokeLinecap="round" />
			</mask>
			<g mask={`url(#${slashCutoutMaskID})`}>
				<polyline points="23 4 23 10 17 10" />
				<polyline points="1 20 1 14 7 14" />
				<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
			</g>
			<line x1="5" y1="5" x2="19" y2="19" />
		</svg>
	);
}

import { useId } from 'react';

interface Props {
	className?: string;
}

export default function UnsyncedIcon({ className = '' }: Props) {
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
			<circle cx="12" cy="12" r="8" mask={`url(#${slashCutoutMaskID})`} />
			<line x1="5" y1="5" x2="19" y2="19" />
		</svg>
	);
}

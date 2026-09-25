import { useEffect, useEffectEvent } from 'react';

export function useOutsideClickAndEscape(
	ref: React.RefObject<HTMLElement | null>,
	isActive: boolean,
	onOutsideAction: () => void,
): void {
	const onOutsideActionWithLatestCallback = useEffectEvent(onOutsideAction);

	useEffect(() => {
		if (!isActive) return;

		function onMouseDown(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onOutsideActionWithLatestCallback();
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onOutsideActionWithLatestCallback();
			}
		}

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isActive, ref]);
}

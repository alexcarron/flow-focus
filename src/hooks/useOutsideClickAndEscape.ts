import { useEffect } from 'react';

export function useOutsideClickAndEscape(
	ref: React.RefObject<HTMLElement>,
	isActive: boolean,
	onOutsideAction: () => void,
): void {
	useEffect(() => {
		if (!isActive) return;

		function onMouseDown(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onOutsideAction();
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onOutsideAction();
			}
		}

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isActive, onOutsideAction, ref]);
}

import { useEffect } from 'react';
import { useRefToLatestValue } from './useRefToLatestValue';

export function useOutsideClickAndEscape(
	ref: React.RefObject<HTMLElement>,
	isActive: boolean,
	onOutsideAction: () => void,
): void {
	const onOutsideActionRef = useRefToLatestValue(onOutsideAction);

	useEffect(() => {
		if (!isActive) return;

		function onMouseDown(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onOutsideActionRef.current();
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onOutsideActionRef.current();
			}
		}

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isActive, onOutsideActionRef, ref]);
}

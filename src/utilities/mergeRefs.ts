import type { MutableRefObject, RefCallback } from 'react';

/**
 * Allows multiple React refs to point to the same DOM element or component.
 * @param refs - An array of refs to merge
 * @returns A callback ref that assigns the same instance to all provided refs
 * @example
 * const internalRef = useRef<HTMLDivElement>(null);
 * const externalRef = useRef<HTMLDivElement>(null);
 * const combinedRef = mergeRefs(internalRef, externalRef);
 * return <div ref={combinedRef}>Hello</div>;
 */
export function mergeRefs<T>(...refs: Array<MutableRefObject<T | null> | RefCallback<T> | null | undefined>): RefCallback<T> {
	return instance => {
		refs.forEach(ref => {
			if (!ref) return;
			if (typeof ref === 'function') ref(instance);
			else ref.current = instance;
		});
	};
}

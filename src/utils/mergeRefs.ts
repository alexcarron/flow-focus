import type { MutableRefObject, RefCallback } from 'react';

export function mergeRefs<T>(...refs: Array<MutableRefObject<T | null> | RefCallback<T> | null | undefined>): RefCallback<T> {
	return instance => {
		refs.forEach(ref => {
			if (!ref) return;
			if (typeof ref === 'function') ref(instance);
			else ref.current = instance;
		});
	};
}

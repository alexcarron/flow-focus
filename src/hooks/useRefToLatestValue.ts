import { MutableRefObject, useLayoutEffect, useRef } from 'react';

export function useRefToLatestValue<Value>(latestValue: Value): MutableRefObject<Value> {
	const latestValueRef = useRef(latestValue);

	useLayoutEffect(() => {
		latestValueRef.current = latestValue;
	});

	return latestValueRef;
}

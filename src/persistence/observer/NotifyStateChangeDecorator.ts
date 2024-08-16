export default function NotifyStateChange(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	const originalMethod = descriptor.value;

	descriptor.value = function (...args: any[]) {
			// Call the original method
			const result = originalMethod.apply(this, args);

			if (
				'stateObserver' in this &&
				'onStateChange' in (this as any).stateObserver
			) {
				(this as any).stateObserver.onStateChange();
			}

			return result;
	};

	return descriptor;
}
export function toCloudTimestamp(date: Date): string {
	return date.toISOString();
}

export function toNullableCloudTimestamp(date: Date | null): string | null {
	return date ? date.toISOString() : null;
}

export function fromCloudTimestamp(value: string): Date {
	return new Date(value);
}

export function fromNullableCloudTimestamp(value: string | null): Date | null {
	return value ? new Date(value) : null;
}

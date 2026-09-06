import { describe, it, expect } from 'vitest';
import { fromCloudTimestamp, fromNullableCloudTimestamp, toCloudTimestamp, toNullableCloudTimestamp } from './cloudTimestamp';

describe('toCloudTimestamp and fromCloudTimestamp', () => {
	it('round-trips a date through an ISO 8601 UTC string', () => {
		const date = new Date('2026-03-01T12:34:56.789Z');

		expect(toCloudTimestamp(date)).toBe('2026-03-01T12:34:56.789Z');
		expect(fromCloudTimestamp('2026-03-01T12:34:56.789Z')).toEqual(date);
	});

	it('normalizes a non-UTC offset string to the same instant in UTC', () => {
		expect(fromCloudTimestamp('2026-03-01T08:34:56.789-04:00')).toEqual(new Date('2026-03-01T12:34:56.789Z'));
	});
});

describe('toNullableCloudTimestamp and fromNullableCloudTimestamp', () => {
	it('passes through null without conversion', () => {
		expect(toNullableCloudTimestamp(null)).toBeNull();
		expect(fromNullableCloudTimestamp(null)).toBeNull();
	});

	it('converts a present date the same way as the non-nullable helpers', () => {
		const date = new Date('2026-03-01T12:34:56.789Z');

		expect(toNullableCloudTimestamp(date)).toBe(toCloudTimestamp(date));
		expect(fromNullableCloudTimestamp('2026-03-01T12:34:56.789Z')).toEqual(fromCloudTimestamp('2026-03-01T12:34:56.789Z'));
	});
});

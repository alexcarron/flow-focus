import { describe, it, expect } from 'vitest';
import { cloudRowToTagRow, tagRowToCloudRow } from './tag.serializer';
import { TagRow } from '../local/flowfocus.db';

const USER_ID = 'user-a-uuid';

function makeTagRow(overrides: Partial<TagRow> = {}): TagRow {
	return {
		id: 'tag-1',
		name: 'Work',
		updatedAt: '2026-03-01T12:00:00.000Z',
		deletedAt: null,
		isSynced: false,
		...overrides,
	};
}

describe('tagRowToCloudRow', () => {
	it('maps every field to its snake_case cloud column, tagged with the given user id', () => {
		const cloudRow = tagRowToCloudRow(makeTagRow(), USER_ID);

		expect(cloudRow).toEqual({
			id: 'tag-1',
			user_id: USER_ID,
			name: 'Work',
			updated_at: '2026-03-01T12:00:00.000Z',
			deleted_at: null,
		});
	});

	it('carries a non-null deletedAt through to deleted_at', () => {
		const cloudRow = tagRowToCloudRow(makeTagRow({ deletedAt: '2026-03-02T00:00:00.000Z' }), USER_ID);

		expect(cloudRow.deleted_at).toBe('2026-03-02T00:00:00.000Z');
	});
});

describe('cloudRowToTagRow', () => {
	it('reconstructs the local row, marked as synced', () => {
		const cloudRow = tagRowToCloudRow(makeTagRow(), USER_ID);

		const row = cloudRowToTagRow(cloudRow);

		expect(row).toEqual({ ...makeTagRow(), isSynced: true });
	});
});

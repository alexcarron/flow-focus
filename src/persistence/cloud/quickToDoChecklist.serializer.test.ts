import { describe, it, expect } from 'vitest';
import { cloudRowToQuickToDoChecklistRow, quickToDoChecklistRowToCloudRow } from './quickToDoChecklist.serializer';
import { QuickToDoChecklistRow } from '../local/flowfocus.db';

const USER_ID = 'user-a-uuid';

describe('quickToDoChecklistRowToCloudRow', () => {
	it('tags the items with the given user id and drops the local-only fields', () => {
		const row: QuickToDoChecklistRow = {
			id: 1,
			items: [{ id: 'item-1', text: 'Call mom', isChecked: false, children: [] }],
			updatedAt: '2026-03-01T12:00:00.000Z',
			isSynced: false,
		};

		const cloudRow = quickToDoChecklistRowToCloudRow(row, USER_ID);

		expect(cloudRow).toEqual({
			user_id: USER_ID,
			items: row.items,
			updated_at: '2026-03-01T12:00:00.000Z',
		});
	});
});

describe('cloudRowToQuickToDoChecklistRow', () => {
	it('reconstructs the local row at the given local id, marked as synced', () => {
		const cloudRow = {
			user_id: USER_ID,
			items: [{ id: 'item-1', text: 'Call mom', isChecked: false, children: [] }],
			updated_at: '2026-03-01T12:00:00.000Z',
		};

		const row = cloudRowToQuickToDoChecklistRow({ cloudRow, id: 1 });

		expect(row).toEqual({
			id: 1,
			items: cloudRow.items,
			updatedAt: '2026-03-01T12:00:00.000Z',
			isSynced: true,
		});
	});
});

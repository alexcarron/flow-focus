import { describe, it, expect } from 'vitest';
import { cloudRowToSettingsRow, settingsRowToCloudRow } from './settings.serializer';
import { SettingsRow } from '../local/flowfocus.db';

const USER_ID = 'user-a-uuid';

function makeSettingsRow(): SettingsRow {
	return {
		id: 1,
		morningTime: '07:00',
		nightTime: '23:00',
		bedtime: '00:00',
		wakeTime: '08:00',
		shouldKeepTaskDetailsAfterCreating: false,
		shouldShowQuickAddTaskBarOnFocusPage: true,
		updatedAt: '2026-03-01T12:00:00.000Z',
		isSynced: false,
	};
}

describe('settingsRowToCloudRow', () => {
	it('maps every field to its snake_case cloud column, tagged with the given user id', () => {
		const cloudRow = settingsRowToCloudRow(makeSettingsRow(), USER_ID);

		expect(cloudRow).toEqual({
			user_id: USER_ID,
			morning_time: '07:00',
			night_time: '23:00',
			bedtime: '00:00',
			wake_time: '08:00',
			should_keep_task_details_after_creating: false,
			should_show_quick_add_task_bar_on_focus_page: true,
			updated_at: '2026-03-01T12:00:00.000Z',
		});
	});
});

describe('cloudRowToSettingsRow', () => {
	it('reconstructs the local row at the given local id, marked as synced', () => {
		const cloudRow = settingsRowToCloudRow(makeSettingsRow(), USER_ID);

		const row = cloudRowToSettingsRow({ cloudRow, id: 1 });

		expect(row).toEqual({ ...makeSettingsRow(), isSynced: true });
	});
});

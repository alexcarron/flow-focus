import { SettingsRow } from './flowfocus.db';
import { fromCloudTimestamp, toCloudTimestamp } from './cloudTimestamp';

export interface CloudSettingsRow {
	user_id: string;
	morning_time: string;
	night_time: string;
	bedtime: string;
	wake_time: string;
	should_keep_task_details_after_creating: boolean;
	should_show_quick_add_task_bar_on_focus_page: boolean;
	updated_at: string;
}

export function settingsRowToCloudRow(row: SettingsRow, userID: string): CloudSettingsRow {
	return {
		user_id: userID,
		morning_time: row.morningTime,
		night_time: row.nightTime,
		bedtime: row.bedtime,
		wake_time: row.wakeTime,
		should_keep_task_details_after_creating: row.shouldKeepTaskDetailsAfterCreating,
		should_show_quick_add_task_bar_on_focus_page: row.shouldShowQuickAddTaskBarOnFocusPage,
		updated_at: toCloudTimestamp(fromCloudTimestamp(row.updatedAt)),
	};
}

export function cloudRowToSettingsRow({ cloudRow, id }: { cloudRow: CloudSettingsRow; id: number }): SettingsRow {
	return {
		id,
		morningTime: cloudRow.morning_time,
		nightTime: cloudRow.night_time,
		bedtime: cloudRow.bedtime,
		wakeTime: cloudRow.wake_time,
		shouldKeepTaskDetailsAfterCreating: cloudRow.should_keep_task_details_after_creating,
		shouldShowQuickAddTaskBarOnFocusPage: cloudRow.should_show_quick_add_task_bar_on_focus_page,
		updatedAt: toCloudTimestamp(fromCloudTimestamp(cloudRow.updated_at)),
		isSynced: true,
	};
}

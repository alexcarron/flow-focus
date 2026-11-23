import { SettingsRow } from '../local/flowfocus.db';
import { fromCloudTimestamp, toCloudTimestamp } from './cloudTimestamp';

export interface CloudSettingsRow {
	user_id: string;
	morning_time: string;
	night_time: string;
	should_ignore_sleep_schedule: boolean;
	bedtime: string;
	wake_time: string;
	should_keep_task_details_after_creating: boolean;
	should_show_quick_add_task_bar_on_focus_page: boolean;
	should_show_remaining_tasks_summary_on_focus_page: boolean;
	should_show_confetti: boolean;
	should_play_task_completion_sound: boolean;
	should_play_step_completion_sound: boolean;
	updated_at: string;
}

export function settingsRowToCloudRow(row: SettingsRow, userID: string): CloudSettingsRow {
	return {
		user_id: userID,
		morning_time: row.morningTime,
		night_time: row.nightTime,
		should_ignore_sleep_schedule: row.shouldIgnoreSleepSchedule,
		bedtime: row.bedtime,
		wake_time: row.wakeTime,
		should_keep_task_details_after_creating: row.shouldKeepTaskDetailsAfterCreating,
		should_show_quick_add_task_bar_on_focus_page: row.shouldShowQuickAddTaskBarOnFocusPage,
		should_show_remaining_tasks_summary_on_focus_page: row.shouldShowRemainingTasksSummaryOnFocusPage,
		should_show_confetti: row.shouldShowConfetti,
		should_play_task_completion_sound: row.shouldPlayTaskCompletionSound,
		should_play_step_completion_sound: row.shouldPlayStepCompletionSound,
		updated_at: toCloudTimestamp(fromCloudTimestamp(row.updatedAt)),
	};
}

export function cloudRowToSettingsRow({ cloudRow, id }: { cloudRow: CloudSettingsRow; id: number }): SettingsRow {
	return {
		id,
		morningTime: cloudRow.morning_time,
		nightTime: cloudRow.night_time,
		shouldIgnoreSleepSchedule: cloudRow.should_ignore_sleep_schedule,
		bedtime: cloudRow.bedtime,
		wakeTime: cloudRow.wake_time,
		shouldKeepTaskDetailsAfterCreating: cloudRow.should_keep_task_details_after_creating,
		shouldShowQuickAddTaskBarOnFocusPage: cloudRow.should_show_quick_add_task_bar_on_focus_page,
		shouldShowRemainingTasksSummaryOnFocusPage: cloudRow.should_show_remaining_tasks_summary_on_focus_page,
		shouldShowConfetti: cloudRow.should_show_confetti,
		shouldPlayTaskCompletionSound: cloudRow.should_play_task_completion_sound,
		shouldPlayStepCompletionSound: cloudRow.should_play_step_completion_sound,
		updatedAt: toCloudTimestamp(fromCloudTimestamp(cloudRow.updated_at)),
		isSynced: true,
	};
}

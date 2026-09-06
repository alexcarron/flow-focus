import { requireSupabase } from '../../auth/supabaseClient';
import { PlainTaskRow, QuickToDoChecklistRow, SettingsRow } from '../../db/flowfocus.db';
import { CloudTaskRow, cloudRowToTaskRow, taskRowToCloudRow } from '../../db/task.serializer';
import { CloudChecklistRow, cloudRowToQuickToDoChecklistRow, quickToDoChecklistRowToCloudRow } from '../../db/quickToDoChecklist.serializer';
import { CloudSettingsRow, cloudRowToSettingsRow, settingsRowToCloudRow } from '../../db/settings.serializer';

export interface SupabaseDataService {
	upsertTask(row: PlainTaskRow): Promise<void>;
	upsertChecklist(row: QuickToDoChecklistRow): Promise<void>;
	upsertSettings(row: SettingsRow): Promise<void>;
	pullTasks(sinceUpdatedAt?: string): Promise<PlainTaskRow[]>;
	pullChecklist(localID: number): Promise<QuickToDoChecklistRow | undefined>;
	pullSettings(localID: number): Promise<SettingsRow | undefined>;
}

export function createSupabaseDataService(userID: string): SupabaseDataService {
	const supabase = requireSupabase();

	return {
		async upsertTask(row) {
			const cloudRow = taskRowToCloudRow(row, userID);
			const { error } = await supabase.rpc('upsert_task_if_newer', {
				p_id: cloudRow.id,
				p_user_id: cloudRow.user_id,
				p_description: cloudRow.description,
				p_steps: cloudRow.steps,
				p_start_time: cloudRow.start_time,
				p_end_time: cloudRow.end_time,
				p_deadline: cloudRow.deadline,
				p_min_required_time: cloudRow.min_required_time,
				p_max_required_time: cloudRow.max_required_time,
				p_repeat_interval: cloudRow.repeat_interval,
				p_recurrence_start_time: cloudRow.recurrence_start_time,
				p_is_mandatory: cloudRow.is_mandatory,
				p_is_complete: cloudRow.is_complete,
				p_is_skipped: cloudRow.is_skipped,
				p_last_actioned_step: cloudRow.last_actioned_step,
				p_updated_at: cloudRow.updated_at,
				p_deleted_at: cloudRow.deleted_at,
			});
			if (error) throw error;
		},

		async upsertChecklist(row) {
			const cloudRow = quickToDoChecklistRowToCloudRow(row, userID);
			const { error } = await supabase.rpc('upsert_checklist_if_newer', {
				p_user_id: cloudRow.user_id,
				p_items: cloudRow.items,
				p_updated_at: cloudRow.updated_at,
			});
			if (error) throw error;
		},

		async upsertSettings(row) {
			const cloudRow = settingsRowToCloudRow(row, userID);
			const { error } = await supabase.rpc('upsert_settings_if_newer', {
				p_user_id: cloudRow.user_id,
				p_morning_time: cloudRow.morning_time,
				p_night_time: cloudRow.night_time,
				p_bedtime: cloudRow.bedtime,
				p_wake_time: cloudRow.wake_time,
				p_should_keep_task_details_after_creating: cloudRow.should_keep_task_details_after_creating,
				p_should_show_quick_add_task_bar_on_focus_page: cloudRow.should_show_quick_add_task_bar_on_focus_page,
				p_updated_at: cloudRow.updated_at,
			});
			if (error) throw error;
		},

		async pullTasks(sinceUpdatedAt) {
			const baseQuery = supabase.from('tasks').select('*').eq('user_id', userID);
			const query = sinceUpdatedAt ? baseQuery.gt('updated_at', sinceUpdatedAt) : baseQuery;

			const { data, error } = await query;
			if (error) throw error;
			return (data as CloudTaskRow[]).map(cloudRowToTaskRow);
		},

		async pullChecklist(localID) {
			const { data, error } = await supabase.from('checklist').select('*').eq('user_id', userID).maybeSingle();
			if (error) throw error;
			return data ? cloudRowToQuickToDoChecklistRow({ cloudRow: data as CloudChecklistRow, id: localID }) : undefined;
		},

		async pullSettings(localID) {
			const { data, error } = await supabase.from('settings').select('*').eq('user_id', userID).maybeSingle();
			if (error) throw error;
			return data ? cloudRowToSettingsRow({ cloudRow: data as CloudSettingsRow, id: localID }) : undefined;
		},
	};
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseDataService } from './supabaseDataService';
import { PlainTaskRow, QuickToDoChecklistRow, SettingsRow } from '../local/flowfocus.db';

const USER_ID = 'user-a-uuid';

const rpcMock = vi.fn().mockResolvedValue({ error: null });

function makeQueryBuilder(result: { data: unknown; error: null }) {
	const builder = {
		select: vi.fn(() => builder),
		eq: vi.fn(() => builder),
		gt: vi.fn(() => builder),
		maybeSingle: vi.fn(() => Promise.resolve(result)),
		then: (onFulfilled: (value: typeof result) => unknown) => Promise.resolve(result).then(onFulfilled),
	};
	return builder;
}

let queryResult: { data: unknown; error: null };
const fromMock = vi.fn(() => makeQueryBuilder(queryResult));

vi.mock('./supabaseClient', () => ({
	requireSupabase: () => ({ rpc: rpcMock, from: fromMock }),
}));

beforeEach(() => {
	rpcMock.mockClear();
	fromMock.mockClear();
	queryResult = { data: [], error: null };
});

function makeTaskRow(overrides: Partial<PlainTaskRow> = {}): PlainTaskRow {
	return {
		id: 'task-1',
		description: 'Wash the dishes',
		steps: [],
		startTime: null,
		endTime: null,
		deadline: null,
		minRequiredTime: null,
		maxRequiredTime: null,
		repeatInterval: null,
		reccurenceStartTime: null,
		isMandatory: false,
		isComplete: false,
		isSkipped: false,
		lastActionedStep: null,
		updatedAt: '2026-03-01T12:00:00.000Z',
		deletedAt: null,
		isSynced: false,
		...overrides,
	};
}

describe('upsertTask', () => {
	it('calls the conditional newest-wins RPC with the cloud-shaped, snake_case arguments', async () => {
		const service = createSupabaseDataService(USER_ID);

		await service.upsertTask(makeTaskRow({ description: 'Buy groceries' }));

		expect(rpcMock).toHaveBeenCalledWith('upsert_task_if_newer', expect.objectContaining({
			p_id: 'task-1',
			p_user_id: USER_ID,
			p_description: 'Buy groceries',
			p_updated_at: '2026-03-01T12:00:00.000Z',
			p_deleted_at: null,
		}));
	});

	it('throws when the RPC call returns an error', async () => {
		rpcMock.mockResolvedValueOnce({ error: new Error('network down') });
		const service = createSupabaseDataService(USER_ID);

		await expect(service.upsertTask(makeTaskRow())).rejects.toThrow('network down');
	});
});

describe('upsertChecklist', () => {
	it('calls the conditional newest-wins RPC with the checklist arguments', async () => {
		const row: QuickToDoChecklistRow = { id: 1, items: [], updatedAt: '2026-03-01T12:00:00.000Z', isSynced: false };
		const service = createSupabaseDataService(USER_ID);

		await service.upsertChecklist(row);

		expect(rpcMock).toHaveBeenCalledWith('upsert_checklist_if_newer', {
			p_user_id: USER_ID,
			p_items: [],
			p_updated_at: '2026-03-01T12:00:00.000Z',
		});
	});
});

describe('upsertSettings', () => {
	it('calls the conditional newest-wins RPC with the settings arguments', async () => {
		const row: SettingsRow = {
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
		const service = createSupabaseDataService(USER_ID);

		await service.upsertSettings(row);

		expect(rpcMock).toHaveBeenCalledWith('upsert_settings_if_newer', {
			p_user_id: USER_ID,
			p_morning_time: '07:00',
			p_night_time: '23:00',
			p_bedtime: '00:00',
			p_wake_time: '08:00',
			p_should_keep_task_details_after_creating: false,
			p_should_show_quick_add_task_bar_on_focus_page: true,
			p_updated_at: '2026-03-01T12:00:00.000Z',
		});
	});
});

describe('pullTasks', () => {
	it('pulls every row for the user when no watermark is given', async () => {
		const service = createSupabaseDataService(USER_ID);

		await service.pullTasks();

		const builder = fromMock.mock.results[0].value;
		expect(fromMock).toHaveBeenCalledWith('tasks');
		expect(builder.eq).toHaveBeenCalledWith('user_id', USER_ID);
		expect(builder.gt).not.toHaveBeenCalled();
	});

	it('windows the pull by updated_at when a watermark is given', async () => {
		const service = createSupabaseDataService(USER_ID);

		await service.pullTasks('2026-03-01T00:00:00.000Z');

		const builder = fromMock.mock.results[0].value;
		expect(builder.gt).toHaveBeenCalledWith('updated_at', '2026-03-01T00:00:00.000Z');
	});

	it('maps returned cloud rows back into local task rows', async () => {
		queryResult = {
			data: [{
				id: 'task-1',
				user_id: USER_ID,
				description: 'Buy groceries',
				steps: [],
				start_time: null,
				end_time: null,
				deadline: null,
				min_required_time: null,
				max_required_time: null,
				repeat_interval: null,
				recurrence_start_time: null,
				is_mandatory: false,
				is_complete: false,
				is_skipped: false,
				last_actioned_step: null,
				updated_at: '2026-03-01T12:00:00.000Z',
				deleted_at: null,
			}],
			error: null,
		};
		const service = createSupabaseDataService(USER_ID);

		const rows = await service.pullTasks();

		expect(rows).toEqual([makeTaskRow({ description: 'Buy groceries', isSynced: true })]);
	});
});

describe('pullChecklist and pullSettings', () => {
	it('returns undefined when the user has no cloud checklist yet', async () => {
		queryResult = { data: null, error: null };
		const service = createSupabaseDataService(USER_ID);

		expect(await service.pullChecklist(1)).toBeUndefined();
	});

	it('reconstructs the checklist row at the given local id', async () => {
		queryResult = { data: { user_id: USER_ID, items: [], updated_at: '2026-03-01T12:00:00.000Z' }, error: null };
		const service = createSupabaseDataService(USER_ID);

		expect(await service.pullChecklist(1)).toEqual({ id: 1, items: [], updatedAt: '2026-03-01T12:00:00.000Z', isSynced: true });
	});

	it('reconstructs the settings row at the given local id', async () => {
		queryResult = {
			data: {
				user_id: USER_ID,
				morning_time: '07:00',
				night_time: '23:00',
				bedtime: '00:00',
				wake_time: '08:00',
				should_keep_task_details_after_creating: false,
				should_show_quick_add_task_bar_on_focus_page: true,
				updated_at: '2026-03-01T12:00:00.000Z',
			},
			error: null,
		};
		const service = createSupabaseDataService(USER_ID);

		expect(await service.pullSettings(1)).toEqual({
			id: 1,
			morningTime: '07:00',
			nightTime: '23:00',
			bedtime: '00:00',
			wakeTime: '08:00',
			shouldKeepTaskDetailsAfterCreating: false,
			shouldShowQuickAddTaskBarOnFocusPage: true,
			updatedAt: '2026-03-01T12:00:00.000Z',
			isSynced: true,
		});
	});
});

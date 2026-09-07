import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID, PlainTaskRow, SettingsRow, QuickToDoChecklistRow } from '../local/flowfocus.db';
import { doesLocalDataNeedMigrationToCloud, migrateLocalDataToCloud } from './firstSignInMigration';
import { useSyncStatusStore } from '../../stores/syncStatusStore';

const USER_ID = 'user-a-uuid';

const rpcMock = vi.fn().mockResolvedValue({ error: null });

function makeQueryBuilder(result: { data: unknown; error: null }) {
	const resultWithCount = { ...result, count: Array.isArray(result.data) ? result.data.length : 0 };
	const builder = {
		select: vi.fn(() => builder),
		eq: vi.fn(() => builder),
		gt: vi.fn(() => builder),
		maybeSingle: vi.fn(() => Promise.resolve(result)),
		then: (onFulfilled: (value: typeof resultWithCount) => unknown) => Promise.resolve(resultWithCount).then(onFulfilled),
	};
	return builder;
}

let cloudTasks: unknown[];
let cloudSettings: unknown;
let cloudChecklist: unknown;

const fromMock = vi.fn((table: string) => {
	if (table === 'tasks') return makeQueryBuilder({ data: cloudTasks, error: null });
	if (table === 'settings') return makeQueryBuilder({ data: cloudSettings, error: null });
	if (table === 'checklist') return makeQueryBuilder({ data: cloudChecklist, error: null });
	throw new Error(`Unexpected table: ${table}`);
});

vi.mock('../cloud/supabaseClient', () => ({
	requireSupabase: () => ({ rpc: rpcMock, from: fromMock }),
}));

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

function taskRowToCloudRow(row: PlainTaskRow) {
	return {
		id: row.id,
		user_id: USER_ID,
		description: row.description,
		steps: row.steps,
		start_time: row.startTime,
		end_time: row.endTime,
		deadline: row.deadline,
		min_required_time: row.minRequiredTime,
		max_required_time: row.maxRequiredTime,
		repeat_interval: row.repeatInterval,
		recurrence_start_time: row.reccurenceStartTime,
		is_mandatory: row.isMandatory,
		is_complete: row.isComplete,
		is_skipped: row.isSkipped,
		last_actioned_step: row.lastActionedStep,
		updated_at: row.updatedAt,
		deleted_at: row.deletedAt,
	};
}

beforeEach(async () => {
	rpcMock.mockClear();
	rpcMock.mockResolvedValue({ error: null });
	fromMock.mockClear();
	cloudTasks = [];
	cloudSettings = null;
	cloudChecklist = null;
	useSyncStatusStore.getState().reset();
	await db.tasks.clear();
	await db.settings.clear();
	await db.quickToDoChecklist.clear();
});

afterEach(async () => {
	await db.tasks.clear();
	await db.settings.clear();
	await db.quickToDoChecklist.clear();
});

describe('doesLocalDataNeedMigrationToCloud', () => {
	it('returns false when the cloud account already has tasks', async () => {
		await db.tasks.put(makeTaskRow());
		cloudTasks = [{ id: 'existing-cloud-task' }];

		expect(await doesLocalDataNeedMigrationToCloud(USER_ID)).toBe(false);
	});

	it('returns true when local tasks exist and the cloud account is empty', async () => {
		await db.tasks.put(makeTaskRow());

		expect(await doesLocalDataNeedMigrationToCloud(USER_ID)).toBe(true);
	});

	it('returns false when there is no local data at all', async () => {
		expect(await doesLocalDataNeedMigrationToCloud(USER_ID)).toBe(false);
	});
});

describe('migrateLocalDataToCloud', () => {
	it('pushes local tasks/settings/checklist and clears local data once the cloud copy is verified', async () => {
		const localTask = makeTaskRow();
		const localSettings: SettingsRow = {
			id: SETTINGS_ROW_ID,
			morningTime: '07:00',
			nightTime: '23:00',
			bedtime: '00:00',
			wakeTime: '08:00',
			shouldKeepTaskDetailsAfterCreating: false,
			shouldShowQuickAddTaskBarOnFocusPage: true,
			updatedAt: '2026-03-01T12:00:00.000Z',
			isSynced: false,
		};
		const localChecklist: QuickToDoChecklistRow = {
			id: QUICK_TO_DO_CHECKLIST_ROW_ID,
			items: [],
			updatedAt: '2026-03-01T12:00:00.000Z',
			isSynced: false,
		};
		await db.tasks.put(localTask);
		await db.settings.put(localSettings);
		await db.quickToDoChecklist.put(localChecklist);

		cloudTasks = [taskRowToCloudRow(localTask)];
		cloudSettings = { ...localSettings, morning_time: localSettings.morningTime, night_time: localSettings.nightTime, bedtime: localSettings.bedtime, wake_time: localSettings.wakeTime, should_keep_task_details_after_creating: false, should_show_quick_add_task_bar_on_focus_page: true, updated_at: localSettings.updatedAt };
		cloudChecklist = { items: [], updated_at: localChecklist.updatedAt };

		const didSucceed = await migrateLocalDataToCloud({ userID: USER_ID, shouldKeepLocalData: false });

		expect(didSucceed).toBe(true);
		expect(rpcMock).toHaveBeenCalledWith('upsert_task_if_newer', expect.objectContaining({ p_id: 'task-1' }));
		expect(await db.tasks.toArray()).toEqual([]);
		expect(await db.settings.get(SETTINGS_ROW_ID)).toBeUndefined();
		expect(await db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID)).toBeUndefined();
		expect(useSyncStatusStore.getState().lastSyncError).toBeNull();
	});

	it('keeps local data when the caller asks to keep it, without requiring cloud verification', async () => {
		const localTask = makeTaskRow();
		await db.tasks.put(localTask);
		cloudTasks = [taskRowToCloudRow(localTask)];

		const didSucceed = await migrateLocalDataToCloud({ userID: USER_ID, shouldKeepLocalData: true });

		expect(didSucceed).toBe(true);
		expect(await db.tasks.toArray()).toHaveLength(1);
	});

	it('does not clear local tasks when the push to the cloud fails', async () => {
		await db.tasks.put(makeTaskRow());
		rpcMock.mockResolvedValueOnce({ error: new Error('network down') });

		const didSucceed = await migrateLocalDataToCloud({ userID: USER_ID, shouldKeepLocalData: false });

		expect(didSucceed).toBe(false);
		expect(await db.tasks.toArray()).toHaveLength(1);
		expect(useSyncStatusStore.getState().lastSyncError).toContain('network down');
	});

	it('does not clear local tasks when the push succeeds but the cloud copy cannot be verified', async () => {
		await db.tasks.put(makeTaskRow());
		cloudTasks = [];

		const didSucceed = await migrateLocalDataToCloud({ userID: USER_ID, shouldKeepLocalData: false });

		expect(didSucceed).toBe(false);
		expect(await db.tasks.toArray()).toHaveLength(1);
		expect(useSyncStatusStore.getState().lastSyncError).toBeTruthy();
	});
});

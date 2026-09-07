import { describe, it, expect } from 'vitest';
import { CloudTaskRow, cloudRowToTaskRow, taskRowToCloudRow } from './task.serializer';
import { PlainTaskRow } from '../local/flowfocus.db';

const USER_ID = 'user-a-uuid';

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

function makeCloudTaskRow(overrides: Partial<CloudTaskRow> = {}): CloudTaskRow {
	return {
		id: 'task-1',
		user_id: USER_ID,
		description: 'Wash the dishes',
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
		...overrides,
	};
}

describe('taskRowToCloudRow', () => {
	it('carries the local row fields into the snake_case cloud shape, tagged with the given user id', () => {
		const row = makeTaskRow({
			description: 'Buy groceries',
			startTime: '2026-03-01T08:00:00.000Z',
			reccurenceStartTime: '2026-03-01T08:00:00.000Z',
			repeatInterval: 86400000,
			lastActionedStep: { stepID: 'step-1', status: 'Completed' },
		});

		const cloudRow = taskRowToCloudRow(row, USER_ID);

		expect(cloudRow).toEqual(makeCloudTaskRow({
			description: 'Buy groceries',
			start_time: '2026-03-01T08:00:00.000Z',
			recurrence_start_time: '2026-03-01T08:00:00.000Z',
			repeat_interval: 86400000,
			last_actioned_step: { stepID: 'step-1', status: 'Completed' },
		}));
	});

	it('fixes the reccurence typo at the cloud boundary without touching the local field name', () => {
		const row = makeTaskRow({ reccurenceStartTime: '2026-03-01T08:00:00.000Z' });

		const cloudRow = taskRowToCloudRow(row, USER_ID);

		expect(cloudRow.recurrence_start_time).toBe('2026-03-01T08:00:00.000Z');
		expect(cloudRow).not.toHaveProperty('reccurence_start_time');
	});

	it('normalizes a non-UTC offset timestamp to a UTC ISO string', () => {
		const row = makeTaskRow({ updatedAt: '2026-03-01T08:00:00.000-04:00' });

		const cloudRow = taskRowToCloudRow(row, USER_ID);

		expect(cloudRow.updated_at).toBe('2026-03-01T12:00:00.000Z');
	});
});

describe('cloudRowToTaskRow', () => {
	it('carries the cloud row fields into the local camelCase shape and marks it synced', () => {
		const cloudRow = makeCloudTaskRow({
			description: 'Buy groceries',
			recurrence_start_time: '2026-03-01T08:00:00.000Z',
			repeat_interval: 86400000,
			last_actioned_step: { stepID: 'step-1', status: 'Completed' },
		});

		const row = cloudRowToTaskRow(cloudRow);

		expect(row).toEqual(makeTaskRow({
			description: 'Buy groceries',
			reccurenceStartTime: '2026-03-01T08:00:00.000Z',
			repeatInterval: 86400000,
			lastActionedStep: { stepID: 'step-1', status: 'Completed' },
			isSynced: true,
		}));
	});

	it('normalizes a Postgres timestamptz offset string to the same UTC format the local serializer produces', () => {
		const cloudRow = makeCloudTaskRow({ updated_at: '2026-03-01T12:00:00+00:00' });

		const row = cloudRowToTaskRow(cloudRow);

		expect(row.updatedAt).toBe('2026-03-01T12:00:00.000Z');
	});
});

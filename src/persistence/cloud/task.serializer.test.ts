import { describe, it, expect } from 'vitest';
import RecurrenceUnit from '../../model/task/recurrence/RecurrenceUnit';
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
		recurrenceDuration: null,
		shouldNotSkipMissedOccurrences: false,
		completedOccurrenceIndex: null,
		skippedOccurrenceIndex: null,
		progressOccurrenceIndex: null,
		isMandatory: false,
		isComplete: false,
		isSkipped: false,
		skippedUntil: null,
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
		recurrence_duration_amount: null,
		recurrence_duration_unit: null,
		should_not_skip_missed_occurrences: false,
		completed_occurrence_index: null,
		skipped_occurrence_index: null,
		progress_occurrence_index: null,
		is_mandatory: false,
		is_complete: false,
		is_skipped: false,
		skipped_until: null,
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
			recurrenceDuration: { amount: 2, unit: RecurrenceUnit.Week },
			shouldNotSkipMissedOccurrences: true,
			completedOccurrenceIndex: 3,
			skippedOccurrenceIndex: 1,
			progressOccurrenceIndex: 4,
			lastActionedStep: { stepID: 'step-1', status: 'Completed' },
		});

		const cloudRow = taskRowToCloudRow(row, USER_ID);

		expect(cloudRow).toEqual(makeCloudTaskRow({
			description: 'Buy groceries',
			start_time: '2026-03-01T08:00:00.000Z',
			recurrence_duration_amount: 2,
			recurrence_duration_unit: 'week',
			should_not_skip_missed_occurrences: true,
			completed_occurrence_index: 3,
			skipped_occurrence_index: 1,
			progress_occurrence_index: 4,
			last_actioned_step: { stepID: 'step-1', status: 'Completed' },
		}));
	});

	it('flattens the recurrence duration into amount and unit columns', () => {
		const row = makeTaskRow({ recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Month } });

		const cloudRow = taskRowToCloudRow(row, USER_ID);

		expect(cloudRow.recurrence_duration_amount).toBe(1);
		expect(cloudRow.recurrence_duration_unit).toBe('month');
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
			recurrence_duration_amount: 1,
			recurrence_duration_unit: 'day',
			should_not_skip_missed_occurrences: true,
			completed_occurrence_index: 2,
			progress_occurrence_index: 3,
			last_actioned_step: { stepID: 'step-1', status: 'Completed' },
		});

		const row = cloudRowToTaskRow(cloudRow);

		expect(row).toEqual(makeTaskRow({
			description: 'Buy groceries',
			recurrenceDuration: { amount: 1, unit: RecurrenceUnit.Day },
			shouldNotSkipMissedOccurrences: true,
			completedOccurrenceIndex: 2,
			progressOccurrenceIndex: 3,
			lastActionedStep: { stepID: 'step-1', status: 'Completed' },
			isSynced: true,
		}));
	});

	it('treats an unknown recurrence unit as not recurring', () => {
		const cloudRow = makeCloudTaskRow({ recurrence_duration_amount: 1, recurrence_duration_unit: 'fortnight' });

		expect(cloudRowToTaskRow(cloudRow).recurrenceDuration).toBeNull();
	});

	it('normalizes a Postgres timestamptz offset string to the same UTC format the local serializer produces', () => {
		const cloudRow = makeCloudTaskRow({ updated_at: '2026-03-01T12:00:00+00:00' });

		const row = cloudRowToTaskRow(cloudRow);

		expect(row.updatedAt).toBe('2026-03-01T12:00:00.000Z');
	});
});

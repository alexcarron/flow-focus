import { describe, it, expect, afterEach } from 'vitest';
import Dexie from 'dexie';
import { FlowFocusDB } from './flowfocus.db';

const DB_NAME = 'FlowFocusDB';

class LegacyFlowFocusDB extends Dexie {
	constructor() {
		super(DB_NAME);
		this.version(1).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
		});
		this.version(2).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
		});
		this.version(3).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
		});
		this.version(4).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
			checklist: 'id',
		});
		this.version(5).stores({
			tasks: '++id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime',
			settings: 'id',
			checklist: 'id',
		});
	}
}

afterEach(async () => {
	await Dexie.delete(DB_NAME);
});

describe('opening a fresh database', () => {
	it('creates empty tasks, settings, and quickToDoChecklist tables', async () => {
		const db = new FlowFocusDB();
		await db.open();

		expect(await db.tasks.toArray()).toEqual([]);
		expect(await db.settings.toArray()).toEqual([]);
		expect(await db.quickToDoChecklist.toArray()).toEqual([]);
		expect(await db.syncStatus.toArray()).toEqual([]);

		db.close();
	});
});

describe('upgrading a pre-identity database', () => {
	it('gives every existing task a stable id and fresh persistence metadata', async () => {
		const legacyDB = new LegacyFlowFocusDB();
		await legacyDB.open();
		await legacyDB.table('tasks').add({
			description: 'Water the plants',
			steps: [{ id: 'step-1', text: 'Fill watering can', status: 'Uncomplete' }],
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
		});
		legacyDB.close();

		const upgradedDB = new FlowFocusDB();
		await upgradedDB.open();
		const rows = await upgradedDB.tasks.toArray();

		expect(rows).toHaveLength(1);
		const [row] = rows;
		expect(typeof row.id).toBe('string');
		expect(row.id.length).toBeGreaterThan(0);
		expect(row.description).toBe('Water the plants');
		expect(row.steps).toEqual([{ id: 'step-1', text: 'Fill watering can', status: 'Uncomplete', children: [] }]);
		expect(row.deletedAt).toBeNull();
		expect(row.isSynced).toBe(false);
		expect(typeof row.updatedAt).toBe('string');

		upgradedDB.close();
	});

	it('gives every task its own id when multiple legacy tasks exist', async () => {
		const legacyDB = new LegacyFlowFocusDB();
		await legacyDB.open();
		await legacyDB.table('tasks').bulkAdd([
			{ description: 'Task A', steps: [], startTime: null, endTime: null, deadline: null, minRequiredTime: null, maxRequiredTime: null, repeatInterval: null, reccurenceStartTime: null, isMandatory: false, isComplete: false, isSkipped: false, lastActionedStep: null },
			{ description: 'Task B', steps: [], startTime: null, endTime: null, deadline: null, minRequiredTime: null, maxRequiredTime: null, repeatInterval: null, reccurenceStartTime: null, isMandatory: false, isComplete: false, isSkipped: false, lastActionedStep: null },
		]);
		legacyDB.close();

		const upgradedDB = new FlowFocusDB();
		await upgradedDB.open();
		const rows = await upgradedDB.tasks.toArray();

		expect(rows).toHaveLength(2);
		expect(rows.every(row => typeof row.id === 'string' && row.id.length > 0)).toBe(true);
		expect(new Set(rows.map(row => row.id)).size).toBe(2);

		upgradedDB.close();
	});
});

class RepeatIntervalFlowFocusDB extends Dexie {
	constructor() {
		super(DB_NAME);
		this.version(8).stores({
			tasks: 'id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime, deletedAt, updatedAt',
			settings: 'id',
			quickToDoChecklist: 'id',
			syncStatus: 'id',
		});
	}
}

describe('upgrading a repeat-interval database to recurrence durations', () => {
	const ONE_WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

	async function upgradeSingleRepeatIntervalRow(row: Record<string, unknown>) {
		const legacyDB = new RepeatIntervalFlowFocusDB();
		await legacyDB.open();
		await legacyDB.table('tasks').add({
			id: 'task-1',
			description: 'Water the plants',
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
			skippedUntil: null,
			lastActionedStep: null,
			updatedAt: '2026-09-01T00:00:00.000Z',
			deletedAt: null,
			isSynced: true,
			...row,
		});
		legacyDB.close();

		const upgradedDB = new FlowFocusDB();
		await upgradedDB.open();
		const upgradedRow = await upgradedDB.tasks.get('task-1');
		upgradedDB.close();
		return upgradedRow!;
	}

	it('converts a weekly repeat interval into a one week recurrence duration anchored at the recurrence start time', async () => {
		const row = await upgradeSingleRepeatIntervalRow({
			startTime: '2026-09-13T08:00:00.000Z',
			reccurenceStartTime: '2026-09-13T08:00:00.000Z',
			deadline: '2026-09-20T08:00:00.000Z',
			repeatInterval: ONE_WEEK_MILLISECONDS,
		});

		expect(row.recurrenceDuration).toEqual({ amount: 1, unit: 'week' });
		expect(row.startTime).toBe('2026-09-13T08:00:00.000Z');
		expect(row.deadline).toBe('2026-09-20T08:00:00.000Z');
		expect(row.shouldNotSkipMissedOccurrences).toBe(false);
		expect(row.completedOccurrenceIndex).toBeNull();
		expect(row.skippedOccurrenceIndex).toBeNull();
		expect(row.progressOccurrenceIndex).toBe(0);
		expect(row).not.toHaveProperty('repeatInterval');
		expect(row).not.toHaveProperty('reccurenceStartTime');
	});

	it('pulls a deadline that drifted more than one interval past the start back into the first occurrence', async () => {
		const row = await upgradeSingleRepeatIntervalRow({
			startTime: '2026-09-13T08:00:00.000Z',
			reccurenceStartTime: '2026-09-13T08:00:00.000Z',
			deadline: '2026-09-27T08:00:00.000Z',
			repeatInterval: ONE_WEEK_MILLISECONDS,
		});

		expect(row.deadline).toBe('2026-09-20T08:00:00.000Z');
	});

	it('keeps a completed occurrence completed', async () => {
		const row = await upgradeSingleRepeatIntervalRow({
			reccurenceStartTime: '2026-09-13T08:00:00.000Z',
			repeatInterval: ONE_WEEK_MILLISECONDS,
			isComplete: true,
		});

		expect(row.completedOccurrenceIndex).toBe(0);
	});

	it('leaves non-recurring tasks non-recurring and does not touch their metadata', async () => {
		const row = await upgradeSingleRepeatIntervalRow({ deadline: '2026-09-20T08:00:00.000Z' });

		expect(row.recurrenceDuration).toBeNull();
		expect(row.deadline).toBe('2026-09-20T08:00:00.000Z');
		expect(row.completedOccurrenceIndex).toBeNull();
		expect(row.progressOccurrenceIndex).toBeNull();
		expect(row.updatedAt).toBe('2026-09-01T00:00:00.000Z');
		expect(row.isSynced).toBe(true);
	});
});

class PreTagsFlowFocusDB extends Dexie {
	constructor() {
		super(DB_NAME);
		this.version(10).stores({
			tasks: 'id, deadline, isComplete, isSkipped, isMandatory, startTime, endTime, deletedAt, updatedAt',
			settings: 'id',
			quickToDoChecklist: 'id',
			syncStatus: 'id',
		});
	}
}

describe('upgrading a pre-tags database', () => {
	it('gives every existing task an empty tagIDs list and creates the tags table', async () => {
		const legacyDB = new PreTagsFlowFocusDB();
		await legacyDB.open();
		await legacyDB.table('tasks').add({
			id: 'task-1',
			description: 'Water the plants',
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
			updatedAt: '2026-09-01T00:00:00.000Z',
			deletedAt: null,
			isSynced: true,
		});
		legacyDB.close();

		const upgradedDB = new FlowFocusDB();
		await upgradedDB.open();
		const row = await upgradedDB.tasks.get('task-1');
		expect(row?.tagIDs).toEqual([]);
		expect(await upgradedDB.tags.toArray()).toEqual([]);

		upgradedDB.close();
	});
});

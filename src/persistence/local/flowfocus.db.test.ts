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
		expect(row.steps).toEqual([{ id: 'step-1', text: 'Fill watering can', status: 'Uncomplete' }]);
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

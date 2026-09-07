import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './flowfocus.db';
import { LocalTaskRepository } from './LocalTaskRepository';
import { TaskWriteInput } from '../TaskRepository';

const repository = new LocalTaskRepository();

function makeTaskWriteInput(overrides: Partial<TaskWriteInput> = {}): TaskWriteInput {
	return {
		id: crypto.randomUUID(),
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
		...overrides,
	};
}

beforeEach(async () => {
	await db.delete();
	await db.open();
});

describe('save and getAll', () => {
	it('returns a task after saving it', async () => {
		const input = makeTaskWriteInput({ description: 'Buy groceries' });
		await repository.save(input);

		const rows = await repository.getAll();

		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(input.id);
		expect(rows[0].description).toBe('Buy groceries');
	});

	it('stamps updatedAt and marks the row unsynced', async () => {
		await repository.save(makeTaskWriteInput());

		const [row] = await repository.getAll();

		expect(typeof row.updatedAt).toBe('string');
		expect(row.isSynced).toBe(false);
	});

	it('excludes tasks that have been soft deleted', async () => {
		const input = makeTaskWriteInput();
		await repository.save(input);
		await repository.softDelete(input.id);

		const rows = await repository.getAll();

		expect(rows).toEqual([]);
	});
});

describe('softDelete', () => {
	it('marks a task deleted without removing its row', async () => {
		const input = makeTaskWriteInput();
		await repository.save(input);

		await repository.softDelete(input.id);

		const row = await db.tasks.get(input.id);
		expect(row).toBeDefined();
		expect(row?.deletedAt).not.toBeNull();
	});

	it('does nothing when the task does not exist', async () => {
		await expect(repository.softDelete('missing-id')).resolves.not.toThrow();
	});
});

describe('clear', () => {
	it('empties the tasks table', async () => {
		await repository.save(makeTaskWriteInput());
		await repository.clear();

		expect(await db.tasks.toArray()).toEqual([]);
	});
});

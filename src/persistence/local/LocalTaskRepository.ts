import { db, PlainTaskRow } from './flowfocus.db';
import { TaskRepository, TaskWriteInput } from '../TaskRepository';

export class LocalTaskRepository implements TaskRepository {
	async getAll(): Promise<PlainTaskRow[]> {
		const rows = await db.tasks.toArray();
		return rows.filter(row => row.deletedAt === null);
	}

	async save(record: TaskWriteInput): Promise<void> {
		const now = new Date().toISOString();
		await db.tasks.put({
			...record,
			updatedAt: now,
			deletedAt: null,
			isSynced: false,
		});
	}

	async softDelete(id: string): Promise<void> {
		const existingRow = await db.tasks.get(id);
		if (!existingRow) return;

		const now = new Date().toISOString();
		await db.tasks.put({
			...existingRow,
			deletedAt: now,
			updatedAt: now,
			isSynced: false,
		});
	}

	async clear(): Promise<void> {
		await db.tasks.clear();
	}
}

export const localTaskRepository = new LocalTaskRepository();

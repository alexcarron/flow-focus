import { FlowFocusDB, PlainTaskRow } from '../local/flowfocus.db';
import { TaskRepository, TaskWriteInput } from '../TaskRepository';
import { openUserCacheDatabase } from './perUserCache';

export interface LocalWriteSyncTrigger {
	notifyLocalWrite(): void;
}

export class CachedTaskRepository implements TaskRepository {
	private readonly db: FlowFocusDB;

	constructor(userID: string, private readonly syncTrigger: LocalWriteSyncTrigger) {
		this.db = openUserCacheDatabase(userID);
	}

	async getAll(): Promise<PlainTaskRow[]> {
		const rows = await this.db.tasks.toArray();
		return rows.filter(row => row.deletedAt === null);
	}

	async save(record: TaskWriteInput): Promise<void> {
		const now = new Date().toISOString();
		await this.db.tasks.put({
			...record,
			updatedAt: now,
			deletedAt: null,
			isSynced: false,
		});
		this.notifyLocalWrite();
	}

	async softDelete(id: string): Promise<void> {
		const existingRow = await this.db.tasks.get(id);
		if (!existingRow) return;

		const now = new Date().toISOString();
		await this.db.tasks.put({
			...existingRow,
			deletedAt: now,
			updatedAt: now,
			isSynced: false,
		});
		this.notifyLocalWrite();
	}

	async clear(): Promise<void> {
		const existingRows = await this.db.tasks.toArray();
		if (existingRows.length === 0) return;

		const now = new Date().toISOString();
		await this.db.tasks.bulkPut(existingRows.map(row => ({ ...row, deletedAt: now, updatedAt: now, isSynced: false })));
		this.notifyLocalWrite();
	}

	private notifyLocalWrite(): void {
		try {
			this.syncTrigger.notifyLocalWrite();
		} catch (error) {
			console.error('Sync trigger failed after a local task write', error);
		}
	}
}

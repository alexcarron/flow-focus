import { FlowFocusDB } from '../local/flowfocus.db';
import Tag from '../../model/tag/Tag';
import { TagRepository } from '../TagRepository';
import { validateTagName } from '../../utilities/tagNameValidation';
import { openUserCacheDatabase } from './perUserCache';
import { LocalWriteSyncTrigger } from './CachedTaskRepository';

export class CachedTagRepository implements TagRepository {
	private readonly db: FlowFocusDB;

	constructor(userID: string, private readonly syncTrigger: LocalWriteSyncTrigger) {
		this.db = openUserCacheDatabase(userID);
	}

	async getAllTags(): Promise<Tag[]> {
		const rows = await this.db.tags.toArray();
		return rows.filter(row => row.deletedAt === null).map(row => ({ id: row.id, name: row.name }));
	}

	async addTag(name: string): Promise<Tag> {
		const trimmedName = validateTagName({ name, existingTags: await this.getAllTags() });

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await this.db.tags.put({ id, name: trimmedName, updatedAt: now, deletedAt: null, isSynced: false });
		this.notifyLocalWrite();
		return { id, name: trimmedName };
	}

	async updateTag(id: string, newName: string): Promise<Tag> {
		const trimmedName = validateTagName({ name: newName, existingTags: await this.getAllTags(), excludingID: id });

		const now = new Date().toISOString();
		await this.db.tags.put({ id, name: trimmedName, updatedAt: now, deletedAt: null, isSynced: false });
		this.notifyLocalWrite();
		return { id, name: trimmedName };
	}

	async deleteTag(id: string): Promise<void> {
		const existingRow = await this.db.tags.get(id);
		if (!existingRow) return;

		const now = new Date().toISOString();
		await this.db.tags.put({ ...existingRow, deletedAt: now, updatedAt: now, isSynced: false });
		this.notifyLocalWrite();
	}

	async clear(): Promise<void> {
		const existingRows = await this.db.tags.toArray();
		if (existingRows.length === 0) return;

		const now = new Date().toISOString();
		await this.db.tags.bulkPut(existingRows.map(row => ({ ...row, deletedAt: now, updatedAt: now, isSynced: false })));
		this.notifyLocalWrite();
	}

	private notifyLocalWrite(): void {
		try {
			this.syncTrigger.notifyLocalWrite();
		} catch (error) {
			console.error('Sync trigger failed after a local tag write', error);
		}
	}
}

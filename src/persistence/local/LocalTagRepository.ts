import { db } from './flowfocus.db';
import Tag from '../../model/tag/Tag';
import { TagRepository } from '../TagRepository';
import { validateTagName } from '../../utilities/tagNameValidation';

export class LocalTagRepository implements TagRepository {
	async getAllTags(): Promise<Tag[]> {
		const rows = await db.tags.toArray();
		return rows.filter(row => row.deletedAt === null).map(row => ({ id: row.id, name: row.name }));
	}

	async addTag(name: string): Promise<Tag> {
		const trimmedName = validateTagName({ name, existingTags: await this.getAllTags() });

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await db.tags.put({ id, name: trimmedName, updatedAt: now, deletedAt: null, isSynced: false });
		return { id, name: trimmedName };
	}

	async updateTag(id: string, newName: string): Promise<Tag> {
		const trimmedName = validateTagName({ name: newName, existingTags: await this.getAllTags(), excludingID: id });

		const now = new Date().toISOString();
		await db.tags.put({ id, name: trimmedName, updatedAt: now, deletedAt: null, isSynced: false });
		return { id, name: trimmedName };
	}

	async deleteTag(id: string): Promise<void> {
		const existingRow = await db.tags.get(id);
		if (!existingRow) return;

		const now = new Date().toISOString();
		await db.tags.put({ ...existingRow, deletedAt: now, updatedAt: now, isSynced: false });
	}

	async clear(): Promise<void> {
		await db.tags.clear();
	}
}

export const localTagRepository = new LocalTagRepository();

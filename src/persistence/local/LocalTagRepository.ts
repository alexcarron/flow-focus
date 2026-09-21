import { db } from './flowfocus.db';
import Tag from '../../model/tag/Tag';
import { TagRepository, DuplicateTagNameError, EmptyTagNameError } from '../TagRepository';

export class LocalTagRepository implements TagRepository {
	async getAllTags(): Promise<Tag[]> {
		const rows = await db.tags.toArray();
		return rows.filter(row => row.deletedAt === null).map(row => ({ id: row.id, name: row.name }));
	}

	async addTag(name: string): Promise<Tag> {
		const trimmedName = name.trim();
		if (trimmedName === '') throw new EmptyTagNameError();

		await this.assertNameNotTaken(trimmedName);

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await db.tags.put({ id, name: trimmedName, updatedAt: now, deletedAt: null, isSynced: false });
		return { id, name: trimmedName };
	}

	async updateTag(id: string, newName: string): Promise<Tag> {
		const trimmedName = newName.trim();
		if (trimmedName === '') throw new EmptyTagNameError();

		await this.assertNameNotTaken(trimmedName, id);

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

	private async assertNameNotTaken(name: string, excludingID?: string): Promise<void> {
		const lowerCaseName = name.toLowerCase();
		const existingTags = await this.getAllTags();
		const hasCollision = existingTags.some(tag => tag.id !== excludingID && tag.name.toLowerCase() === lowerCaseName);
		if (hasCollision) throw new DuplicateTagNameError(name);
	}
}

export const localTagRepository = new LocalTagRepository();

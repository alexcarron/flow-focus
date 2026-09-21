import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './flowfocus.db';
import { LocalTagRepository } from './LocalTagRepository';
import { DuplicateTagNameError, EmptyTagNameError } from '../TagRepository';

const repository = new LocalTagRepository();

beforeEach(async () => {
	await db.delete();
	await db.open();
});

describe('addTag', () => {
	it('returns the created tag with a generated id', async () => {
		const tag = await repository.addTag('Work');

		expect(typeof tag.id).toBe('string');
		expect(tag.id.length).toBeGreaterThan(0);
		expect(tag.name).toBe('Work');
	});

	it('is returned by getAllTags after being added', async () => {
		const tag = await repository.addTag('Work');

		expect(await repository.getAllTags()).toEqual([tag]);
	});

	it('trims leading and trailing whitespace before saving', async () => {
		const tag = await repository.addTag('  Work  ');

		expect(tag.name).toBe('Work');
	});

	it('rejects an empty name', async () => {
		await expect(repository.addTag('')).rejects.toBeInstanceOf(EmptyTagNameError);
	});

	it('rejects a whitespace-only name', async () => {
		await expect(repository.addTag('   ')).rejects.toBeInstanceOf(EmptyTagNameError);
	});

	it('rejects a name that collides case-insensitively with an existing tag', async () => {
		await repository.addTag('Work');

		await expect(repository.addTag('work')).rejects.toBeInstanceOf(DuplicateTagNameError);
	});

	it('rejects a name that collides after trimming whitespace', async () => {
		await repository.addTag('Work');

		await expect(repository.addTag(' Work ')).rejects.toBeInstanceOf(DuplicateTagNameError);
	});
});

describe('updateTag', () => {
	it('renames a tag', async () => {
		const tag = await repository.addTag('Work');

		const renamedTag = await repository.updateTag(tag.id, 'Personal');

		expect(renamedTag.name).toBe('Personal');
		expect(await repository.getAllTags()).toEqual([{ id: tag.id, name: 'Personal' }]);
	});

	it('trims leading and trailing whitespace before saving', async () => {
		const tag = await repository.addTag('Work');

		const renamedTag = await repository.updateTag(tag.id, '  Personal  ');

		expect(renamedTag.name).toBe('Personal');
	});

	it('rejects an empty name', async () => {
		const tag = await repository.addTag('Work');

		await expect(repository.updateTag(tag.id, '')).rejects.toBeInstanceOf(EmptyTagNameError);
	});

	it('rejects a name that collides case-insensitively with a different existing tag', async () => {
		const workTag = await repository.addTag('Work');
		await repository.addTag('Personal');

		await expect(repository.updateTag(workTag.id, 'personal')).rejects.toBeInstanceOf(DuplicateTagNameError);
	});

	it('allows renaming a tag to the same name it already has', async () => {
		const tag = await repository.addTag('Work');

		await expect(repository.updateTag(tag.id, 'Work')).resolves.toEqual(tag);
	});
});

describe('deleteTag', () => {
	it('removes a tag from getAllTags without removing its row', async () => {
		const tag = await repository.addTag('Work');

		await repository.deleteTag(tag.id);

		expect(await repository.getAllTags()).toEqual([]);
		const row = await db.tags.get(tag.id);
		expect(row).toBeDefined();
		expect(row?.deletedAt).not.toBeNull();
	});

	it('does nothing when the tag does not exist', async () => {
		await expect(repository.deleteTag('missing-id')).resolves.not.toThrow();
	});
});

describe('clear', () => {
	it('empties the tags table', async () => {
		await repository.addTag('Work');

		await repository.clear();

		expect(await db.tags.toArray()).toEqual([]);
	});
});

import Tag from '../model/tag/Tag';

export class DuplicateTagNameError extends Error {
	constructor(name: string) {
		super('A tag named "' + name + '" already exists.');
		this.name = 'DuplicateTagNameError';
	}
}

export class EmptyTagNameError extends Error {
	constructor() {
		super('Tag name cannot be empty.');
		this.name = 'EmptyTagNameError';
	}
}

export interface TagRepository {
	getAllTags(): Promise<Tag[]>;
	addTag(name: string): Promise<Tag>;
	updateTag(id: string, newName: string): Promise<Tag>;
	deleteTag(id: string): Promise<void>;
	clear(): Promise<void>;
}

import Tag from '../model/tag/Tag';
import { DuplicateTagNameError, EmptyTagNameError } from '../persistence/TagRepository';

export function validateTagName({ name, existingTags, excludingID }: { name: string; existingTags: Tag[]; excludingID?: string }): string {
	const trimmedName = name.trim();
	if (trimmedName === '') throw new EmptyTagNameError();

	const lowerCaseName = trimmedName.toLowerCase();
	const hasCollision = existingTags.some(tag => tag.id !== excludingID && tag.name.toLowerCase() === lowerCaseName);
	if (hasCollision) throw new DuplicateTagNameError(trimmedName);

	return trimmedName;
}

import Tag from '../tag/Tag';
import type { FindMatchesConfig, Matcher, RawMatch } from './typedQuickInputMatchers';
import findTypedTagSegments from './findTypedTagSegments';

function findExistingTagByName(existingTags: Tag[], name: string): Tag | undefined {
	const normalizedName = name.trim().toLowerCase();
	return existingTags.find(tag => tag.name.toLowerCase() === normalizedName);
}

export const tagMatcher: Matcher = {
	field: 'tag',
	colorClass: 'tag',
	findMatches({ input, existingTags }: FindMatchesConfig): RawMatch[] {
		return findTypedTagSegments(input).map((segment): RawMatch => {
			const existingTag = findExistingTagByName(existingTags, segment.name);
			return {
				field: 'tag',
				colorClass: 'tag',
				startIndex: segment.startIndex,
				endIndex: segment.endIndex,
				matchedText: input.slice(segment.startIndex, segment.endIndex),
				explanation: existingTag ? `Tag: ${existingTag.name}` : `New tag: ${segment.name}`,
				timing: {},
				tagMatch: {
					existingTagID: existingTag?.id ?? null,
					newTagName: existingTag ? null : segment.name,
				},
			};
		});
	},
};

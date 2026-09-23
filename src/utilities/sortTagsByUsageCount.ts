import Tag from '../model/tag/Tag';
import Task from '../model/task/Task';

export default function sortTagsByUsageCount({ tags, tasks }: { tags: Tag[]; tasks: Task[] }): Tag[] {
	const tagIDToUsageCount = new Map<string, number>();
	for (const task of tasks) {
		for (const tagID of task.getTagIDs()) {
			tagIDToUsageCount.set(tagID, (tagIDToUsageCount.get(tagID) ?? 0) + 1);
		}
	}

	return [...tags].sort((tagA, tagB) => {
		const usageCountA = tagIDToUsageCount.get(tagA.id) ?? 0;
		const usageCountB = tagIDToUsageCount.get(tagB.id) ?? 0;
		if (usageCountA !== usageCountB) return usageCountB - usageCountA;
		return tagA.name.localeCompare(tagB.name);
	});
}

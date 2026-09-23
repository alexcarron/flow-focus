import Task from '../model/task/Task';

export default function filterTasksByTags({ tasks, selectedTagIDs, isUntaggedSelected }: { tasks: Task[]; selectedTagIDs: string[]; isUntaggedSelected: boolean }): Task[] {
	if (selectedTagIDs.length === 0 && !isUntaggedSelected) return tasks;

	return tasks.filter(task => {
		const tagIDs = task.getTagIDs();
		if (isUntaggedSelected && tagIDs.length === 0) return true;
		return tagIDs.some(tagID => selectedTagIDs.includes(tagID));
	});
}

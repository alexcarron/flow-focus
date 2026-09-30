import Task from '../model/task/Task';
import { convertTaskToMarkdown } from '../model/task/convertTaskToMarkdown';
import { useTagsStore } from '../stores/tagsStore';
import { useToastStore } from '../stores/toastStore';

export function useCopyTaskAsMarkdown(): (task: Task) => Promise<void> {
	const tags = useTagsStore(state => state.tags);
	const showToast = useToastStore(state => state.showToast);

	return async function copyTaskAsMarkdown(task: Task) {
		const taskMarkdown = convertTaskToMarkdown({ task, tags, now: new Date() });
		try {
			await navigator.clipboard.writeText(taskMarkdown);
			showToast('Copied task as Markdown');
		}
		catch {
			showToast("Couldn't copy task to clipboard");
		}
	};
}

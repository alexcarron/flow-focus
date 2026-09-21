import { create } from 'zustand';
import Tag from '../model/tag/Tag';
import { getActiveRepositories } from '../persistence/activeRepositories';

interface TagsState {
	tags: Tag[];
	isLoading: boolean;
}

interface TagsActions {
	loadTags: () => Promise<void>;
	addTag: (name: string) => Promise<Tag>;
	renameTag: (id: string, newName: string) => Promise<void>;
	deleteTag: (id: string) => Promise<void>;
	importTags: (tags: Tag[]) => Promise<void>;
}

export const useTagsStore = create<TagsState & TagsActions>()((set, get) => ({
	tags: [],
	isLoading: true,

	async loadTags() {
		const tags = await getActiveRepositories().tagRepository.getAllTags();
		set({ tags, isLoading: false });
	},

	async addTag(name: string) {
		const tag = await getActiveRepositories().tagRepository.addTag(name);
		set({ tags: [...get().tags, tag] });
		return tag;
	},

	async renameTag(id: string, newName: string) {
		const tag = await getActiveRepositories().tagRepository.updateTag(id, newName);
		set({ tags: get().tags.map(existingTag => existingTag.id === id ? tag : existingTag) });
	},

	async deleteTag(id: string) {
		await getActiveRepositories().tagRepository.deleteTag(id);
		set({ tags: get().tags.filter(tag => tag.id !== id) });
	},

	async importTags(tags: Tag[]) {
		await getActiveRepositories().tagRepository.clear();
		for (const tag of tags) {
			await getActiveRepositories().tagRepository.updateTag(tag.id, tag.name);
		}
		set({ tags });
	},
}));

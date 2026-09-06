import { create } from 'zustand';
import QuickToDoChecklistItem from '../model/quickToDoChecklist/QuickToDoChecklistItem';
import * as quickToDoChecklistTree from '../model/quickToDoChecklist/quickToDoChecklistTree';
import { localQuickToDoChecklistRepository } from '../persistence/local/LocalQuickToDoChecklistRepository';

interface QuickToDoChecklistState {
	items: QuickToDoChecklistItem[];
	isLoaded: boolean;
}

interface QuickToDoChecklistActions {
	loadQuickToDoChecklist: () => Promise<void>;
	addTopLevelItem: (text: string) => string;
	insertItemBeforeOrAfter: (itemID: string, position: 'before' | 'after') => string;
	editItemText: (itemID: string, text: string) => void;
	toggleItemChecked: (itemID: string) => void;
	setItemChecked: (itemID: string, isChecked: boolean) => void;
	checkItemAndPrecedingItems: (itemID: string) => void;
	uncheckItemAndFollowingItems: (itemID: string) => void;
	insertItemsFromPastedLines: (itemID: string, lines: string[]) => string[];
	deleteItem: (itemID: string) => void;
	deleteCheckedItems: () => void;
	indentItem: (itemID: string) => void;
	unindentItem: (itemID: string) => void;
	moveItemUp: (itemID: string) => void;
	moveItemDown: (itemID: string) => void;
	reparentAndReorderItem: (itemID: string, newParentID: string | null, newIndexAmongSiblings: number) => void;
	importQuickToDoChecklist: (items: QuickToDoChecklistItem[]) => Promise<void>;
}

async function persistQuickToDoChecklist(items: QuickToDoChecklistItem[]): Promise<void> {
	await localQuickToDoChecklistRepository.save(items);
}

export const useQuickToDoChecklistStore = create<QuickToDoChecklistState & QuickToDoChecklistActions>()((set, get) => ({
	items: [],
	isLoaded: false,

	async loadQuickToDoChecklist() {
		const items = await localQuickToDoChecklistRepository.getItems();
		set({ items, isLoaded: true });
	},

	addTopLevelItem(text) {
		const { tree, newItem } = quickToDoChecklistTree.appendTopLevelItem(get().items, text);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
		return newItem.id;
	},

	insertItemBeforeOrAfter(itemID, position) {
		const { tree, newItem } = quickToDoChecklistTree.insertSiblingRelativeToItem(get().items, itemID, position, '');
		set({ items: tree });
		persistQuickToDoChecklist(tree);
		return newItem.id;
	},

	editItemText(itemID, text) {
		const tree = quickToDoChecklistTree.editItemText(get().items, itemID, text);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	toggleItemChecked(itemID) {
		const tree = quickToDoChecklistTree.toggleItemChecked(get().items, itemID);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	setItemChecked(itemID, isChecked) {
		const tree = quickToDoChecklistTree.setItemChecked(get().items, itemID, isChecked);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	checkItemAndPrecedingItems(itemID) {
		const items = get().items;
		const flattened = quickToDoChecklistTree.flattenForDisplay(items);
		const targetIndex = flattened.findIndex(flattened => flattened.item.id === itemID);
		if (targetIndex === -1) return;

		let tree = items;
		for (let i = 0; i <= targetIndex; i++) {
			tree = quickToDoChecklistTree.setItemChecked(tree, flattened[i].item.id, true);
		}
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	uncheckItemAndFollowingItems(itemID) {
		const items = get().items;
		const flattened = quickToDoChecklistTree.flattenForDisplay(items);
		const targetIndex = flattened.findIndex(flattened => flattened.item.id === itemID);
		if (targetIndex === -1) return;

		let tree = items;
		for (let i = targetIndex; i < flattened.length; i++) {
			tree = quickToDoChecklistTree.setItemChecked(tree, flattened[i].item.id, false);
		}
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	insertItemsFromPastedLines(itemID, lines) {
		if (lines.length === 0) return [];

		const items = get().items;
		const current = quickToDoChecklistTree.findItemWithParent(items, itemID)?.item;
		if (!current) return [];

		if (current.text.trim() === '') {
			const [firstLine, ...remainingLines] = lines;
			let tree = quickToDoChecklistTree.editItemText(items, itemID, firstLine);
			let newItems: QuickToDoChecklistItem[] = [];
			if (remainingLines.length > 0) {
				const result = quickToDoChecklistTree.insertSiblingsAfterItem(tree, itemID, remainingLines);
				tree = result.tree;
				newItems = result.newItems;
			}
			set({ items: tree });
			persistQuickToDoChecklist(tree);
			return newItems.map(item => item.id);
		}

		const { tree, newItems } = quickToDoChecklistTree.insertSiblingsAfterItem(items, itemID, lines);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
		return newItems.map(item => item.id);
	},

	deleteItem(itemID) {
		const tree = quickToDoChecklistTree.deleteItem(get().items, itemID);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	deleteCheckedItems() {
		const tree = quickToDoChecklistTree.deleteCheckedItems(get().items);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	indentItem(itemID) {
		const tree = quickToDoChecklistTree.indentItem(get().items, itemID);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	unindentItem(itemID) {
		const tree = quickToDoChecklistTree.unindentItem(get().items, itemID);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	moveItemUp(itemID) {
		const tree = quickToDoChecklistTree.moveItemAmongSiblings(get().items, itemID, 'up');
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	moveItemDown(itemID) {
		const tree = quickToDoChecklistTree.moveItemAmongSiblings(get().items, itemID, 'down');
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	reparentAndReorderItem(itemID, newParentID, newIndexAmongSiblings) {
		const items = get().items;
		if (itemID === newParentID) return;
		if (newParentID !== null && quickToDoChecklistTree.isDescendant(items, itemID, newParentID)) return;

		const tree = quickToDoChecklistTree.reparentAndReorderItem(items, itemID, newParentID, newIndexAmongSiblings);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
	},

	async importQuickToDoChecklist(items) {
		set({ items });
		await persistQuickToDoChecklist(items);
	},
}));

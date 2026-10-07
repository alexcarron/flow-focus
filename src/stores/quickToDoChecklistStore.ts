import { create } from 'zustand';
import QuickToDoChecklistItem from '../model/quickToDoChecklist/QuickToDoChecklistItem';
import * as quickToDoChecklistTree from '../model/quickToDoChecklist/quickToDoChecklistTree';
import { getActiveRepositories } from '../persistence/activeRepositories';
import { PastedListItem } from '../utilities/parsePastedTextIntoNestedListItems';

interface QuickToDoChecklistState {
	items: QuickToDoChecklistItem[];
	isLoaded: boolean;
}

interface QuickToDoChecklistActions {
	loadQuickToDoChecklist: () => Promise<void>;
	addTopLevelItem: (text: string) => string;
	addTopLevelItemsFromPastedListItems: (pastedListItems: PastedListItem[]) => string[];
	insertItemBeforeOrAfter: (itemID: string, position: 'before' | 'after') => string;
	editItemText: (itemID: string, text: string) => void;
	toggleItemChecked: (itemID: string) => void;
	setItemChecked: (itemID: string, isChecked: boolean) => void;
	checkItemAndPrecedingItems: (itemID: string) => void;
	uncheckItemAndFollowingItems: (itemID: string) => void;
	insertItemsFromPastedListItems: (itemID: string, pastedListItems: PastedListItem[]) => string[];
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
	await getActiveRepositories().quickToDoChecklistRepository.save(items);
}

export const useQuickToDoChecklistStore = create<QuickToDoChecklistState & QuickToDoChecklistActions>()((set, get) => ({
	items: [],
	isLoaded: false,

	async loadQuickToDoChecklist() {
		const items = await getActiveRepositories().quickToDoChecklistRepository.getItems();
		set({ items, isLoaded: true });
	},

	addTopLevelItem(text) {
		const { tree, newItem } = quickToDoChecklistTree.appendTopLevelItem(get().items, text);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
		return newItem.id;
	},

	addTopLevelItemsFromPastedListItems(pastedListItems) {
		const { tree, newItemIDs } = quickToDoChecklistTree.appendTopLevelItemsFromPastedListItems(get().items, pastedListItems);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
		return newItemIDs;
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

	insertItemsFromPastedListItems(itemID, pastedListItems) {
		const { tree, newItemIDs } = quickToDoChecklistTree.insertItemsFromPastedListItems(get().items, itemID, pastedListItems);
		set({ items: tree });
		persistQuickToDoChecklist(tree);
		return newItemIDs;
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

import { create } from 'zustand';
import ChecklistItem from '../model/checklist/ChecklistItem';
import * as checklistTree from '../model/checklist/checklistTree';
import { db } from '../db/flowfocus.db';

const CHECKLIST_ID = 1;

interface ChecklistState {
	items: ChecklistItem[];
	isLoaded: boolean;
}

interface ChecklistActions {
	loadChecklist: () => Promise<void>;
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
	importChecklist: (items: ChecklistItem[]) => Promise<void>;
}

async function persistChecklist(items: ChecklistItem[]): Promise<void> {
	await db.checklist.put({ id: CHECKLIST_ID, items });
}

export const useChecklistStore = create<ChecklistState & ChecklistActions>()((set, get) => ({
	items: [],
	isLoaded: false,

	async loadChecklist() {
		const row = await db.checklist.get(CHECKLIST_ID);
		set({ items: row?.items ?? [], isLoaded: true });
	},

	addTopLevelItem(text) {
		const { tree, newItem } = checklistTree.appendTopLevelItem(get().items, text);
		set({ items: tree });
		persistChecklist(tree);
		return newItem.id;
	},

	insertItemBeforeOrAfter(itemID, position) {
		const { tree, newItem } = checklistTree.insertSiblingRelativeToItem(get().items, itemID, position, '');
		set({ items: tree });
		persistChecklist(tree);
		return newItem.id;
	},

	editItemText(itemID, text) {
		const tree = checklistTree.editItemText(get().items, itemID, text);
		set({ items: tree });
		persistChecklist(tree);
	},

	toggleItemChecked(itemID) {
		const tree = checklistTree.toggleItemChecked(get().items, itemID);
		set({ items: tree });
		persistChecklist(tree);
	},

	setItemChecked(itemID, isChecked) {
		const tree = checklistTree.setItemChecked(get().items, itemID, isChecked);
		set({ items: tree });
		persistChecklist(tree);
	},

	checkItemAndPrecedingItems(itemID) {
		const items = get().items;
		const flattened = checklistTree.flattenForDisplay(items);
		const targetIndex = flattened.findIndex(flattened => flattened.item.id === itemID);
		if (targetIndex === -1) return;

		let tree = items;
		for (let i = 0; i <= targetIndex; i++) {
			tree = checklistTree.setItemChecked(tree, flattened[i].item.id, true);
		}
		set({ items: tree });
		persistChecklist(tree);
	},

	uncheckItemAndFollowingItems(itemID) {
		const items = get().items;
		const flattened = checklistTree.flattenForDisplay(items);
		const targetIndex = flattened.findIndex(flattened => flattened.item.id === itemID);
		if (targetIndex === -1) return;

		let tree = items;
		for (let i = targetIndex; i < flattened.length; i++) {
			tree = checklistTree.setItemChecked(tree, flattened[i].item.id, false);
		}
		set({ items: tree });
		persistChecklist(tree);
	},

	insertItemsFromPastedLines(itemID, lines) {
		if (lines.length === 0) return [];

		const items = get().items;
		const current = checklistTree.findItemWithParent(items, itemID)?.item;
		if (!current) return [];

		if (current.text.trim() === '') {
			const [firstLine, ...remainingLines] = lines;
			let tree = checklistTree.editItemText(items, itemID, firstLine);
			let newItems: ChecklistItem[] = [];
			if (remainingLines.length > 0) {
				const result = checklistTree.insertSiblingsAfterItem(tree, itemID, remainingLines);
				tree = result.tree;
				newItems = result.newItems;
			}
			set({ items: tree });
			persistChecklist(tree);
			return newItems.map(item => item.id);
		}

		const { tree, newItems } = checklistTree.insertSiblingsAfterItem(items, itemID, lines);
		set({ items: tree });
		persistChecklist(tree);
		return newItems.map(item => item.id);
	},

	deleteItem(itemID) {
		const tree = checklistTree.deleteItem(get().items, itemID);
		set({ items: tree });
		persistChecklist(tree);
	},

	deleteCheckedItems() {
		const tree = checklistTree.deleteCheckedItems(get().items);
		set({ items: tree });
		persistChecklist(tree);
	},

	indentItem(itemID) {
		const tree = checklistTree.indentItem(get().items, itemID);
		set({ items: tree });
		persistChecklist(tree);
	},

	unindentItem(itemID) {
		const tree = checklistTree.unindentItem(get().items, itemID);
		set({ items: tree });
		persistChecklist(tree);
	},

	moveItemUp(itemID) {
		const tree = checklistTree.moveItemAmongSiblings(get().items, itemID, 'up');
		set({ items: tree });
		persistChecklist(tree);
	},

	moveItemDown(itemID) {
		const tree = checklistTree.moveItemAmongSiblings(get().items, itemID, 'down');
		set({ items: tree });
		persistChecklist(tree);
	},

	reparentAndReorderItem(itemID, newParentID, newIndexAmongSiblings) {
		const items = get().items;
		if (itemID === newParentID) return;
		if (newParentID !== null && checklistTree.isDescendant(items, itemID, newParentID)) return;

		const tree = checklistTree.reparentAndReorderItem(items, itemID, newParentID, newIndexAmongSiblings);
		set({ items: tree });
		persistChecklist(tree);
	},

	async importChecklist(items) {
		set({ items });
		await persistChecklist(items);
	},
}));

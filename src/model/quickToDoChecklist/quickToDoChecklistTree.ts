import QuickToDoChecklistItem from './QuickToDoChecklistItem';
import {
	appendRootNode,
	deleteNode,
	findNodeWithParent,
	flattenForDisplay as flattenTreeForDisplay,
	getSiblings as getTreeSiblings,
	getSubtreeIDsIncludingSelf as getTreeSubtreeIDsIncludingSelf,
	indentNode,
	insertSiblingRelativeToNode,
	insertSiblingsAfterNode,
	isDescendant as isTreeDescendant,
	mapNode,
	moveNodeAmongSiblings,
	reparentAndReorderNode,
	unindentNode,
} from '../../utilities/tree/orderedTree';

export interface FlattenedQuickToDoChecklistItem {
	item: QuickToDoChecklistItem;
	depth: number;
	parentID: string | null;
}

export function createQuickToDoChecklistItem(text: string): QuickToDoChecklistItem {
	return { id: crypto.randomUUID(), text, isChecked: false, children: [] };
}

export function findItemWithParent(tree: QuickToDoChecklistItem[], itemID: string): { item: QuickToDoChecklistItem; parentID: string | null } | null {
	const found = findNodeWithParent(tree, itemID);
	return found === null ? null : { item: found.node, parentID: found.parentID };
}

export function getSiblings(tree: QuickToDoChecklistItem[], parentID: string | null): QuickToDoChecklistItem[] {
	return getTreeSiblings(tree, parentID);
}

export function getSubtreeIDsIncludingSelf(tree: QuickToDoChecklistItem[], itemID: string): Set<string> {
	return getTreeSubtreeIDsIncludingSelf(tree, itemID);
}

export function isDescendant(tree: QuickToDoChecklistItem[], ancestorID: string, candidateID: string): boolean {
	return isTreeDescendant(tree, ancestorID, candidateID);
}

export function flattenForDisplay(tree: QuickToDoChecklistItem[]): FlattenedQuickToDoChecklistItem[] {
	return flattenTreeForDisplay(tree).map(flattened => ({ item: flattened.node, depth: flattened.depth, parentID: flattened.parentID }));
}

function setCheckedRecursively(item: QuickToDoChecklistItem, isChecked: boolean): QuickToDoChecklistItem {
	return { ...item, isChecked, children: item.children.map(child => setCheckedRecursively(child, isChecked)) };
}

export function toggleItemChecked(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	return mapNode(tree, itemID, item => setCheckedRecursively(item, !item.isChecked));
}

export function setItemChecked(tree: QuickToDoChecklistItem[], itemID: string, isChecked: boolean): QuickToDoChecklistItem[] {
	return mapNode(tree, itemID, item => setCheckedRecursively(item, isChecked));
}

export function editItemText(tree: QuickToDoChecklistItem[], itemID: string, text: string): QuickToDoChecklistItem[] {
	return mapNode(tree, itemID, item => ({ ...item, text }));
}

export function deleteItem(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	return deleteNode(tree, itemID);
}

export function hasAnyCheckedItem(tree: QuickToDoChecklistItem[]): boolean {
	return tree.some(item => item.isChecked || hasAnyCheckedItem(item.children));
}

export function deleteCheckedItems(tree: QuickToDoChecklistItem[]): QuickToDoChecklistItem[] {
	function recurse(items: QuickToDoChecklistItem[]): QuickToDoChecklistItem[] {
		const result: QuickToDoChecklistItem[] = [];
		for (const item of items) {
			const newChildren = recurse(item.children);
			if (item.isChecked) result.push(...newChildren);
			else result.push({ ...item, children: newChildren });
		}
		return result;
	}
	return recurse(tree);
}

export function appendTopLevelItem(tree: QuickToDoChecklistItem[], text: string): { tree: QuickToDoChecklistItem[]; newItem: QuickToDoChecklistItem } {
	const newItem = createQuickToDoChecklistItem(text);
	return { tree: appendRootNode(tree, newItem), newItem };
}

export function insertSiblingRelativeToItem(tree: QuickToDoChecklistItem[], itemID: string, position: 'before' | 'after', text: string): { tree: QuickToDoChecklistItem[]; newItem: QuickToDoChecklistItem } {
	const newItem = createQuickToDoChecklistItem(text);
	return { tree: insertSiblingRelativeToNode(tree, itemID, position, newItem), newItem };
}

export function insertSiblingsAfterItem(tree: QuickToDoChecklistItem[], itemID: string, texts: string[]): { tree: QuickToDoChecklistItem[]; newItems: QuickToDoChecklistItem[] } {
	const newItems = texts.map(createQuickToDoChecklistItem);
	return { tree: insertSiblingsAfterNode(tree, itemID, newItems), newItems };
}

export function indentItem(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	return indentNode(tree, itemID);
}

export function unindentItem(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	return unindentNode(tree, itemID);
}

export function moveItemAmongSiblings(tree: QuickToDoChecklistItem[], itemID: string, direction: 'up' | 'down'): QuickToDoChecklistItem[] {
	return moveNodeAmongSiblings(tree, itemID, direction);
}

export function reparentAndReorderItem(tree: QuickToDoChecklistItem[], draggedItemID: string, newParentID: string | null, newIndexAmongSiblings: number): QuickToDoChecklistItem[] {
	return reparentAndReorderNode(tree, draggedItemID, newParentID, newIndexAmongSiblings);
}

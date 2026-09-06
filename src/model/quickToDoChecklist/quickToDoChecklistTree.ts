import QuickToDoChecklistItem from './QuickToDoChecklistItem';

export interface FlattenedQuickToDoChecklistItem {
	item: QuickToDoChecklistItem;
	depth: number;
	parentID: string | null;
}

export function createQuickToDoChecklistItem(text: string): QuickToDoChecklistItem {
	return { id: crypto.randomUUID(), text, isChecked: false, children: [] };
}

export function findItemWithParent(tree: QuickToDoChecklistItem[], itemID: string, parentID: string | null = null): { item: QuickToDoChecklistItem; parentID: string | null } | null {
	for (const item of tree) {
		if (item.id === itemID) return { item, parentID };
		const found = findItemWithParent(item.children, itemID, item.id);
		if (found) return found;
	}
	return null;
}

export function getSiblings(tree: QuickToDoChecklistItem[], parentID: string | null): QuickToDoChecklistItem[] {
	if (parentID === null) return tree;
	return findItemWithParent(tree, parentID)?.item.children ?? [];
}

export function getSubtreeIDsIncludingSelf(tree: QuickToDoChecklistItem[], itemID: string): Set<string> {
	const ids = new Set<string>();
	const item = findItemWithParent(tree, itemID)?.item;
	if (!item) return ids;

	function collect(item: QuickToDoChecklistItem) {
		ids.add(item.id);
		item.children.forEach(collect);
	}
	collect(item);
	return ids;
}

export function isDescendant(tree: QuickToDoChecklistItem[], ancestorID: string, candidateID: string): boolean {
	const ancestor = findItemWithParent(tree, ancestorID)?.item;
	if (!ancestor) return false;

	function search(items: QuickToDoChecklistItem[]): boolean {
		return items.some(item => item.id === candidateID || search(item.children));
	}
	return search(ancestor.children);
}

export function flattenForDisplay(tree: QuickToDoChecklistItem[]): FlattenedQuickToDoChecklistItem[] {
	const result: FlattenedQuickToDoChecklistItem[] = [];

	function recurse(items: QuickToDoChecklistItem[], depth: number, parentID: string | null) {
		for (const item of items) {
			result.push({ item, depth, parentID });
			recurse(item.children, depth + 1, item.id);
		}
	}
	recurse(tree, 0, null);
	return result;
}

function mapItem(tree: QuickToDoChecklistItem[], itemID: string, transform: (item: QuickToDoChecklistItem) => QuickToDoChecklistItem): QuickToDoChecklistItem[] {
	return tree.map(item => {
		if (item.id === itemID) return transform(item);
		return { ...item, children: mapItem(item.children, itemID, transform) };
	});
}

function setCheckedRecursively(item: QuickToDoChecklistItem, isChecked: boolean): QuickToDoChecklistItem {
	return { ...item, isChecked, children: item.children.map(child => setCheckedRecursively(child, isChecked)) };
}

export function toggleItemChecked(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	return mapItem(tree, itemID, item => setCheckedRecursively(item, !item.isChecked));
}

export function setItemChecked(tree: QuickToDoChecklistItem[], itemID: string, isChecked: boolean): QuickToDoChecklistItem[] {
	return mapItem(tree, itemID, item => setCheckedRecursively(item, isChecked));
}

export function editItemText(tree: QuickToDoChecklistItem[], itemID: string, text: string): QuickToDoChecklistItem[] {
	return mapItem(tree, itemID, item => ({ ...item, text }));
}

function removeItemWithSubtree(tree: QuickToDoChecklistItem[], itemID: string): { tree: QuickToDoChecklistItem[]; removed: QuickToDoChecklistItem | null } {
	let removed: QuickToDoChecklistItem | null = null;

	function recurse(items: QuickToDoChecklistItem[]): QuickToDoChecklistItem[] {
		const filtered: QuickToDoChecklistItem[] = [];
		for (const item of items) {
			if (item.id === itemID) {
				removed = item;
				continue;
			}
			filtered.push({ ...item, children: recurse(item.children) });
		}
		return filtered;
	}

	const newTree = recurse(tree);
	return { tree: newTree, removed };
}

export function deleteItem(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	return removeItemWithSubtree(tree, itemID).tree;
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
	return { tree: [...tree, newItem], newItem };
}

export function insertSiblingRelativeToItem(tree: QuickToDoChecklistItem[], itemID: string, position: 'before' | 'after', text: string): { tree: QuickToDoChecklistItem[]; newItem: QuickToDoChecklistItem } {
	const newItem = createQuickToDoChecklistItem(text);

	function recurse(items: QuickToDoChecklistItem[]): QuickToDoChecklistItem[] {
		const index = items.findIndex(item => item.id === itemID);
		if (index !== -1) {
			const insertAt = position === 'before' ? index : index + 1;
			return [...items.slice(0, insertAt), newItem, ...items.slice(insertAt)];
		}
		return items.map(item => ({ ...item, children: recurse(item.children) }));
	}

	return { tree: recurse(tree), newItem };
}

export function insertSiblingsAfterItem(tree: QuickToDoChecklistItem[], itemID: string, texts: string[]): { tree: QuickToDoChecklistItem[]; newItems: QuickToDoChecklistItem[] } {
	const newItems = texts.map(createQuickToDoChecklistItem);

	function recurse(items: QuickToDoChecklistItem[]): QuickToDoChecklistItem[] {
		const index = items.findIndex(item => item.id === itemID);
		if (index !== -1) {
			return [...items.slice(0, index + 1), ...newItems, ...items.slice(index + 1)];
		}
		return items.map(item => ({ ...item, children: recurse(item.children) }));
	}

	return { tree: recurse(tree), newItems };
}

export function indentItem(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	function recurse(items: QuickToDoChecklistItem[]): { items: QuickToDoChecklistItem[]; didIndent: boolean } {
		const index = items.findIndex(item => item.id === itemID);
		if (index !== -1) {
			if (index === 0) return { items, didIndent: false };
			const itemToMove = items[index];
			const previousSibling = items[index - 1];
			const newPreviousSibling = { ...previousSibling, children: [...previousSibling.children, itemToMove] };
			return { items: [...items.slice(0, index - 1), newPreviousSibling, ...items.slice(index + 1)], didIndent: true };
		}

		let didIndent = false;
		const newItems = items.map(item => {
			if (didIndent) return item;
			const result = recurse(item.children);
			if (result.didIndent) {
				didIndent = true;
				return { ...item, children: result.items };
			}
			return item;
		});
		return { items: newItems, didIndent };
	}

	return recurse(tree).items;
}

export function unindentItem(tree: QuickToDoChecklistItem[], itemID: string): QuickToDoChecklistItem[] {
	function recurse(siblingsArray: QuickToDoChecklistItem[]): { items: QuickToDoChecklistItem[]; didUnindent: boolean } {
		for (let i = 0; i < siblingsArray.length; i++) {
			const parentCandidate = siblingsArray[i];
			const childIndex = parentCandidate.children.findIndex(child => child.id === itemID);
			if (childIndex !== -1) {
				const hoistedItem = parentCandidate.children[childIndex];
				const newParentChildren = [...parentCandidate.children.slice(0, childIndex), ...parentCandidate.children.slice(childIndex + 1)];
				const newParent = { ...parentCandidate, children: newParentChildren };
				return { items: [...siblingsArray.slice(0, i), newParent, hoistedItem, ...siblingsArray.slice(i + 1)], didUnindent: true };
			}
		}

		let didUnindent = false;
		const newSiblingsArray = siblingsArray.map(item => {
			if (didUnindent) return item;
			const result = recurse(item.children);
			if (result.didUnindent) {
				didUnindent = true;
				return { ...item, children: result.items };
			}
			return item;
		});
		return { items: newSiblingsArray, didUnindent };
	}

	return recurse(tree).items;
}

export function moveItemAmongSiblings(tree: QuickToDoChecklistItem[], itemID: string, direction: 'up' | 'down'): QuickToDoChecklistItem[] {
	function recurse(items: QuickToDoChecklistItem[]): { items: QuickToDoChecklistItem[]; didMove: boolean } {
		const index = items.findIndex(item => item.id === itemID);
		if (index !== -1) {
			const targetIndex = direction === 'up' ? index - 1 : index + 1;
			if (targetIndex < 0 || targetIndex >= items.length) return { items, didMove: false };
			const newItems = [...items];
			[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
			return { items: newItems, didMove: true };
		}

		let didMove = false;
		const newItems = items.map(item => {
			if (didMove) return item;
			const result = recurse(item.children);
			if (result.didMove) {
				didMove = true;
				return { ...item, children: result.items };
			}
			return item;
		});
		return { items: newItems, didMove };
	}

	return recurse(tree).items;
}

function insertIntoChildrenOf(tree: QuickToDoChecklistItem[], parentID: string, itemToInsert: QuickToDoChecklistItem, index: number): QuickToDoChecklistItem[] {
	return tree.map(item => {
		if (item.id === parentID) {
			const children = [...item.children.slice(0, index), itemToInsert, ...item.children.slice(index)];
			return { ...item, children };
		}
		return { ...item, children: insertIntoChildrenOf(item.children, parentID, itemToInsert, index) };
	});
}

export function reparentAndReorderItem(tree: QuickToDoChecklistItem[], draggedItemID: string, newParentID: string | null, newIndexAmongSiblings: number): QuickToDoChecklistItem[] {
	const { tree: treeWithoutDragged, removed } = removeItemWithSubtree(tree, draggedItemID);
	if (!removed) return tree;

	if (newParentID === null) {
		return [...treeWithoutDragged.slice(0, newIndexAmongSiblings), removed, ...treeWithoutDragged.slice(newIndexAmongSiblings)];
	}
	return insertIntoChildrenOf(treeWithoutDragged, newParentID, removed, newIndexAmongSiblings);
}

import ChecklistItem from './ChecklistItem';

export interface FlattenedChecklistItem {
	item: ChecklistItem;
	depth: number;
	parentID: string | null;
}

export function createChecklistItem(text: string): ChecklistItem {
	return { id: crypto.randomUUID(), text, isChecked: false, children: [] };
}

export function findItemWithParent(tree: ChecklistItem[], itemID: string, parentID: string | null = null): { item: ChecklistItem; parentID: string | null } | null {
	for (const item of tree) {
		if (item.id === itemID) return { item, parentID };
		const found = findItemWithParent(item.children, itemID, item.id);
		if (found) return found;
	}
	return null;
}

export function getSiblings(tree: ChecklistItem[], parentID: string | null): ChecklistItem[] {
	if (parentID === null) return tree;
	return findItemWithParent(tree, parentID)?.item.children ?? [];
}

export function getSubtreeIDsIncludingSelf(tree: ChecklistItem[], itemID: string): Set<string> {
	const ids = new Set<string>();
	const item = findItemWithParent(tree, itemID)?.item;
	if (!item) return ids;

	function collect(item: ChecklistItem) {
		ids.add(item.id);
		item.children.forEach(collect);
	}
	collect(item);
	return ids;
}

export function isDescendant(tree: ChecklistItem[], ancestorID: string, candidateID: string): boolean {
	const ancestor = findItemWithParent(tree, ancestorID)?.item;
	if (!ancestor) return false;

	function search(items: ChecklistItem[]): boolean {
		return items.some(item => item.id === candidateID || search(item.children));
	}
	return search(ancestor.children);
}

export function flattenForDisplay(tree: ChecklistItem[]): FlattenedChecklistItem[] {
	const result: FlattenedChecklistItem[] = [];

	function recurse(items: ChecklistItem[], depth: number, parentID: string | null) {
		for (const item of items) {
			result.push({ item, depth, parentID });
			recurse(item.children, depth + 1, item.id);
		}
	}
	recurse(tree, 0, null);
	return result;
}

function mapItem(tree: ChecklistItem[], itemID: string, transform: (item: ChecklistItem) => ChecklistItem): ChecklistItem[] {
	return tree.map(item => {
		if (item.id === itemID) return transform(item);
		return { ...item, children: mapItem(item.children, itemID, transform) };
	});
}

function setCheckedRecursively(item: ChecklistItem, isChecked: boolean): ChecklistItem {
	return { ...item, isChecked, children: item.children.map(child => setCheckedRecursively(child, isChecked)) };
}

export function toggleItemChecked(tree: ChecklistItem[], itemID: string): ChecklistItem[] {
	return mapItem(tree, itemID, item => setCheckedRecursively(item, !item.isChecked));
}

export function setItemChecked(tree: ChecklistItem[], itemID: string, isChecked: boolean): ChecklistItem[] {
	return mapItem(tree, itemID, item => setCheckedRecursively(item, isChecked));
}

export function editItemText(tree: ChecklistItem[], itemID: string, text: string): ChecklistItem[] {
	return mapItem(tree, itemID, item => ({ ...item, text }));
}

function removeItemWithSubtree(tree: ChecklistItem[], itemID: string): { tree: ChecklistItem[]; removed: ChecklistItem | null } {
	let removed: ChecklistItem | null = null;

	function recurse(items: ChecklistItem[]): ChecklistItem[] {
		const filtered: ChecklistItem[] = [];
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

export function deleteItem(tree: ChecklistItem[], itemID: string): ChecklistItem[] {
	return removeItemWithSubtree(tree, itemID).tree;
}

export function appendTopLevelItem(tree: ChecklistItem[], text: string): { tree: ChecklistItem[]; newItem: ChecklistItem } {
	const newItem = createChecklistItem(text);
	return { tree: [...tree, newItem], newItem };
}

export function insertSiblingRelativeToItem(tree: ChecklistItem[], itemID: string, position: 'before' | 'after', text: string): { tree: ChecklistItem[]; newItem: ChecklistItem } {
	const newItem = createChecklistItem(text);

	function recurse(items: ChecklistItem[]): ChecklistItem[] {
		const index = items.findIndex(item => item.id === itemID);
		if (index !== -1) {
			const insertAt = position === 'before' ? index : index + 1;
			return [...items.slice(0, insertAt), newItem, ...items.slice(insertAt)];
		}
		return items.map(item => ({ ...item, children: recurse(item.children) }));
	}

	return { tree: recurse(tree), newItem };
}

export function insertSiblingsAfterItem(tree: ChecklistItem[], itemID: string, texts: string[]): { tree: ChecklistItem[]; newItems: ChecklistItem[] } {
	const newItems = texts.map(createChecklistItem);

	function recurse(items: ChecklistItem[]): ChecklistItem[] {
		const index = items.findIndex(item => item.id === itemID);
		if (index !== -1) {
			return [...items.slice(0, index + 1), ...newItems, ...items.slice(index + 1)];
		}
		return items.map(item => ({ ...item, children: recurse(item.children) }));
	}

	return { tree: recurse(tree), newItems };
}

export function indentItem(tree: ChecklistItem[], itemID: string): ChecklistItem[] {
	function recurse(items: ChecklistItem[]): { items: ChecklistItem[]; didIndent: boolean } {
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

export function unindentItem(tree: ChecklistItem[], itemID: string): ChecklistItem[] {
	function recurse(siblingsArray: ChecklistItem[]): { items: ChecklistItem[]; didUnindent: boolean } {
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

export function moveItemAmongSiblings(tree: ChecklistItem[], itemID: string, direction: 'up' | 'down'): ChecklistItem[] {
	function recurse(items: ChecklistItem[]): { items: ChecklistItem[]; didMove: boolean } {
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

function insertIntoChildrenOf(tree: ChecklistItem[], parentID: string, itemToInsert: ChecklistItem, index: number): ChecklistItem[] {
	return tree.map(item => {
		if (item.id === parentID) {
			const children = [...item.children.slice(0, index), itemToInsert, ...item.children.slice(index)];
			return { ...item, children };
		}
		return { ...item, children: insertIntoChildrenOf(item.children, parentID, itemToInsert, index) };
	});
}

export function reparentAndReorderItem(tree: ChecklistItem[], draggedItemID: string, newParentID: string | null, newIndexAmongSiblings: number): ChecklistItem[] {
	const { tree: treeWithoutDragged, removed } = removeItemWithSubtree(tree, draggedItemID);
	if (!removed) return tree;

	if (newParentID === null) {
		return [...treeWithoutDragged.slice(0, newIndexAmongSiblings), removed, ...treeWithoutDragged.slice(newIndexAmongSiblings)];
	}
	return insertIntoChildrenOf(treeWithoutDragged, newParentID, removed, newIndexAmongSiblings);
}

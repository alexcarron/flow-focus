import QuickToDoChecklistItem from './QuickToDoChecklistItem';
import {
	appendTopLevelItem,
	appendTopLevelItemsFromPastedListItems,
	deleteItem,
	editItemText,
	findItemWithParent,
	flattenForDisplay,
	indentItem,
	insertItemsFromPastedListItems,
	insertSiblingRelativeToItem,
	isDescendant,
	moveItemAmongSiblings,
	unindentItem,
	reparentAndReorderItem,
	toggleItemChecked,
} from './quickToDoChecklistTree';
import parsePastedTextIntoNestedListItems from '../../utilities/parsePastedTextIntoNestedListItems';

function makeItem(id: string, children: QuickToDoChecklistItem[] = []): QuickToDoChecklistItem {
	return { id, text: id, isChecked: false, children };
}

function ids(tree: QuickToDoChecklistItem[]): string[] {
	return tree.map(item => item.id);
}

describe('quickToDoChecklistTree', () => {
	describe('appendTopLevelItem', () => {
		it('adds a new item to the end of the top-level list', () => {
			const tree = [makeItem('a')];
			const { tree: newTree, newItem } = appendTopLevelItem(tree, 'b');
			expect(ids(newTree)).toEqual(['a', newItem.id]);
			expect(newItem.text).toBe('b');
		});
	});

	describe('insertSiblingRelativeToItem', () => {
		it('inserts before the target item', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const { tree: newTree, newItem } = insertSiblingRelativeToItem(tree, 'b', 'before', '');
			expect(ids(newTree)).toEqual(['a', newItem.id, 'b']);
		});

		it('inserts after the target item', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const { tree: newTree, newItem } = insertSiblingRelativeToItem(tree, 'a', 'after', '');
			expect(ids(newTree)).toEqual(['a', newItem.id, 'b']);
		});

		it('inserts next to a nested item', () => {
			const tree = [makeItem('a', [makeItem('a1')])];
			const { tree: newTree, newItem } = insertSiblingRelativeToItem(tree, 'a1', 'after', '');
			expect(ids(newTree[0].children)).toEqual(['a1', newItem.id]);
		});
	});

	describe('insertItemsFromPastedListItems', () => {
		const pastedListItems = parsePastedTextIntoNestedListItems('- [x] Pack\n  - [x] Clothes\n  - [ ] Charger\n- [ ] Leave');

		it('inserts pasted items, nesting and checked state included, right after the item', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const { tree: newTree, newItemIDs } = insertItemsFromPastedListItems(tree, 'a', pastedListItems);
			expect(newTree.map(item => item.text)).toEqual(['a', 'Pack', 'Leave', 'b']);
			expect(newTree[1].isChecked).toBe(true);
			expect(newTree[1].children.map(item => [item.text, item.isChecked])).toEqual([['Clothes', true], ['Charger', false]]);
			expect(newItemIDs).toEqual([newTree[1].id, newTree[1].children[0].id, newTree[1].children[1].id, newTree[2].id]);
		});

		it('inserts pasted items at the same depth as a nested item', () => {
			const tree = [makeItem('a', [makeItem('a1')])];
			const { tree: newTree } = insertItemsFromPastedListItems(tree, 'a1', pastedListItems);
			expect(newTree[0].children.map(item => item.text)).toEqual(['a1', 'Pack', 'Leave']);
		});

		it('replaces a blank item with no children', () => {
			const tree = [makeItem('a'), { ...makeItem('blank'), text: '  ' }, makeItem('b')];
			const { tree: newTree } = insertItemsFromPastedListItems(tree, 'blank', pastedListItems);
			expect(newTree.map(item => item.text)).toEqual(['a', 'Pack', 'Leave', 'b']);
		});

		it('keeps a blank item that has children and inserts after it', () => {
			const tree = [{ ...makeItem('blank', [makeItem('child')]), text: '' }];
			const { tree: newTree } = insertItemsFromPastedListItems(tree, 'blank', pastedListItems);
			expect(newTree.map(item => item.text)).toEqual(['', 'Pack', 'Leave']);
		});
	});

	describe('appendTopLevelItemsFromPastedListItems', () => {
		it('adds pasted items, nesting included, to the end of the top-level list', () => {
			const tree = [makeItem('a')];
			const { tree: newTree, newItemIDs } = appendTopLevelItemsFromPastedListItems(tree, parsePastedTextIntoNestedListItems('- Pack\n  - Clothes'));
			expect(newTree.map(item => item.text)).toEqual(['a', 'Pack']);
			expect(newTree[1].children.map(item => item.text)).toEqual(['Clothes']);
			expect(newItemIDs).toEqual([newTree[1].id, newTree[1].children[0].id]);
		});
	});

	describe('toggleItemChecked', () => {
		it('checks an item and cascades to all descendants', () => {
			const tree = [makeItem('a', [makeItem('a1', [makeItem('a1a')])])];
			const newTree = toggleItemChecked(tree, 'a');
			expect(newTree[0].isChecked).toBe(true);
			expect(newTree[0].children[0].isChecked).toBe(true);
			expect(newTree[0].children[0].children[0].isChecked).toBe(true);
		});

		it('unchecks an item and cascades to all descendants', () => {
			const tree = [makeItem('a', [makeItem('a1')])];
			const checked = toggleItemChecked(tree, 'a');
			const unchecked = toggleItemChecked(checked, 'a');
			expect(unchecked[0].isChecked).toBe(false);
			expect(unchecked[0].children[0].isChecked).toBe(false);
		});
	});

	describe('editItemText', () => {
		it('changes only the target item text', () => {
			const tree = [makeItem('a', [makeItem('a1')])];
			const newTree = editItemText(tree, 'a1', 'new text');
			expect(newTree[0].children[0].text).toBe('new text');
			expect(newTree[0].text).toBe('a');
		});
	});

	describe('deleteItem', () => {
		it('removes a top-level item and its subtree', () => {
			const tree = [makeItem('a', [makeItem('a1')]), makeItem('b')];
			const newTree = deleteItem(tree, 'a');
			expect(ids(newTree)).toEqual(['b']);
		});

		it('removes a nested item', () => {
			const tree = [makeItem('a', [makeItem('a1'), makeItem('a2')])];
			const newTree = deleteItem(tree, 'a1');
			expect(ids(newTree[0].children)).toEqual(['a2']);
		});
	});

	describe('indentItem', () => {
		it('makes an item the last child of its previous sibling', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const newTree = indentItem(tree, 'b');
			expect(ids(newTree)).toEqual(['a']);
			expect(ids(newTree[0].children)).toEqual(['b']);
		});

		it('does nothing to the first item in a list', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const newTree = indentItem(tree, 'a');
			expect(ids(newTree)).toEqual(['a', 'b']);
		});
	});

	describe('unindentItem', () => {
		it('makes a nested item a sibling immediately after its parent', () => {
			const tree = [makeItem('a', [makeItem('a1')]), makeItem('b')];
			const newTree = unindentItem(tree, 'a1');
			expect(ids(newTree)).toEqual(['a', 'a1', 'b']);
			expect(newTree[0].children).toEqual([]);
		});

		it('does nothing to a top-level item', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const newTree = unindentItem(tree, 'a');
			expect(ids(newTree)).toEqual(['a', 'b']);
		});
	});

	describe('moveItemAmongSiblings', () => {
		it('moves an item up among its siblings', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const newTree = moveItemAmongSiblings(tree, 'b', 'up');
			expect(ids(newTree)).toEqual(['b', 'a']);
		});

		it('moves a nested item down among its siblings', () => {
			const tree = [makeItem('a', [makeItem('a1'), makeItem('a2')])];
			const newTree = moveItemAmongSiblings(tree, 'a1', 'down');
			expect(ids(newTree[0].children)).toEqual(['a2', 'a1']);
		});

		it('does nothing past the end of the list', () => {
			const tree = [makeItem('a'), makeItem('b')];
			const newTree = moveItemAmongSiblings(tree, 'b', 'down');
			expect(ids(newTree)).toEqual(['a', 'b']);
		});
	});

	describe('flattenForDisplay', () => {
		it('produces a depth-first ordering with depth and parent info', () => {
			const tree = [makeItem('a', [makeItem('a1')]), makeItem('b')];
			const flattened = flattenForDisplay(tree);
			expect(flattened.map(f => [f.item.id, f.depth, f.parentID])).toEqual([
				['a', 0, null],
				['a1', 1, 'a'],
				['b', 0, null],
			]);
		});
	});

	describe('findItemWithParent', () => {
		it('finds a nested item and its parent id', () => {
			const tree = [makeItem('a', [makeItem('a1')])];
			expect(findItemWithParent(tree, 'a1')).toEqual({ item: tree[0].children[0], parentID: 'a' });
		});

		it('returns null for a missing item', () => {
			const tree = [makeItem('a')];
			expect(findItemWithParent(tree, 'missing')).toBeNull();
		});
	});

	describe('isDescendant', () => {
		it('returns true for a nested descendant', () => {
			const tree = [makeItem('a', [makeItem('a1', [makeItem('a1a')])])];
			expect(isDescendant(tree, 'a', 'a1a')).toBe(true);
		});

		it('returns false for an unrelated item', () => {
			const tree = [makeItem('a', [makeItem('a1')]), makeItem('b')];
			expect(isDescendant(tree, 'a', 'b')).toBe(false);
		});
	});

	describe('reparentAndReorderItem', () => {
		it('moves an item, and its subtree, under a new parent', () => {
			const tree = [makeItem('a', [makeItem('a1')]), makeItem('b')];
			const newTree = reparentAndReorderItem(tree, 'a', 'b', 0);
			expect(ids(newTree)).toEqual(['b']);
			expect(ids(newTree[0].children)).toEqual(['a']);
			expect(ids(newTree[0].children[0].children)).toEqual(['a1']);
		});

		it('moves an item back to the top level at a given index', () => {
			const tree = [makeItem('a', [makeItem('a1')]), makeItem('b')];
			const newTree = reparentAndReorderItem(tree, 'a1', null, 0);
			expect(ids(newTree)).toEqual(['a1', 'a', 'b']);
		});
	});
});

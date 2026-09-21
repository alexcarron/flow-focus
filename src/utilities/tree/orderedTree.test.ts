import { describe, it, expect } from 'vitest';
import {
	OrderedTreeNode,
	findNodeWithParent,
	getSubtreeIDsIncludingSelf,
	flattenForDisplay,
	indentNode,
	canIndentNode,
	unindentNode,
	canUnindentNode,
	moveNodeAmongSiblings,
	reparentAndReorderNode,
} from './orderedTree';

interface TestNode extends OrderedTreeNode<TestNode> {
	id: string;
	label: string;
	children: TestNode[];
}

function node(id: string, children: TestNode[] = []): TestNode {
	return { id, label: `label-${id}`, children };
}

function collectAllLabelsByID(tree: TestNode[]): Record<string, string> {
	const labelByID: Record<string, string> = {};
	flattenForDisplay(tree).forEach(({ node: flattenedNode }) => {
		labelByID[flattenedNode.id] = flattenedNode.label;
	});
	return labelByID;
}

function collectAllIDs(tree: TestNode[]): string[] {
	return flattenForDisplay(tree).map(({ node: flattenedNode }) => flattenedNode.id);
}

describe('indentNode', () => {
	it('preserves every node label when indenting a flat sibling', () => {
		const tree = [node('a'), node('b'), node('c')];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = indentNode(tree, 'b');

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(findNodeWithParent(result, 'b')?.parentID).toBe('a');
	});

	it('does not indent the first sibling and leaves the tree structurally identical', () => {
		const tree = [node('a'), node('b')];
		const result = indentNode(tree, 'a');
		expect(collectAllIDs(result)).toEqual(['a', 'b']);
		expect(findNodeWithParent(result, 'a')?.parentID).toBeNull();
	});

	it('preserves grandchildren and their labels when indenting a node that already has children', () => {
		const tree = [node('a'), node('b', [node('b1'), node('b2')])];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = indentNode(tree, 'b');

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(findNodeWithParent(result, 'b')?.parentID).toBe('a');
		expect(findNodeWithParent(result, 'b1')?.parentID).toBe('b');
		expect(findNodeWithParent(result, 'b2')?.parentID).toBe('b');
	});

	it('preserves labels when indenting a deeply nested node', () => {
		const tree = [node('a', [node('a1'), node('a2', [node('a2x')])])];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = indentNode(tree, 'a2');

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(findNodeWithParent(result, 'a2')?.parentID).toBe('a1');
		expect(findNodeWithParent(result, 'a2x')?.parentID).toBe('a2');
	});

	it('canIndentNode is false for the first item at any depth and true otherwise', () => {
		const tree = [node('a', [node('a1'), node('a2')]), node('b')];
		expect(canIndentNode(tree, 'a')).toBe(false);
		expect(canIndentNode(tree, 'a1')).toBe(false);
		expect(canIndentNode(tree, 'a2')).toBe(true);
		expect(canIndentNode(tree, 'b')).toBe(true);
	});
});

describe('unindentNode', () => {
	it('preserves every node label when unindenting a nested child', () => {
		const tree = [node('a', [node('a1'), node('a2')])];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = unindentNode(tree, 'a1');

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(findNodeWithParent(result, 'a1')?.parentID).toBeNull();
		expect(findNodeWithParent(result, 'a2')?.parentID).toBe('a');
	});

	it('preserves a subtree being unindented, including its own children', () => {
		const tree = [node('a', [node('a1', [node('a1x'), node('a1y')]), node('a2')])];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = unindentNode(tree, 'a1');

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(findNodeWithParent(result, 'a1')?.parentID).toBeNull();
		expect(findNodeWithParent(result, 'a1x')?.parentID).toBe('a1');
		expect(findNodeWithParent(result, 'a1y')?.parentID).toBe('a1');
		expect(findNodeWithParent(result, 'a2')?.parentID).toBe('a');
	});

	it('is a no-op for a root node and canUnindentNode is false for it', () => {
		const tree = [node('a'), node('b')];
		expect(canUnindentNode(tree, 'a')).toBe(false);
		const result = unindentNode(tree, 'a');
		expect(collectAllIDs(result)).toEqual(['a', 'b']);
	});

	it('inserts the unindented node immediately after its former parent, before later siblings of that parent', () => {
		const tree = [node('a', [node('a1'), node('a2')]), node('b')];
		const result = unindentNode(tree, 'a1');
		expect(result.map(n => n.id)).toEqual(['a', 'a1', 'b']);
		expect(result[0].children.map(n => n.id)).toEqual(['a2']);
	});
});

describe('reparentAndReorderNode (drag and drop)', () => {
	it('preserves all labels when moving a leaf node to root level', () => {
		const tree = [node('a', [node('a1'), node('a2')]), node('b')];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = reparentAndReorderNode(tree, 'a1', null, 0);

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(result.map(n => n.id)).toEqual(['a1', 'a', 'b']);
		expect(findNodeWithParent(result, 'a1')?.parentID).toBeNull();
	});

	it('preserves an entire subtree, including grandchildren, when dragging a parent step to a new position', () => {
		const tree = [
			node('a', [node('a1'), node('a2', [node('a2x'), node('a2y')])]),
			node('b'),
			node('c'),
		];
		const labelsBefore = collectAllLabelsByID(tree);
		const subtreeIDsBefore = getSubtreeIDsIncludingSelf(tree, 'a');

		const result = reparentAndReorderNode(tree, 'a', null, 2);

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(getSubtreeIDsIncludingSelf(result, 'a')).toEqual(subtreeIDsBefore);
		expect(result.map(n => n.id)).toEqual(['b', 'c', 'a']);
		const movedNode = findNodeWithParent(result, 'a')?.node;
		expect(movedNode?.children.map(c => c.id)).toEqual(['a1', 'a2']);
		const nestedChild = findNodeWithParent(result, 'a2')?.node;
		expect(nestedChild?.children.map(c => c.id)).toEqual(['a2x', 'a2y']);
	});

	it('preserves a subtree when dragging a parent step to become a child of another node', () => {
		const tree = [
			node('a', [node('a1', [node('a1x')])]),
			node('b'),
		];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = reparentAndReorderNode(tree, 'a1', 'b', 0);

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(findNodeWithParent(result, 'a1')?.parentID).toBe('b');
		expect(findNodeWithParent(result, 'a1x')?.parentID).toBe('a1');
		expect(findNodeWithParent(result, 'a')?.node.children).toEqual([]);
	});

	it('preserves siblings and labels when reordering within the same parent', () => {
		const tree = [node('a', [node('a1'), node('a2'), node('a3')])];
		const labelsBefore = collectAllLabelsByID(tree);

		const result = reparentAndReorderNode(tree, 'a3', 'a', 0);

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		const parent = findNodeWithParent(result, 'a')?.node;
		expect(parent?.children.map(c => c.id)).toEqual(['a3', 'a1', 'a2']);
	});

	it('is a no-op if the dragged node id does not exist in the tree', () => {
		const tree = [node('a'), node('b')];
		const result = reparentAndReorderNode(tree, 'does-not-exist', null, 0);
		expect(result).toBe(tree);
	});

	it('preserves the full multi-level subtree of a deeply nested parent dragged across the tree', () => {
		const tree = [
			node('a', [
				node('a1', [
					node('a1a'),
					node('a1b', [node('a1b_i')]),
				]),
			]),
			node('b', [node('b1')]),
		];
		const labelsBefore = collectAllLabelsByID(tree);
		const subtreeIDsBefore = getSubtreeIDsIncludingSelf(tree, 'a1');

		const result = reparentAndReorderNode(tree, 'a1', 'b', 1);

		expect(collectAllLabelsByID(result)).toEqual(labelsBefore);
		expect(getSubtreeIDsIncludingSelf(result, 'a1')).toEqual(subtreeIDsBefore);
		const newParent = findNodeWithParent(result, 'b')?.node;
		expect(newParent?.children.map(c => c.id)).toEqual(['b1', 'a1']);
		const movedNode = findNodeWithParent(result, 'a1')?.node;
		expect(movedNode?.children.map(c => c.id)).toEqual(['a1a', 'a1b']);
		expect(findNodeWithParent(result, 'a1b')?.node.children.map(c => c.id)).toEqual(['a1b_i']);
		expect(findNodeWithParent(result, 'a')?.node.children).toEqual([]);
	});
});

describe('moveNodeAmongSiblings', () => {
	it('preserves labels when moving a node up and down among siblings', () => {
		const tree = [node('a'), node('b'), node('c')];
		const labelsBefore = collectAllLabelsByID(tree);

		const movedUp = moveNodeAmongSiblings(tree, 'b', 'up');
		expect(collectAllLabelsByID(movedUp)).toEqual(labelsBefore);
		expect(movedUp.map(n => n.id)).toEqual(['b', 'a', 'c']);

		const movedDown = moveNodeAmongSiblings(tree, 'b', 'down');
		expect(collectAllLabelsByID(movedDown)).toEqual(labelsBefore);
		expect(movedDown.map(n => n.id)).toEqual(['a', 'c', 'b']);
	});

	it('is a no-op past the boundaries of the sibling list', () => {
		const tree = [node('a'), node('b')];
		expect(moveNodeAmongSiblings(tree, 'a', 'up').map(n => n.id)).toEqual(['a', 'b']);
		expect(moveNodeAmongSiblings(tree, 'b', 'down').map(n => n.id)).toEqual(['a', 'b']);
	});
});

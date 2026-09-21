export interface OrderedTreeNode<TNode extends OrderedTreeNode<TNode>> {
	id: string;
	children: TNode[];
}

export interface FlattenedTreeNode<TNode extends OrderedTreeNode<TNode>> {
	node: TNode;
	depth: number;
	parentID: string | null;
}

function cloneWithChildren<TNode extends OrderedTreeNode<TNode>>(node: TNode, children: TNode[]): TNode {
	return { ...node, children } as TNode;
}

export function findNodeWithParent<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string, parentID: string | null = null): { node: TNode; parentID: string | null } | null {
	for (const node of tree) {
		if (node.id === nodeID) return { node, parentID };
		const found = findNodeWithParent(node.children, nodeID, node.id);
		if (found) return found;
	}
	return null;
}

export function getSiblings<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], parentID: string | null): TNode[] {
	if (parentID === null) return tree;
	return findNodeWithParent(tree, parentID)?.node.children ?? [];
}

export function getSubtreeIDsIncludingSelf<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): Set<string> {
	const ids = new Set<string>();
	const node = findNodeWithParent(tree, nodeID)?.node;
	if (!node) return ids;

	function collect(node: TNode) {
		ids.add(node.id);
		node.children.forEach(collect);
	}
	collect(node);
	return ids;
}

export function getAncestorIDs<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): string[] {
	function search(nodes: TNode[], ancestorIDs: string[]): string[] | null {
		for (const node of nodes) {
			if (node.id === nodeID) return ancestorIDs;
			const found = search(node.children, [...ancestorIDs, node.id]);
			if (found) return found;
		}
		return null;
	}
	return search(tree, []) ?? [];
}

export function isDescendant<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], ancestorID: string, candidateID: string): boolean {
	const ancestor = findNodeWithParent(tree, ancestorID)?.node;
	if (!ancestor) return false;

	function search(nodes: TNode[]): boolean {
		return nodes.some(node => node.id === candidateID || search(node.children));
	}
	return search(ancestor.children);
}

export function flattenForDisplay<TNode extends OrderedTreeNode<TNode>>(tree: TNode[]): FlattenedTreeNode<TNode>[] {
	const result: FlattenedTreeNode<TNode>[] = [];

	function recurse(nodes: TNode[], depth: number, parentID: string | null) {
		for (const node of nodes) {
			result.push({ node, depth, parentID });
			recurse(node.children, depth + 1, node.id);
		}
	}
	recurse(tree, 0, null);
	return result;
}

export function getLeavesInDepthFirstOrder<TNode extends OrderedTreeNode<TNode>>(tree: TNode[]): TNode[] {
	const leaves: TNode[] = [];

	function recurse(nodes: TNode[]) {
		for (const node of nodes) {
			if (node.children.length === 0) leaves.push(node);
			else recurse(node.children);
		}
	}
	recurse(tree);
	return leaves;
}

export function mapNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string, transform: (node: TNode) => TNode): TNode[] {
	return tree.map(node => {
		if (node.id === nodeID) return transform(node);
		return cloneWithChildren(node, mapNode(node.children, nodeID, transform));
	});
}

export function mapEveryNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], transform: (node: TNode, mappedChildren: TNode[]) => TNode): TNode[] {
	return tree.map(node => transform(node, mapEveryNode(node.children, transform)));
}

export function removeNodeWithSubtree<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): { tree: TNode[]; removed: TNode | null } {
	let removed: TNode | null = null;

	function recurse(nodes: TNode[]): TNode[] {
		const filtered: TNode[] = [];
		for (const node of nodes) {
			if (node.id === nodeID) {
				removed = node;
				continue;
			}
			filtered.push(cloneWithChildren(node, recurse(node.children)));
		}
		return filtered;
	}

	const newTree = recurse(tree);
	return { tree: newTree, removed };
}

export function deleteNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): TNode[] {
	return removeNodeWithSubtree(tree, nodeID).tree;
}

export function appendRootNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], newNode: TNode): TNode[] {
	return [...tree, newNode];
}

export function insertSiblingRelativeToNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], siblingID: string, position: 'before' | 'after', newNode: TNode): TNode[] {
	function recurse(nodes: TNode[]): TNode[] {
		const index = nodes.findIndex(node => node.id === siblingID);
		if (index !== -1) {
			const insertAt = position === 'before' ? index : index + 1;
			return [...nodes.slice(0, insertAt), newNode, ...nodes.slice(insertAt)];
		}
		return nodes.map(node => cloneWithChildren(node, recurse(node.children)));
	}
	return recurse(tree);
}

export function insertSiblingsAfterNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], siblingID: string, newNodes: TNode[]): TNode[] {
	function recurse(nodes: TNode[]): TNode[] {
		const index = nodes.findIndex(node => node.id === siblingID);
		if (index !== -1) {
			return [...nodes.slice(0, index + 1), ...newNodes, ...nodes.slice(index + 1)];
		}
		return nodes.map(node => cloneWithChildren(node, recurse(node.children)));
	}
	return recurse(tree);
}

export function indentNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): TNode[] {
	function recurse(nodes: TNode[]): { nodes: TNode[]; didIndent: boolean } {
		const index = nodes.findIndex(node => node.id === nodeID);
		if (index !== -1) {
			if (index === 0) return { nodes, didIndent: false };
			const nodeToMove = nodes[index];
			const previousSibling = nodes[index - 1];
			const newPreviousSibling = cloneWithChildren(previousSibling, [...previousSibling.children, nodeToMove]);
			return { nodes: [...nodes.slice(0, index - 1), newPreviousSibling, ...nodes.slice(index + 1)], didIndent: true };
		}

		let didIndent = false;
		const newNodes = nodes.map(node => {
			if (didIndent) return node;
			const result = recurse(node.children);
			if (result.didIndent) {
				didIndent = true;
				return cloneWithChildren(node, result.nodes);
			}
			return node;
		});
		return { nodes: newNodes, didIndent };
	}

	return recurse(tree).nodes;
}

export function canIndentNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): boolean {
	const found = findNodeWithParent(tree, nodeID);
	if (!found) return false;
	const siblings = getSiblings(tree, found.parentID);
	return siblings.findIndex(sibling => sibling.id === nodeID) > 0;
}

export function unindentNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): TNode[] {
	function recurse(siblings: TNode[]): { nodes: TNode[]; didUnindent: boolean } {
		for (let i = 0; i < siblings.length; i++) {
			const parentCandidate = siblings[i];
			const childIndex = parentCandidate.children.findIndex(child => child.id === nodeID);
			if (childIndex !== -1) {
				const hoistedNode = parentCandidate.children[childIndex];
				const newParentChildren = [...parentCandidate.children.slice(0, childIndex), ...parentCandidate.children.slice(childIndex + 1)];
				const newParent = cloneWithChildren(parentCandidate, newParentChildren);
				return { nodes: [...siblings.slice(0, i), newParent, hoistedNode, ...siblings.slice(i + 1)], didUnindent: true };
			}
		}

		let didUnindent = false;
		const newSiblings = siblings.map(node => {
			if (didUnindent) return node;
			const result = recurse(node.children);
			if (result.didUnindent) {
				didUnindent = true;
				return cloneWithChildren(node, result.nodes);
			}
			return node;
		});
		return { nodes: newSiblings, didUnindent };
	}

	return recurse(tree).nodes;
}

export function canUnindentNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string): boolean {
	const found = findNodeWithParent(tree, nodeID);
	return found !== null && found.parentID !== null;
}

export function moveNodeAmongSiblings<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], nodeID: string, direction: 'up' | 'down'): TNode[] {
	function recurse(nodes: TNode[]): { nodes: TNode[]; didMove: boolean } {
		const index = nodes.findIndex(node => node.id === nodeID);
		if (index !== -1) {
			const targetIndex = direction === 'up' ? index - 1 : index + 1;
			if (targetIndex < 0 || targetIndex >= nodes.length) return { nodes, didMove: false };
			const newNodes = [...nodes];
			[newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
			return { nodes: newNodes, didMove: true };
		}

		let didMove = false;
		const newNodes = nodes.map(node => {
			if (didMove) return node;
			const result = recurse(node.children);
			if (result.didMove) {
				didMove = true;
				return cloneWithChildren(node, result.nodes);
			}
			return node;
		});
		return { nodes: newNodes, didMove };
	}

	return recurse(tree).nodes;
}

function insertNodeIntoChildrenOf<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], parentID: string, nodeToInsert: TNode, index: number): TNode[] {
	return tree.map(node => {
		if (node.id === parentID) {
			const children = [...node.children.slice(0, index), nodeToInsert, ...node.children.slice(index)];
			return cloneWithChildren(node, children);
		}
		return cloneWithChildren(node, insertNodeIntoChildrenOf(node.children, parentID, nodeToInsert, index));
	});
}

export function reparentAndReorderNode<TNode extends OrderedTreeNode<TNode>>(tree: TNode[], draggedNodeID: string, newParentID: string | null, newIndexAmongSiblings: number): TNode[] {
	const { tree: treeWithoutDragged, removed } = removeNodeWithSubtree(tree, draggedNodeID);
	if (!removed) return tree;

	if (newParentID === null) {
		return [...treeWithoutDragged.slice(0, newIndexAmongSiblings), removed, ...treeWithoutDragged.slice(newIndexAmongSiblings)];
	}
	return insertNodeIntoChildrenOf(treeWithoutDragged, newParentID, removed, newIndexAmongSiblings);
}

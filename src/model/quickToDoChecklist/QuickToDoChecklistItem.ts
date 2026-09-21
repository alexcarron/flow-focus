import { OrderedTreeNode } from '../../utilities/tree/orderedTree';

export default interface QuickToDoChecklistItem extends OrderedTreeNode<QuickToDoChecklistItem> {
	id: string;
	text: string;
	isChecked: boolean;
	children: QuickToDoChecklistItem[];
}

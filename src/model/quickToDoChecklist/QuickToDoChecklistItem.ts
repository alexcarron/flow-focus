export default interface QuickToDoChecklistItem {
	id: string;
	text: string;
	isChecked: boolean;
	children: QuickToDoChecklistItem[];
}

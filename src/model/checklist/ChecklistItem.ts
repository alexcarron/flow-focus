export default interface ChecklistItem {
	id: string;
	text: string;
	isChecked: boolean;
	children: ChecklistItem[];
}

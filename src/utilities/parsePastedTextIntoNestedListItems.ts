export interface PastedListItem {
	text: string;
	isChecked: boolean;
	children: PastedListItem[];
}

interface OpenAncestorListItem {
	indentationWidth: number;
	item: PastedListItem;
}

const SPACES_PER_TAB = 4;

export default function parsePastedTextIntoNestedListItems(pastedText: string): PastedListItem[] {
	const topLevelItems: PastedListItem[] = [];
	const openAncestorListItems: OpenAncestorListItem[] = [];

	for (const line of pastedText.split(/\r?\n/)) {
		const item = convertPastedLineIntoListItem(line);
		if (item.text.length === 0) continue;

		const indentationWidth = measureIndentationWidth(line);
		while (openAncestorListItems.length > 0 && openAncestorListItems[openAncestorListItems.length - 1].indentationWidth >= indentationWidth) {
			openAncestorListItems.pop();
		}

		const parentListItem = openAncestorListItems[openAncestorListItems.length - 1];
		if (parentListItem) parentListItem.item.children.push(item);
		else topLevelItems.push(item);

		openAncestorListItems.push({ indentationWidth, item });
	}

	return topLevelItems;
}

export function isSingleListItemWithoutChildren(pastedListItems: PastedListItem[]): boolean {
	return pastedListItems.length === 1 && pastedListItems[0].children.length === 0;
}

function measureIndentationWidth(line: string): number {
	const leadingWhitespace = line.match(/^[ \t]*/)?.[0] ?? '';
	return [...leadingWhitespace].reduce((width, character) => width + (character === '\t' ? SPACES_PER_TAB : 1), 0);
}

function convertPastedLineIntoListItem(line: string): PastedListItem {
	const textStartingAtCheckbox = removeLeadingListMarker(removeLeadingHeadingMarker(line.trim()));
	const isChecked = /^\[[xX]\]/.test(textStartingAtCheckbox);
	const text = replaceLinksWithTheirText(removeMarkdownEmphasis(removeLeadingCheckbox(textStartingAtCheckbox))).trim();
	return { text, isChecked, children: [] };
}

function removeLeadingHeadingMarker(item: string): string {
	return item.replace(/^#{1,6}\s+/, '');
}

function removeLeadingListMarker(item: string): string {
	return item.replace(/^(?:[-*+]|\d+[.)])\s+/, '');
}

function removeLeadingCheckbox(item: string): string {
	return item.replace(/^\[[ xX/\-]\]\s*/, '');
}

function removeMarkdownEmphasis(item: string): string {
	return item
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/__(.+?)__/g, '$1')
		.replace(/`(.+?)`/g, '$1')
		.replace(/\*(.+?)\*/g, '$1');
}

function replaceLinksWithTheirText(item: string): string {
	return item
		.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
		.replace(/\[\[([^\]]+)\]\]/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

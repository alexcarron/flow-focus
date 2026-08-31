export default function parsePastedTextIntoListItems(pastedText: string): string[] {
	return pastedText
		.split(/\r?\n/)
		.map(cleanPastedLineIntoListItem)
		.filter(item => item.length > 0);
}

function cleanPastedLineIntoListItem(line: string): string {
	let item = line.trim();
	item = removeLeadingHeadingMarker(item);
	item = removeLeadingListMarker(item);
	item = removeLeadingCheckbox(item);
	item = removeMarkdownEmphasis(item);
	item = replaceLinksWithTheirText(item);
	return item.trim();
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

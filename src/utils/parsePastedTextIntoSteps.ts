export default function parsePastedTextIntoSteps(pastedText: string): string[] {
	return pastedText
		.split(/\r?\n/)
		.map(cleanPastedLineIntoStep)
		.filter(step => step.length > 0);
}

function cleanPastedLineIntoStep(line: string): string {
	let step = line.trim();
	step = removeLeadingHeadingMarker(step);
	step = removeLeadingListMarker(step);
	step = removeLeadingCheckbox(step);
	step = removeMarkdownEmphasis(step);
	step = replaceLinksWithTheirText(step);
	return step.trim();
}

function removeLeadingHeadingMarker(step: string): string {
	return step.replace(/^#{1,6}\s+/, '');
}

function removeLeadingListMarker(step: string): string {
	return step.replace(/^(?:[-*+]|\d+[.)])\s+/, '');
}

function removeLeadingCheckbox(step: string): string {
	return step.replace(/^\[[ xX/\-]\]\s*/, '');
}

function removeMarkdownEmphasis(step: string): string {
	return step
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/__(.+?)__/g, '$1')
		.replace(/`(.+?)`/g, '$1')
		.replace(/\*(.+?)\*/g, '$1');
}

function replaceLinksWithTheirText(step: string): string {
	return step
		.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
		.replace(/\[\[([^\]]+)\]\]/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

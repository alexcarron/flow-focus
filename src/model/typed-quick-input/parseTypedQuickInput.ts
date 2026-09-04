import { DEFAULT_SETTINGS } from '../AppSettings';
import TaskTimingOptions from '../task/TaskTimingOptions';
import Time from '../time-management/Time';
import { RawMatch, typedQuickInputMatchers } from './typedQuickInputMatchers';
import { TypedQuickInputParseResult, TypedQuickInputToken } from './TypedQuickInputToken';

const defaultNightTime = Time.fromString(DEFAULT_SETTINGS.nightTime);
const defaultMorningTime = Time.fromString(DEFAULT_SETTINGS.morningTime);

type Range = { start: number; end: number };

function rangesOverlap(left: Range, right: Range): boolean {
	return left.start < right.end && right.start < left.end;
}

function findQuoteSpans(input: string): Array<{ openIndex: number; closeIndex: number }> {
	const spans: Array<{ openIndex: number; closeIndex: number }> = [];
	const regex = /"([^"]*)"/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(input)) !== null) {
		spans.push({ openIndex: match.index, closeIndex: match.index + match[0].length - 1 });
	}
	return spans;
}

function findBackslashSpans(input: string): Array<{ backslashIndex: number; runEnd: number }> {
	const spans: Array<{ backslashIndex: number; runEnd: number }> = [];
	for (let index = 0; index < input.length; index++) {
		if (input[index] !== '\\') continue;
		let runEnd = index + 1;
		while (runEnd < input.length && !/\s/.test(input[runEnd])) runEnd++;
		spans.push({ backslashIndex: index, runEnd });
	}
	return spans;
}

function resolveOverlappingMatches(matches: RawMatch[]): RawMatch[] {
	const sorted = [...matches].sort((left, right) => left.startIndex - right.startIndex);
	const kept: RawMatch[] = [];
	for (const match of sorted) {
		const overlapsKept = kept.some(other =>
			rangesOverlap(
				{ start: match.startIndex, end: match.endIndex },
				{ start: other.startIndex, end: other.endIndex }
			)
		);
		if (!overlapsKept) kept.push(match);
	}
	return kept;
}

function buildCleanedName(input: string, removedIndices: Set<number>): string {
	let result = '';
	for (let index = 0; index < input.length; index++) {
		if (!removedIndices.has(index)) result += input[index];
	}
	return result.replace(/\s+/g, ' ').trim();
}

export default function parseTypedQuickInput(config: {
	input: string;
	now?: Date;
	nightTime?: Time;
	morningTime?: Time;
}): TypedQuickInputParseResult {
	const input = config.input;
	const now = config.now ?? new Date();
	const nightTime = config.nightTime ?? defaultNightTime;
	const morningTime = config.morningTime ?? defaultMorningTime;

	const rawMatches = typedQuickInputMatchers.flatMap(matcher => matcher.findMatches({ input, now, nightTime, morningTime }));

	const quoteSpans = findQuoteSpans(input);
	const backslashSpans = findBackslashSpans(input);

	const protectedRanges: Range[] = [
		...quoteSpans.map(span => ({ start: span.openIndex + 1, end: span.closeIndex })),
		...backslashSpans.map(span => ({ start: span.backslashIndex + 1, end: span.runEnd })),
	];

	const unprotectedMatches = rawMatches.filter(match =>
		!protectedRanges.some(range =>
			rangesOverlap({ start: match.startIndex, end: match.endIndex }, range)
		)
	);

	const keptMatches = resolveOverlappingMatches(unprotectedMatches);

	const removedIndices = new Set<number>();
	for (const match of keptMatches) {
		if (match.keepInName) continue;
		for (let index = match.startIndex; index < match.endIndex; index++) removedIndices.add(index);
	}

	for (const span of quoteSpans) {
		const innerRange = { start: span.openIndex + 1, end: span.closeIndex };
		const protectsAToken = rawMatches.some(match =>
			rangesOverlap({ start: match.startIndex, end: match.endIndex }, innerRange)
		);
		if (protectsAToken) {
			removedIndices.add(span.openIndex);
			removedIndices.add(span.closeIndex);
		}
	}

	for (const span of backslashSpans) {
		const runRange = { start: span.backslashIndex + 1, end: span.runEnd };
		const protectsAToken = rawMatches.some(match =>
			rangesOverlap({ start: match.startIndex, end: match.endIndex }, runRange)
		);
		if (protectsAToken) removedIndices.add(span.backslashIndex);
	}

	const timing: Partial<TaskTimingOptions> = {};
	let steps: string[] | null = null;
	for (const match of keptMatches) {
		Object.assign(timing, match.timing);
		if (match.stepsList) steps = match.stepsList;
	}

	const tokens: TypedQuickInputToken[] = keptMatches
		.map(match => ({
			field: match.field,
			matchedText: match.matchedText,
			startIndex: match.startIndex,
			endIndex: match.endIndex,
			explanation: match.explanation,
			colorClass: match.colorClass,
		}))
		.sort((left, right) => left.startIndex - right.startIndex);

	return {
		cleanedName: buildCleanedName(input, removedIndices),
		timing,
		steps,
		tokens,
	};
}

export function escapeTokenInText(input: string, token: TypedQuickInputToken): string {
	return `${input.slice(0, token.startIndex)}\\${input.slice(token.startIndex)}`;
}

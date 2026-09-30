import Task from './Task';
import Step from './step/Step';
import StepStatus from './step/StepStatus';
import Tag from '../tag/Tag';
import { formatRecurrenceDuration } from './recurrence/RecurrenceDuration';
import { formatAbsoluteDateAndTime } from '../../utilities/dateFormatting';
import { formatAbbreviatedDuration, formatAbbreviatedDurationRange } from '../../utilities/timeFormatters';

const STEP_INDENTATION_PER_DEPTH = '  ';

function convertStepAndDescendantsToMarkdownLines({ step, depth }: { step: Step; depth: number }): string[] {
	const indentation = STEP_INDENTATION_PER_DEPTH.repeat(depth);
	const checkbox = step.status === StepStatus.COMPLETED ? '[x]' : '[ ]';
	const shouldStrikeThroughText = step.status === StepStatus.SKIPPED && step.text !== '';
	const displayedText = shouldStrikeThroughText ? `~~${step.text}~~` : step.text;
	const descendantLines = step.children.flatMap(childStep => convertStepAndDescendantsToMarkdownLines({ step: childStep, depth: depth + 1 }));
	return [`${indentation}- ${checkbox} ${displayedText}`, ...descendantLines];
}

function formatTaskDurationForMarkdown({ task, now }: { task: Task; now: Date }): string | null {
	const minimumRequiredMilliseconds = task.getMinRequiredTime();
	if (task.hasMaxRequiredTime()) return formatAbbreviatedDurationRange(minimumRequiredMilliseconds, task.getMaxRequiredTime(now));
	if (minimumRequiredMilliseconds > 0) return `${formatAbbreviatedDuration(minimumRequiredMilliseconds)}+`;
	return null;
}

function convertTaskDetailsToMarkdownLines({ task, now }: { task: Task; now: Date }): string[] {
	const detailLines: string[] = [];
	const startTime = task.getStartTime();
	const deadline = task.getDeadline();
	const endTime = task.getEndTime();
	const recurrenceDuration = task.getRecurrenceDuration();
	const formattedDuration = formatTaskDurationForMarkdown({ task, now });
	const skippedUntil = task.getSkippedUntil();
	const isSkipActive = skippedUntil !== null && skippedUntil > now;

	if (task.getIsMandatory()) detailLines.push('Mandatory');
	if (startTime !== null) detailLines.push(`Starts ${formatAbsoluteDateAndTime(startTime)}`);
	if (deadline !== null) detailLines.push(`Due ${formatAbsoluteDateAndTime(deadline)}`);
	if (endTime !== null) detailLines.push(`Ends ${formatAbsoluteDateAndTime(endTime)}`);
	if (recurrenceDuration !== null) detailLines.push(`Repeats every ${formatRecurrenceDuration(recurrenceDuration)}`);
	if (formattedDuration !== null) detailLines.push(`Duration: ${formattedDuration}`);
	if (isSkipActive) detailLines.push(`Skipped until ${formatAbsoluteDateAndTime(skippedUntil)}`);

	return detailLines;
}

export function convertTaskToMarkdown({ task, tags, now }: { task: Task; tags: Tag[]; now: Date }): string {
	const attachedTagNames = task.getTagIDs()
		.map(tagID => tags.find(tag => tag.id === tagID)?.name)
		.filter((tagName): tagName is string => tagName !== undefined);
	const detailLines = convertTaskDetailsToMarkdownLines({ task, now });
	const stepLines = task.getSteps().flatMap(step => convertStepAndDescendantsToMarkdownLines({ step, depth: 0 }));

	const sections = [`# ${task.getDescription()}`];
	if (attachedTagNames.length > 0) sections.push(attachedTagNames.map(tagName => `(${tagName})`).join(' '));
	if (detailLines.length > 0) sections.push(detailLines.join('\n'));
	if (stepLines.length > 0) sections.push(stepLines.join('\n'));

	return sections.join('\n\n');
}

import TaskTimingOptions from '../task/TaskTimingOptions';
import RecurrenceDuration, { formatRecurrenceDuration } from '../task/recurrence/RecurrenceDuration';
import RecurrenceUnit from '../task/recurrence/RecurrenceUnit';
import Weekday, { WEEKDAYS_FROM_MONDAY } from '../time-management/Weekday';
import { nextDateForWeekday, parseTimeOfDayPhrase, WEEKDAY_NAME_TO_WEEKDAY } from './parseDatePhrase';
import type { FindMatchesConfig, Matcher, RawMatch } from './typedQuickInputMatchers';

const weekdayNameAlternation = Object.keys(WEEKDAY_NAME_TO_WEEKDAY)
	.sort((left, right) => right.length - left.length)
	.join('|');

const WEEKDAY_SEPARATOR_PATTERN = '(?:\\s*,\\s*(?:and\\s+)?|\\s+and\\s+|\\s*\\/\\s*|\\s+)';
const WEEKDAY_LIST_REGEX = new RegExp(`^(?:${weekdayNameAlternation})\\b(?:${WEEKDAY_SEPARATOR_PATTERN}(?:${weekdayNameAlternation})\\b)*`, 'i');
const WEEKDAY_NAME_REGEX = new RegExp(`\\b(${weekdayNameAlternation})\\b`, 'gi');

const weekdayGroupWordToWeekdays: Record<string, Weekday[]> = {
	weekday: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY],
	weekend: [Weekday.SATURDAY, Weekday.SUNDAY],
};
const WEEKDAY_GROUP_WORD_REGEX = new RegExp(`^(${Object.keys(weekdayGroupWordToWeekdays).join('|')})\\b`, 'i');

const repeatUnitWordToRecurrenceUnit: Record<string, RecurrenceUnit> = {
	hour: RecurrenceUnit.Hour, hours: RecurrenceUnit.Hour,
	day: RecurrenceUnit.Day, days: RecurrenceUnit.Day,
	week: RecurrenceUnit.Week, weeks: RecurrenceUnit.Week,
	month: RecurrenceUnit.Month, months: RecurrenceUnit.Month,
	year: RecurrenceUnit.Year, years: RecurrenceUnit.Year,
};

const repeatUnitAlternation = Object.keys(repeatUnitWordToRecurrenceUnit)
	.sort((left, right) => right.length - left.length)
	.join('|');

const namedRepeatWordToRecurrenceUnit: Record<string, RecurrenceUnit> = {
	hourly: RecurrenceUnit.Hour,
	everyday: RecurrenceUnit.Day,
	daily: RecurrenceUnit.Day,
	weekly: RecurrenceUnit.Week,
	monthly: RecurrenceUnit.Month,
	yearly: RecurrenceUnit.Year,
	annually: RecurrenceUnit.Year,
};

function buildRepeatMatch(parameters: {
	startIndex: number;
	endIndex: number;
	input: string;
	recurrenceDuration: RecurrenceDuration;
	explanation: string;
	startTime?: Date;
}): RawMatch {
	const timing: Partial<TaskTimingOptions> = { recurrenceDuration: parameters.recurrenceDuration };
	if (parameters.startTime) timing.startTime = parameters.startTime;
	return {
		field: 'recurrenceDuration',
		colorClass: 'repeat',
		startIndex: parameters.startIndex,
		endIndex: parameters.endIndex,
		matchedText: parameters.input.slice(parameters.startIndex, parameters.endIndex),
		explanation: parameters.explanation,
		timing,
	};
}

function parseWeekdayNameList(text: string): { matchedLength: number; weekdays: Weekday[] } | null {
	const weekdayGroupWordMatch = WEEKDAY_GROUP_WORD_REGEX.exec(text);
	if (weekdayGroupWordMatch) {
		return {
			matchedLength: weekdayGroupWordMatch[0].length,
			weekdays: weekdayGroupWordToWeekdays[weekdayGroupWordMatch[1].toLowerCase()],
		};
	}

	const weekdayListMatch = WEEKDAY_LIST_REGEX.exec(text);
	if (!weekdayListMatch) return null;

	const namedWeekdays = [...weekdayListMatch[0].matchAll(WEEKDAY_NAME_REGEX)]
		.map(weekdayNameMatch => WEEKDAY_NAME_TO_WEEKDAY[weekdayNameMatch[1].toLowerCase()]);
	return {
		matchedLength: weekdayListMatch[0].length,
		weekdays: WEEKDAYS_FROM_MONDAY.filter(weekday => namedWeekdays.includes(weekday)),
	};
}

function getEarliestUpcomingDateOfWeekdays({ weekdays, now }: { weekdays: Weekday[]; now: Date }): Date {
	const upcomingDates = weekdays.map(weekday => nextDateForWeekday(weekday, true, now));
	return upcomingDates.reduce((earliest, date) => date.getTime() < earliest.getTime() ? date : earliest);
}

function formatTypedTimeOfDayForExplanation({ startTime, wasTimeOfDayTyped }: { startTime: Date; wasTimeOfDayTyped: boolean }): string {
	if (!wasTimeOfDayTyped) return '';
	return ` at ${startTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function findWeekdayRepeatMatch(parameters: {
	config: FindMatchesConfig;
	everyStartIndex: number;
	argumentStartIndex: number;
}): RawMatch | null {
	const { config, everyStartIndex, argumentStartIndex } = parameters;
	const weekdayNameList = parseWeekdayNameList(config.input.slice(argumentStartIndex));
	if (!weekdayNameList) return null;

	const weekdayListEndIndex = argumentStartIndex + weekdayNameList.matchedLength;
	const typedTimeOfDay = parseTimeOfDayPhrase({
		text: config.input.slice(weekdayListEndIndex),
		morningTime: config.morningTime,
		nightTime: config.nightTime,
	});

	const startTime = getEarliestUpcomingDateOfWeekdays({ weekdays: weekdayNameList.weekdays, now: config.now });
	if (typedTimeOfDay) {
		startTime.setHours(typedTimeOfDay.timeOfDay.hour, typedTimeOfDay.timeOfDay.minute, 0, 0);
	}
	else {
		startTime.setHours(config.morningTime.getHour(), config.morningTime.getMinute(), 0, 0);
	}

	const recurrenceDuration: RecurrenceDuration = {
		amount: 1,
		unit: RecurrenceUnit.Week,
		weekdays: weekdayNameList.weekdays,
	};
	return buildRepeatMatch({
		startIndex: everyStartIndex,
		endIndex: weekdayListEndIndex + (typedTimeOfDay?.matchedLength ?? 0),
		input: config.input,
		recurrenceDuration,
		explanation: `Repeats every ${formatRecurrenceDuration(recurrenceDuration)}${formatTypedTimeOfDayForExplanation({ startTime, wasTimeOfDayTyped: typedTimeOfDay !== null })}`,
		startTime,
	});
}

export const repeatMatcher: Matcher = {
	field: 'recurrenceDuration',
	colorClass: 'repeat',
	findMatches(config) {
		const { input } = config;
		const matches: RawMatch[] = [];

		const namedRegex = new RegExp(`\\b(${Object.keys(namedRepeatWordToRecurrenceUnit).join('|')}|every\\s+day)\\b`, 'gi');
		let namedMatch: RegExpExecArray | null;
		while ((namedMatch = namedRegex.exec(input)) !== null) {
			const word = namedMatch[1].toLowerCase().replace(/\s+/g, '');
			const recurrenceDuration: RecurrenceDuration = { amount: 1, unit: namedRepeatWordToRecurrenceUnit[word] };
			const endIndex = namedMatch.index + namedMatch[0].length;
			matches.push(buildRepeatMatch({
				startIndex: namedMatch.index,
				endIndex,
				input,
				recurrenceDuration,
				explanation: `Repeats every ${formatRecurrenceDuration(recurrenceDuration)}`,
			}));
		}

		const everyRegex = /\bevery\s+/gi;
		let everyMatch: RegExpExecArray | null;
		while ((everyMatch = everyRegex.exec(input)) !== null) {
			const argumentStartIndex = everyMatch.index + everyMatch[0].length;

			const weekdayRepeatMatch = findWeekdayRepeatMatch({
				config,
				everyStartIndex: everyMatch.index,
				argumentStartIndex,
			});
			if (weekdayRepeatMatch) {
				matches.push(weekdayRepeatMatch);
				everyRegex.lastIndex = weekdayRepeatMatch.endIndex;
				continue;
			}

			const countUnitMatch = new RegExp(`^(?:(\\d+)\\s+)?(${repeatUnitAlternation})\\b`, 'i').exec(input.slice(argumentStartIndex));
			if (countUnitMatch) {
				const amount = countUnitMatch[1] ? parseInt(countUnitMatch[1], 10) : 1;
				const recurrenceDuration: RecurrenceDuration = { amount, unit: repeatUnitWordToRecurrenceUnit[countUnitMatch[2].toLowerCase()] };
				const endIndex = argumentStartIndex + countUnitMatch[0].length;
				matches.push(buildRepeatMatch({
					startIndex: everyMatch.index,
					endIndex,
					input,
					recurrenceDuration,
					explanation: `Repeats every ${formatRecurrenceDuration(recurrenceDuration)}`,
				}));
				everyRegex.lastIndex = endIndex;
			}
		}

		return matches;
	},
};

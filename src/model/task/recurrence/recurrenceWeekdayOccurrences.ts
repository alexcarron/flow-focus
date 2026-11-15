import Weekday, { getWeekdayOfDate } from '../../time-management/Weekday';
import { addDays, getStartOfDay } from '../../../utilities/dateFormatting';

const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

function getDaysFromWeekdayToWeekday({ fromWeekday, toWeekday }: { fromWeekday: Weekday; toWeekday: Weekday }): number {
	return (toWeekday - fromWeekday + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

export function getDaysUntilFirstRecurrenceWeekdayOnOrAfter({ date, weekdays }: { date: Date; weekdays: Weekday[] }): number {
	const weekdayOfDate = getWeekdayOfDate(date);
	return Math.min(...weekdays.map(weekday => getDaysFromWeekdayToWeekday({ fromWeekday: weekdayOfDate, toWeekday: weekday })));
}

export function moveDateToFirstRecurrenceWeekdayOnOrAfter({ date, weekdays }: { date: Date; weekdays: Weekday[] }): Date {
	return addDays(date, getDaysUntilFirstRecurrenceWeekdayOnOrAfter({ date, weekdays }));
}

export function getWeekdayOccurrenceStartDate(parameters: {
	anchorStartDate: Date;
	weekdaysFromMonday: Weekday[];
	occurrenceIndex: number;
}): Date {
	const { weekdaysFromMonday, occurrenceIndex } = parameters;
	const anchorStartDate = moveDateToFirstRecurrenceWeekdayOnOrAfter({ date: parameters.anchorStartDate, weekdays: weekdaysFromMonday });
	const anchorWeekday = getWeekdayOfDate(anchorStartDate);
	const weekdaysPerWeek = weekdaysFromMonday.length;

	const occurrencePositionCountedFromAnchorWeek = weekdaysFromMonday.indexOf(anchorWeekday) + occurrenceIndex;
	const weeksAfterAnchorWeek = Math.floor(occurrencePositionCountedFromAnchorWeek / weekdaysPerWeek);
	const positionWithinWeek = occurrencePositionCountedFromAnchorWeek - weeksAfterAnchorWeek * weekdaysPerWeek;
	const occurrenceWeekday = weekdaysFromMonday[positionWithinWeek];

	const daysAfterAnchor = weeksAfterAnchorWeek * DAYS_PER_WEEK + (occurrenceWeekday - anchorWeekday);
	return addDays(anchorStartDate, daysAfterAnchor);
}

function countCalendarDaysBetween({ earlierDate, laterDate }: { earlierDate: Date; laterDate: Date }): number {
	return Math.round((getStartOfDay(laterDate).getTime() - getStartOfDay(earlierDate).getTime()) / MILLISECONDS_PER_DAY);
}

export function getWeekdayOccurrenceTimeMatchingAnchor(parameters: {
	anchorStartDate: Date;
	anchorTime: Date;
	occurrenceStartDate: Date;
	nextOccurrenceStartDate: Date;
}): Date {
	const { anchorStartDate, anchorTime, occurrenceStartDate, nextOccurrenceStartDate } = parameters;
	const daysAfterAnchorStart = countCalendarDaysBetween({ earlierDate: anchorStartDate, laterDate: anchorTime });

	const occurrenceTime = addDays(getStartOfDay(occurrenceStartDate), daysAfterAnchorStart);
	occurrenceTime.setHours(anchorTime.getHours(), anchorTime.getMinutes(), anchorTime.getSeconds(), anchorTime.getMilliseconds());

	if (occurrenceTime.getTime() > nextOccurrenceStartDate.getTime()) return nextOccurrenceStartDate;
	return occurrenceTime;
}

export function getDefaultTargetDateOfWeekdayRepeat({ startDate, endOfDayTimeOfDay }: { startDate: Date; endOfDayTimeOfDay: { hour: number; minute: number } }): Date | null {
	const endOfStartDay = new Date(startDate);
	endOfStartDay.setHours(endOfDayTimeOfDay.hour, endOfDayTimeOfDay.minute, 0, 0);
	if (endOfStartDay.getTime() <= startDate.getTime()) return null;
	return endOfStartDay;
}

export function moveAnchorOccurrenceToFirstRecurrenceWeekday(parameters: {
	startDate: Date;
	targetDate: Date | null;
	dueDate: Date | null;
	weekdays: Weekday[];
}): { startDate: Date; targetDate: Date | null; dueDate: Date | null } {
	const daysToMove = getDaysUntilFirstRecurrenceWeekdayOnOrAfter({ date: parameters.startDate, weekdays: parameters.weekdays });
	return {
		startDate: addDays(parameters.startDate, daysToMove),
		targetDate: parameters.targetDate === null ? null : addDays(parameters.targetDate, daysToMove),
		dueDate: parameters.dueDate === null ? null : addDays(parameters.dueDate, daysToMove),
	};
}

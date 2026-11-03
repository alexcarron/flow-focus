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

export function getWeekdayOccurrenceStartTime(parameters: {
	anchorStartTime: Date;
	weekdaysFromMonday: Weekday[];
	occurrenceIndex: number;
}): Date {
	const { weekdaysFromMonday, occurrenceIndex } = parameters;
	const anchorStartTime = moveDateToFirstRecurrenceWeekdayOnOrAfter({ date: parameters.anchorStartTime, weekdays: weekdaysFromMonday });
	const anchorWeekday = getWeekdayOfDate(anchorStartTime);
	const weekdaysPerWeek = weekdaysFromMonday.length;

	const occurrencePositionCountedFromAnchorWeek = weekdaysFromMonday.indexOf(anchorWeekday) + occurrenceIndex;
	const weeksAfterAnchorWeek = Math.floor(occurrencePositionCountedFromAnchorWeek / weekdaysPerWeek);
	const positionWithinWeek = occurrencePositionCountedFromAnchorWeek - weeksAfterAnchorWeek * weekdaysPerWeek;
	const occurrenceWeekday = weekdaysFromMonday[positionWithinWeek];

	const daysAfterAnchor = weeksAfterAnchorWeek * DAYS_PER_WEEK + (occurrenceWeekday - anchorWeekday);
	return addDays(anchorStartTime, daysAfterAnchor);
}

function countCalendarDaysBetween({ earlierDate, laterDate }: { earlierDate: Date; laterDate: Date }): number {
	return Math.round((getStartOfDay(laterDate).getTime() - getStartOfDay(earlierDate).getTime()) / MILLISECONDS_PER_DAY);
}

export function getWeekdayOccurrenceTimeMatchingAnchor(parameters: {
	anchorStartTime: Date;
	anchorTime: Date;
	occurrenceStartTime: Date;
	nextOccurrenceStartTime: Date;
}): Date {
	const { anchorStartTime, anchorTime, occurrenceStartTime, nextOccurrenceStartTime } = parameters;
	const daysAfterAnchorStart = countCalendarDaysBetween({ earlierDate: anchorStartTime, laterDate: anchorTime });

	const occurrenceTime = addDays(getStartOfDay(occurrenceStartTime), daysAfterAnchorStart);
	occurrenceTime.setHours(anchorTime.getHours(), anchorTime.getMinutes(), anchorTime.getSeconds(), anchorTime.getMilliseconds());

	if (occurrenceTime.getTime() > nextOccurrenceStartTime.getTime()) return nextOccurrenceStartTime;
	return occurrenceTime;
}

export function getDefaultDeadlineOfWeekdayRepeat({ startTime, endOfDayTimeOfDay }: { startTime: Date; endOfDayTimeOfDay: { hour: number; minute: number } }): Date | null {
	const endOfStartDay = new Date(startTime);
	endOfStartDay.setHours(endOfDayTimeOfDay.hour, endOfDayTimeOfDay.minute, 0, 0);
	if (endOfStartDay.getTime() <= startTime.getTime()) return null;
	return endOfStartDay;
}

export function moveAnchorOccurrenceToFirstRecurrenceWeekday(parameters: {
	startTime: Date;
	endTime: Date | null;
	deadline: Date | null;
	weekdays: Weekday[];
}): { startTime: Date; endTime: Date | null; deadline: Date | null } {
	const daysToMove = getDaysUntilFirstRecurrenceWeekdayOnOrAfter({ date: parameters.startTime, weekdays: parameters.weekdays });
	return {
		startTime: addDays(parameters.startTime, daysToMove),
		endTime: parameters.endTime === null ? null : addDays(parameters.endTime, daysToMove),
		deadline: parameters.deadline === null ? null : addDays(parameters.deadline, daysToMove),
	};
}

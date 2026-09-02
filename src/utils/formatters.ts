export function formatTime(ms: number): string {
	const isNegative = ms < 0;
	let abs = Math.abs(ms);

	const years = Math.floor(abs / 1000 / 60 / 60 / 24 / 365);
	const weeks = Math.floor(abs / 1000 / 60 / 60 / 24 / 7);
	const days = Math.floor(abs / 1000 / 60 / 60 / 24);
	const hours = Math.floor(abs / 1000 / 60 / 60);
	const minutes = Math.floor((abs / 1000 / 60) % 60);
	const seconds = Math.floor((abs / 1000) % 60);
	const msLeft = Math.floor(abs % 1000);

	let result: string;
	if (years > 0) result = `${years} year${years > 1 ? 's' : ''}`;
	else if (weeks > 0) result = `${weeks} week${weeks > 1 ? 's' : ''}`;
	else if (days > 0) result = `${days} day${days > 1 ? 's' : ''}`;
	else if (hours > 0) result = `${hours} hour${hours > 1 ? 's' : ''}`;
	else if (minutes > 0) result = `${minutes} minute${minutes > 1 ? 's' : ''}`;
	else if (seconds > 0) result = `${seconds} second${seconds > 1 ? 's' : ''}`;
	else result = `${msLeft} millisecond${msLeft !== 1 ? 's' : ''}`;

	return isNegative ? `-${result}` : result;
}

import DateUtils from '../model/time-management/DateUtils';
import Duration from '../model/time-management/Duration';
import { TimeUnitName } from '../model/time-management/StandardTimeUnit';

export function formatDate(date: Date | null, fallback = ''): string {
	if (date === null) return fallback;
	return DateUtils.formatDate(date);
}

const TIME_UNIT_NAME_TO_ABBREVIATIONS: Record<TimeUnitName, { singular: string; plural: string }> = {
	[TimeUnitName.Milliseconds]: { singular: 'ms', plural: 'ms' },
	[TimeUnitName.Seconds]: { singular: 'sec', plural: 'sec' },
	[TimeUnitName.Minutes]: { singular: 'min', plural: 'min' },
	[TimeUnitName.Hours]: { singular: 'hr', plural: 'hrs' },
	[TimeUnitName.Days]: { singular: 'day', plural: 'days' },
	[TimeUnitName.Weeks]: { singular: 'week', plural: 'wks' },
	[TimeUnitName.Months]: { singular: 'mo', plural: 'mos' },
	[TimeUnitName.Years]: { singular: 'year', plural: 'yrs' },
};

function getAbbreviatedUnitLabel(amountOfUnits: number, unitName: TimeUnitName): string {
	const abbreviations = TIME_UNIT_NAME_TO_ABBREVIATIONS[unitName];
	return amountOfUnits === 1 ? abbreviations.singular : abbreviations.plural;
}

export function formatAbbreviatedDuration(ms: number): string {
	const duration = Duration.fromMilliseconds(ms);
	const amountOfUnits = duration.getAmountOfUnits();
	const unitName = duration.getTimeUnit().name;
	return `${amountOfUnits} ${getAbbreviatedUnitLabel(amountOfUnits, unitName)}`;
}

export function formatAbbreviatedDurationRange(minMs: number | null, maxMs: number | null): string {
	if (minMs === null && maxMs === null) return '—';

	const startDuration = Duration.fromMilliseconds(minMs ?? 0);
	const endDuration = Duration.fromMilliseconds(maxMs ?? 0);
	const startAmount = startDuration.getAmountOfUnits();
	const startUnitName = startDuration.getTimeUnit().name;
	const endAmount = endDuration.getAmountOfUnits();
	const endUnitName = endDuration.getTimeUnit().name;

	if (startAmount === endAmount && startUnitName === endUnitName) {
		return formatAbbreviatedDuration(minMs ?? maxMs ?? 0);
	}

	if (startUnitName === endUnitName) {
		return `${startAmount}-${endAmount} ${getAbbreviatedUnitLabel(endAmount, endUnitName)}`;
	}

	return `${formatAbbreviatedDuration(minMs ?? 0)}-${formatAbbreviatedDuration(maxMs ?? 0)}`;
}

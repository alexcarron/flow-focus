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

export function formatDate(date: Date | null, fallback = ''): string {
	if (date === null) return fallback;
	return DateUtils.formatDate(date);
}

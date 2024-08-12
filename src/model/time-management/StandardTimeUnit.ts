export enum TimeUnitName  {
	Milliseconds = 'milliseconds',
	Seconds = 'seconds',
	Minutes = 'minutes',
	Hours = 'hours',
	Days = 'days',
	Weeks = 'weeks',
	Months = 'months',
	Years = 'years'
}

export type TimeUnit = {
	name: TimeUnitName
	milliseconds: number
}

export const timeUnits: Record<TimeUnitName, TimeUnit> = {
	[TimeUnitName.Milliseconds]: { name: TimeUnitName.Milliseconds, milliseconds: 1 },
	[TimeUnitName.Seconds]: { name: TimeUnitName.Seconds, milliseconds: 1000 },
	[TimeUnitName.Minutes]: { name: TimeUnitName.Minutes, milliseconds: 1000 * 60 },
	[TimeUnitName.Hours]: { name: TimeUnitName.Hours, milliseconds: 1000 * 60 * 60 },
	[TimeUnitName.Days]: { name: TimeUnitName.Days, milliseconds: 1000 * 60 * 60 * 24 },
	[TimeUnitName.Weeks]: { name: TimeUnitName.Weeks, milliseconds: 1000 * 60 * 60 * 24 * 7 },
	[TimeUnitName.Months]: { name: TimeUnitName.Months, milliseconds: 1000 * 60 * 60 * 24 * 30 },
	[TimeUnitName.Years]: { name: TimeUnitName.Years, milliseconds: 1000 * 60 * 60 * 24 * 365 },
}
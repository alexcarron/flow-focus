import WeeklyDateRange from './WeeklyDateRange';
import DateRange from './DateRange';
import Time from './Time';
import Weekday from './Weekday';

describe('WeeklyDateRange', () => {
  it('should correctly calculate the start and end dates', () => {
    // Setup
    const startWeekday = Weekday.MONDAY; // Monday
    const startTime = new Time(9, 0); // 09:00 AM
    const endWeekday = Weekday.WEDNESDAY; // Wednesday
    const endTime = new Time(17, 0); // 05:00 PM

    const weeklyRange = new WeeklyDateRange(startWeekday, startTime, endWeekday, endTime);

    // Get current date and calculate expected dates
    const now = new Date();
    const currentDay = now.getDay();
    const daysToStart = (startWeekday.valueOf() - currentDay + 7) % 7;
    const startDate = new Date(now.getTime() + daysToStart * 24 * 60 * 60 * 1000);
    startDate.setHours(startTime.getHour(), startTime.getMinute(), 0, 0);

    const daysToEnd = (endWeekday.valueOf() - startWeekday.valueOf() + 7) % 7;
    const endDate = new Date(startDate.getTime() + daysToEnd * 24 * 60 * 60 * 1000);
    endDate.setHours(endTime.getHour(), endTime.getMinute(), 0, 0);

    // Assertions
    expect(weeklyRange.getRepeatInterval()).toBe(1000 * 60 * 60 * 24 * 7);
    expect(weeklyRange.isInRange(startDate)).toBe(true);
    expect(weeklyRange.isInRange(endDate)).toBe(true);
    expect(weeklyRange.isInRange(new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000))).toBe(true); // Within range
    expect(weeklyRange.isInRange(new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000))).toBe(false); // Outside range
  });



  it('should handle a range where start and end are on the same weekday', () => {
    const startWeekday = Weekday.FRIDAY; // Friday
    const startTime = new Time(9, 0); // 09:00 AM
    const endWeekday = Weekday.FRIDAY; // Friday
    const endTime = new Time(17, 0); // 05:00 PM

    const weeklyRange = new WeeklyDateRange(startWeekday, startTime, endWeekday, endTime);

    const now = new Date();
    const currentDay = now.getDay();
    const daysToStart = (startWeekday.valueOf() - currentDay + 7) % 7;
    const startDate = new Date(now.getTime() + daysToStart * 24 * 60 * 60 * 1000);
    startDate.setHours(startTime.getHour(), startTime.getMinute(), 0, 0);

    const endDate = new Date(startDate.getTime());
    endDate.setHours(endTime.getHour(), endTime.getMinute(), 0, 0);

    expect(weeklyRange.getRepeatInterval()).toBe(1000 * 60 * 60 * 24 * 7);
    expect(weeklyRange.isInRange(startDate)).toBe(true);
    expect(weeklyRange.isInRange(endDate)).toBe(true);
    expect(weeklyRange.isInRange(new Date(startDate.getTime() + 1 * 60 * 60 * 1000))).toBe(true); // Within range
    expect(weeklyRange.isInRange(new Date(startDate.getTime() - 1 * 60 * 60 * 1000))).toBe(false); // Outside range
  });

  it('should handle date ranges spanning over weeks', () => {
    const startWeekday = Weekday.THURSDAY; // Thursday
    const startTime = new Time(22, 0); // 10:00 PM
    const endWeekday = Weekday.MONDAY; // Monday
    const endTime = new Time(2, 0); // 02:00 AM

    const weeklyRange = new WeeklyDateRange(startWeekday, startTime, endWeekday, endTime);

    const startDate = new Date();
		startDate.setDate(startDate.getDate() - startDate.getDay() + startWeekday);
		startDate.setHours(startTime.getHour(), startTime.getMinute(), 0, 0);

    const endDate = new Date();
		endDate.setDate(endDate.getDate() - endDate.getDay() + endWeekday);
		endDate.setHours(endTime.getHour(), endTime.getMinute(), 0, 0);

    expect(weeklyRange.getRepeatInterval()).toBe(1000 * 60 * 60 * 24 * 7);
    expect(weeklyRange.isInRange(startDate)).toBe(true);
    expect(weeklyRange.isInRange(endDate)).toBe(true);
    expect(weeklyRange.isInRange(new Date(startDate.getTime() + 24 * 60 * 60 * 1000))).toBe(true); // Within range
    expect(weeklyRange.isInRange(new Date(startDate.getTime() - 24 * 60 * 60 * 1000))).toBe(false); // Outside range
  });

  it('should correctly handle current week dates', () => {
    const startWeekday = new Date().getDay(); // Today
    const startTime = new Time(0, 0); // Start of the day
    const endWeekday = new Date().getDay()+1; // Today
    const endTime = new Time(0, 0); // End of the day

    const weeklyRange = new WeeklyDateRange(startWeekday, startTime, endWeekday, endTime);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    expect(weeklyRange.getRepeatInterval()).toBe(1000 * 60 * 60 * 24 * 7);
    expect(weeklyRange.isInRange(startDate)).toBe(true);
    expect(weeklyRange.isInRange(endDate)).toBe(true);
    expect(weeklyRange.isInRange(new Date(startDate.getTime() + 12 * 60 * 60 * 1000))).toBe(true); // Within range
    expect(weeklyRange.isInRange(new Date(startDate.getTime() - 1 * 60 * 60 * 1000))).toBe(false); // Outside range
  });
});

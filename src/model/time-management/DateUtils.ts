export default class DateUtils {
	static formatDate(date: Date): string {
		const now = new Date();

		// Helper function to format hours and minutes
		const formatTime = (date: Date) => {
			let hours = date.getHours();
			const minutes = date.getMinutes();
			const am_or_pm = hours >= 12 ? 'PM' : 'AM';
			hours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format

			if (minutes === 0) {
				return `${hours}${am_or_pm}`
			}
			else {
				return `${hours}:${minutes.toString().padStart(2, '0')}${am_or_pm}`
			}
		};

		// Helper function to get the month abbreviation
		const getMonthAbbr = (date: Date) => {
			return date.toLocaleString('default', { month: 'short' });
		};

		// Check if date is today
		if (
			date.getFullYear() === now.getFullYear() &&
			date.getMonth() === now.getMonth() &&
			date.getDate() === now.getDate()
		) {
			return formatTime(date);
		}

		// Check if date was yesterday or tomorrow
		const yesterday = new Date(now)
		yesterday.setDate(now.getDate() - 1);
		yesterday.setHours(0, 0, 0, 0);
		const tomorrow = new Date(now)
		tomorrow.setDate(now.getDate() + 2);
		tomorrow.setHours(0, 0, 0, 0);
		if (date >= yesterday && date < now) {
			return `Yesterday ${formatTime(date)}`;
		}
		else if (date <= tomorrow && date > now) {
			return `Tomorrow ${formatTime(date)}`;
		}

		const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

		// Get the start and end of the current week
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Start of current week (Monday)
		startOfWeek.setHours(0, 0, 0, 0);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 7); // End of current week (Sunday)
		endOfWeek.setHours(0, 0, 0, 0);

		// Get the start and end of the last week
		const startOfLastWeek = new Date(startOfWeek);
		startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
		const endOfLastWeek = startOfWeek

		// Get the start and end of the next week
		const startOfNextWeek = endOfWeek
		const endOfNextWeek = new Date(startOfNextWeek);
		endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

		// Check if date is within the current week
		if (date >= startOfWeek && date <= endOfWeek) {
			return `${daysOfWeek[date.getDay()]} ${formatTime(date)}`;
		}

		// Check if date is within the last week
		if (date >= startOfLastWeek && date <= endOfLastWeek) {
			return `Last ${daysOfWeek[date.getDay()]} ${formatTime(date)}`;
		}

		// Check if date is within the next week
		if (date >= startOfNextWeek && date <= endOfNextWeek) {
			return `Next ${daysOfWeek[date.getDay()]} ${formatTime(date)}`;
		}

		// Check if date is in the current year
		if (date.getFullYear() === now.getFullYear()) {
			return `${getMonthAbbr(date)} ${date.getDate()} ${formatTime(date)}`;
		}

		// Format for a different year
		return `${getMonthAbbr(date)} ${date.getDate()} ${date.getFullYear()} ${formatTime(date)}`;
	}
}
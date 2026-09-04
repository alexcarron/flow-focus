export interface AppSettings {
	/** Time used by the "Morning" quick-set buttons when picking a date and time. */
	morningTime: string;
	/** Time used by the "Night" quick-set buttons when picking a date and time. */
	nightTime: string;
	/** Start of the daily sleep window, subtracted from time-to-complete calculations. */
	bedtime: string;
	/** End of the daily sleep window, subtracted from time-to-complete calculations. */
	wakeTime: string;
	/** Whether the Create Task form keeps its field values after creating a task instead of clearing them. */
	shouldKeepTaskDetailsAfterCreating: boolean;
	/** Whether the quick-add task bar shows above the focused task on the Focus page. */
	shouldShowQuickAddTaskBarOnFocusPage: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
	morningTime: '07:00',
	nightTime: '23:00',
	bedtime: '00:00',
	wakeTime: '08:00',
	shouldKeepTaskDetailsAfterCreating: false,
	shouldShowQuickAddTaskBarOnFocusPage: true,
};

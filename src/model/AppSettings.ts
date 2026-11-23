export interface AppSettings {
	morningTime: string;
	nightTime: string;
	shouldIgnoreSleepSchedule: boolean;
	bedtime: string;
	wakeTime: string;
	shouldKeepTaskDetailsAfterCreating: boolean;
	shouldShowQuickAddTaskBarOnFocusPage: boolean;
	shouldShowRemainingTasksSummaryOnFocusPage: boolean;
	shouldShowConfetti: boolean;
	shouldPlayTaskCompletionSound: boolean;
	shouldPlayStepCompletionSound: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
	morningTime: '07:00',
	nightTime: '23:00',
	shouldIgnoreSleepSchedule: false,
	bedtime: '00:00',
	wakeTime: '08:00',
	shouldKeepTaskDetailsAfterCreating: false,
	shouldShowQuickAddTaskBarOnFocusPage: true,
	shouldShowRemainingTasksSummaryOnFocusPage: true,
	shouldShowConfetti: true,
	shouldPlayTaskCompletionSound: true,
	shouldPlayStepCompletionSound: true,
};

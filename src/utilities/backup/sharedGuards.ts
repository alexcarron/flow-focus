import StepStatus from '../../model/task/StepStatus';
import QuickToDoChecklistItem from '../../model/quickToDoChecklist/QuickToDoChecklistItem';

export function isStepStatus(value: unknown): value is StepStatus {
	return typeof value === 'string' && (Object.values(StepStatus) as string[]).includes(value);
}

export function isBackupQuickToDoChecklistItem(value: unknown): value is QuickToDoChecklistItem {
	if (typeof value !== 'object' || value === null) return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item.id === 'string' &&
		typeof item.text === 'string' &&
		typeof item.isChecked === 'boolean' &&
		Array.isArray(item.children) && item.children.every(isBackupQuickToDoChecklistItem)
	);
}

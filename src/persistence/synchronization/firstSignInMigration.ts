import { db, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID } from '../local/flowfocus.db';
import { createSupabaseDataService } from '../cloud/supabaseDataService';
import { useSyncStatusStore } from '../../stores/syncStatusStore';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export async function runFirstSignInMigration(userID: string): Promise<void> {
	const cloudDataService = createSupabaseDataService(userID);

	const cloudAccountAlreadyHasTasks = await cloudDataService.hasAnyTasks();
	if (cloudAccountAlreadyHasTasks) return;

	const [localTaskRows, localSettingsRow, localChecklistRow] = await Promise.all([
		db.tasks.toArray(),
		db.settings.get(SETTINGS_ROW_ID),
		db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID),
	]);

	if (localTaskRows.length === 0 && !localSettingsRow && !localChecklistRow) return;

	useSyncStatusStore.getState().reportSyncStatus({ isSyncing: true, lastSyncError: null, hasUnsyncedChanges: false });

	try {
		await Promise.all([
			...localTaskRows.map(row => cloudDataService.upsertTask(row)),
			localSettingsRow ? cloudDataService.upsertSettings(localSettingsRow) : Promise.resolve(),
			localChecklistRow ? cloudDataService.upsertChecklist(localChecklistRow) : Promise.resolve(),
		]);

		await Promise.all([
			db.tasks.clear(),
			db.settings.clear(),
			db.quickToDoChecklist.clear(),
		]);

		useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: null, hasUnsyncedChanges: false });
	}
	catch (error) {
		useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: errorMessage(error), hasUnsyncedChanges: true });
	}
}

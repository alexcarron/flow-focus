import { db, PlainTaskRow, QuickToDoChecklistRow, SettingsRow, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID } from '../local/flowfocus.db';
import { createSupabaseDataService, SupabaseDataService } from '../cloud/supabaseDataService';
import { useSyncStatusStore } from '../../stores/syncStatusStore';
import { toErrorMessage } from '../../utilities/errorMessage';

export async function doesLocalDataNeedMigrationToCloud(userID: string): Promise<boolean> {
	const cloudDataService = createSupabaseDataService(userID);
	const cloudAccountAlreadyHasTasks = await cloudDataService.hasAnyTasks();
	if (cloudAccountAlreadyHasTasks) 
		return false;

	const [localTaskRows, localSettingsRow, localChecklistRow] = await Promise.all([
		db.tasks.toArray(),
		db.settings.get(SETTINGS_ROW_ID),
		db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID),
	]);

	return localTaskRows.length > 0 || !!localSettingsRow || !!localChecklistRow;
}

async function isMigratedDataVerifiedInCloud({
	cloudDataService,
	localTaskRows,
	localSettingsRow,
	localChecklistRow,
}: {
	cloudDataService: SupabaseDataService;
	localTaskRows: PlainTaskRow[];
	localSettingsRow: SettingsRow | undefined;
	localChecklistRow: QuickToDoChecklistRow | undefined;
}): Promise<boolean> {
	const [cloudTasks, cloudSettings, cloudChecklist] = await Promise.all([
		cloudDataService.pullTasks(),
		localSettingsRow ? cloudDataService.pullSettings(localSettingsRow.id) : Promise.resolve(undefined),
		localChecklistRow ? cloudDataService.pullChecklist(localChecklistRow.id) : Promise.resolve(undefined),
	]);

	const cloudTaskIDs = new Set(cloudTasks.map(row => row.id));
	const areAllTasksPersisted = localTaskRows.every(row => cloudTaskIDs.has(row.id));
	const isSettingsPersisted = !localSettingsRow || cloudSettings !== undefined;
	const isChecklistPersisted = !localChecklistRow || cloudChecklist !== undefined;

	return areAllTasksPersisted && isSettingsPersisted && isChecklistPersisted;
}

export async function migrateLocalDataToCloud({ userID, shouldKeepLocalData }: { userID: string; shouldKeepLocalData: boolean }): Promise<boolean> {
	const cloudDataService = createSupabaseDataService(userID);

	const [localTaskRows, localSettingsRow, localChecklistRow] = await Promise.all([
		db.tasks.toArray(),
		db.settings.get(SETTINGS_ROW_ID),
		db.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID),
	]);

	useSyncStatusStore.getState().reportSyncStatus({ isSyncing: true, lastSyncError: null, hasUnsyncedChanges: false });

	try {
		await Promise.all([
			...localTaskRows.map(row => cloudDataService.upsertTask(row)),
			localSettingsRow ? cloudDataService.upsertSettings(localSettingsRow) : Promise.resolve(),
			localChecklistRow ? cloudDataService.upsertChecklist(localChecklistRow) : Promise.resolve(),
		]);

		if (!shouldKeepLocalData) {
			const isVerified = await isMigratedDataVerifiedInCloud({
				cloudDataService,
				localTaskRows,
				localSettingsRow,
				localChecklistRow,
			});
			if (!isVerified) {
				throw new Error('Could not verify that your data was saved to your account, so the local copy was kept.');
			}

			await Promise.all([
				db.tasks.clear(),
				db.settings.clear(),
				db.quickToDoChecklist.clear(),
			]);
		}

		useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: null, hasUnsyncedChanges: false });
		return true;
	}
	catch (error) {
		useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: toErrorMessage(error), hasUnsyncedChanges: true });
		return false;
	}
}

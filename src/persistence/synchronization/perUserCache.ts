import { FlowFocusDB, SETTINGS_ROW_ID, QUICK_TO_DO_CHECKLIST_ROW_ID } from '../local/flowfocus.db';

function getUserCacheDatabaseName(userID: string): string {
	return `FlowFocusDB-user-cache-${userID}`;
}

let activeUserCacheDatabase: FlowFocusDB | undefined;
let activeUserID: string | undefined;

export function openUserCacheDatabase(userID: string): FlowFocusDB {
	if (activeUserCacheDatabase && activeUserID === userID) {
		return activeUserCacheDatabase;
	}

	closeActiveUserCacheDatabase();

	activeUserCacheDatabase = new FlowFocusDB(getUserCacheDatabaseName(userID));
	activeUserID = userID;
	return activeUserCacheDatabase;
}

export function getActiveUserCacheDatabase(): FlowFocusDB | undefined {
	return activeUserCacheDatabase;
}

export function closeActiveUserCacheDatabase(): void {
	if (!activeUserCacheDatabase) return;

	activeUserCacheDatabase.close();
	activeUserCacheDatabase = undefined;
	activeUserID = undefined;
}

export async function hasUnsyncedCachedChanges(cacheDB: FlowFocusDB | undefined = activeUserCacheDatabase): Promise<boolean> {
	if (!cacheDB) return false;

	const [unsyncedTaskCount, settingsRow, checklistRow] = await Promise.all([
		cacheDB.tasks.filter(row => !row.isSynced).count(),
		cacheDB.settings.get(SETTINGS_ROW_ID),
		cacheDB.quickToDoChecklist.get(QUICK_TO_DO_CHECKLIST_ROW_ID),
	]);

	return (
		unsyncedTaskCount > 0 || 
		Boolean(settingsRow && !settingsRow.isSynced) || 
		Boolean(checklistRow && !checklistRow.isSynced)
	);
}

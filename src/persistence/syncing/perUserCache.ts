import { FlowFocusDB } from '../../db/flowfocus.db';

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

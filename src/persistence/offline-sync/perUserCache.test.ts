import { describe, it, expect, afterEach } from 'vitest';
import Dexie from 'dexie';
import { openUserCacheDatabase, getActiveUserCacheDatabase, closeActiveUserCacheDatabase } from './perUserCache';

const USER_A_ID = 'user-a-uuid';
const USER_B_ID = 'user-b-uuid';

afterEach(async () => {
	closeActiveUserCacheDatabase();
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_A_ID}`);
	await Dexie.delete(`FlowFocusDB-user-cache-${USER_B_ID}`);
});

describe('opening a user cache database', () => {
	it('opens a database named after the user id and shares the FlowFocusDB schema', async () => {
		const userACacheDatabase = openUserCacheDatabase(USER_A_ID);
		await userACacheDatabase.open();

		expect(userACacheDatabase.name).toBe(`FlowFocusDB-user-cache-${USER_A_ID}`);
		expect(await userACacheDatabase.tasks.toArray()).toEqual([]);
		expect(await userACacheDatabase.settings.toArray()).toEqual([]);
		expect(await userACacheDatabase.quickToDoChecklist.toArray()).toEqual([]);
	});

	it('returns the same instance when reopened for the same user', () => {
		const firstOpen = openUserCacheDatabase(USER_A_ID);
		const secondOpen = openUserCacheDatabase(USER_A_ID);

		expect(secondOpen).toBe(firstOpen);
	});
});

describe('user cache database lifecycle', () => {
	it('switches the active database when a different user opens theirs', async () => {
		const userACacheDatabase = openUserCacheDatabase(USER_A_ID);
		await userACacheDatabase.open();

		const userBCacheDatabase = openUserCacheDatabase(USER_B_ID);

		expect(getActiveUserCacheDatabase()).toBe(userBCacheDatabase);
		expect(getActiveUserCacheDatabase()).not.toBe(userACacheDatabase);
		expect(userACacheDatabase.isOpen()).toBe(false);
	});

	it('leaves no active user database after sign-out', () => {
		openUserCacheDatabase(USER_A_ID);
		closeActiveUserCacheDatabase();

		expect(getActiveUserCacheDatabase()).toBeUndefined();
	});
});

import { describe, it, expect } from 'vitest';
import { useSyncStatusStore } from './syncStatusStore';

describe('useSyncStatusStore', () => {
	it('starts idle with no error and nothing unsynced', () => {
		expect(useSyncStatusStore.getState()).toMatchObject({
			isSyncing: false,
			lastSyncError: null,
			hasUnsyncedChanges: false,
		});
	});

	it('overwrites the status fields when a status is reported', () => {
		useSyncStatusStore.getState().reportSyncStatus({
			isSyncing: true,
			lastSyncError: 'network blip',
			hasUnsyncedChanges: true,
		});

		expect(useSyncStatusStore.getState()).toMatchObject({
			isSyncing: true,
			lastSyncError: 'network blip',
			hasUnsyncedChanges: true,
		});
	});

	it('restores the initial state on reset', () => {
		useSyncStatusStore.getState().reportSyncStatus({
			isSyncing: true,
			lastSyncError: 'network blip',
			hasUnsyncedChanges: true,
		});

		useSyncStatusStore.getState().reset();

		expect(useSyncStatusStore.getState()).toMatchObject({
			isSyncing: false,
			lastSyncError: null,
			hasUnsyncedChanges: false,
		});
	});
});

import { useSyncExternalStore } from 'react';
import { useSyncStatusStore } from '../stores/syncStatusStore';

export type SyncStatusIndicatorState = 'synced' | 'syncing' | 'offline' | 'unsynced' | 'syncFailed';

interface SyncStatusIndicatorResult {
	state: SyncStatusIndicatorState;
	tooltipText: string;
}

function subscribeToOnlineStatusChanges(onOnlineStatusChange: () => void): () => void {
	window.addEventListener('online', onOnlineStatusChange);
	window.addEventListener('offline', onOnlineStatusChange);
	return () => {
		window.removeEventListener('online', onOnlineStatusChange);
		window.removeEventListener('offline', onOnlineStatusChange);
	};
}

function getIsOnline(): boolean {
	return navigator.onLine;
}

function useIsOnline(): boolean {
	return useSyncExternalStore(subscribeToOnlineStatusChanges, getIsOnline);
}

export function useSyncStatusIndicator(): SyncStatusIndicatorResult {
	const isOnline = useIsOnline();
	const isSyncing = useSyncStatusStore(state => state.isSyncing);
	const lastSyncError = useSyncStatusStore(state => state.lastSyncError);
	const hasUnsyncedChanges = useSyncStatusStore(state => state.hasUnsyncedChanges);

	if (!isOnline) {
		return {
			state: 'offline',
			tooltipText: hasUnsyncedChanges ? 'Offline. Changes will sync when back online' : 'Offline',
		};
	}
	if (isSyncing) {
		return { state: 'syncing', tooltipText: 'Syncing…' };
	}
	if (lastSyncError) {
		return { state: 'syncFailed', tooltipText: 'Sync failed. Your changes are saved locally and will sync once this is resolved.' };
	}
	if (hasUnsyncedChanges) {
		return { state: 'unsynced', tooltipText: 'Changes not yet synced' };
	}
	return { state: 'synced', tooltipText: 'Online and synced changes' };
}

import { useEffect, useState } from 'react';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import { toErrorMessage } from '../utilities/errorMessage';

export type SyncStatusIndicatorState = 'synced' | 'syncing' | 'offline' | 'unsynced';

interface SyncStatusIndicatorResult {
	state: SyncStatusIndicatorState;
	tooltipText: string;
}

function useIsOnline(): boolean {
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	useEffect(() => {
		function handleOnline() {
			setIsOnline(true);
		}
		function handleOffline() {
			setIsOnline(false);
		}
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	return isOnline;
}

export function useSyncStatusIndicator(): SyncStatusIndicatorResult {
	const isOnline = useIsOnline();
	const isSyncing = useSyncStatusStore(state => state.isSyncing);
	const lastSyncError = useSyncStatusStore(state => state.lastSyncError);
	const hasUnsyncedChanges = useSyncStatusStore(state => state.hasUnsyncedChanges);

	if (!isOnline) {
		return { state: 'offline', tooltipText: 'Offline' };
	}
	if (hasUnsyncedChanges || lastSyncError) {
		return {
			state: 'unsynced',
			tooltipText: lastSyncError ? `Sync failed: ${toErrorMessage(lastSyncError)}` : 'Unsynced changes pending',
		};
	}
	if (isSyncing) {
		return { state: 'syncing', tooltipText: 'Syncing…' };
	}
	return { state: 'synced', tooltipText: 'Online and synced' };
}

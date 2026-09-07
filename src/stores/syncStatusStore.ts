import { create } from 'zustand';
import { SyncStatusSnapshot } from '../persistence/synchronization/LocalCloudDataSynchronizer';

interface SyncStatusActions {
	reportSyncStatus: (status: SyncStatusSnapshot) => void;
	reset: () => void;
}

const INITIAL_STATUS: SyncStatusSnapshot = {
	isSyncing: false,
	lastSyncError: null,
	hasUnsyncedChanges: false,
};

export const useSyncStatusStore = create<SyncStatusSnapshot & SyncStatusActions>()(set => ({
	...INITIAL_STATUS,

	reportSyncStatus(status: SyncStatusSnapshot) {
		set(status);
	},

	reset() {
		set(INITIAL_STATUS);
	},
}));

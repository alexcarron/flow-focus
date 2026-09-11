import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncStatusIndicator } from './useSyncStatusIndicator';
import { useSyncStatusStore } from '../stores/syncStatusStore';

function setOnline(isOnline: boolean): void {
	Object.defineProperty(navigator, 'onLine', { value: isOnline, configurable: true });
}

beforeEach(() => {
	setOnline(true);
	act(() => useSyncStatusStore.getState().reset());
});

describe('useSyncStatusIndicator', () => {
	it('shows syncing, not unsynced, while a pass is actively running even though hasUnsyncedChanges is still stale-true from before the pass started', () => {
		act(() => useSyncStatusStore.getState().reportSyncStatus({ isSyncing: true, lastSyncError: null, hasUnsyncedChanges: true }));

		const { result } = renderHook(() => useSyncStatusIndicator());

		expect(result.current).toEqual({ state: 'syncing', tooltipText: 'Syncing…' });
	});

	it('shows unsynced changes pending once a pass has finished and left something outstanding', () => {
		act(() => useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: null, hasUnsyncedChanges: true }));

		const { result } = renderHook(() => useSyncStatusIndicator());

		expect(result.current).toEqual({ state: 'unsynced', tooltipText: 'Changes not yet synced' });
	});

	it('shows the sync error once a pass has finished and failed', () => {
		act(() => useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: 'network blip', hasUnsyncedChanges: false }));

		const { result } = renderHook(() => useSyncStatusIndicator());

		expect(result.current).toEqual({ state: 'unsynced', tooltipText: 'Sync failed: network blip' });
	});

	it('mentions pending changes while offline instead of hiding them', () => {
		setOnline(false);
		act(() => useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: null, hasUnsyncedChanges: true }));

		const { result } = renderHook(() => useSyncStatusIndicator());

		expect(result.current).toEqual({ state: 'offline', tooltipText: 'Offline. Changes will sync when back online' });
	});

	it('shows a plain offline tooltip when there is nothing pending', () => {
		setOnline(false);

		const { result } = renderHook(() => useSyncStatusIndicator());

		expect(result.current).toEqual({ state: 'offline', tooltipText: 'Offline' });
	});

	it('shows synced once a pass has finished with nothing outstanding and no error', () => {
		act(() => useSyncStatusStore.getState().reportSyncStatus({ isSyncing: false, lastSyncError: null, hasUnsyncedChanges: false }));

		const { result } = renderHook(() => useSyncStatusIndicator());

		expect(result.current).toEqual({ state: 'synced', tooltipText: 'Online and synced changes' });
	});
});

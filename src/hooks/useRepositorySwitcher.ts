import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { requestCloudSync, switchRepositoriesToCloud, switchRepositoriesToLocal } from '../persistence/synchronization/repository-switchers';
import { doesLocalDataNeedMigrationToCloud, migrateLocalDataToCloud } from '../persistence/synchronization/firstSignInMigration';
import { useTasksStore } from '../stores/tasksStore';

export interface UseRepositorySwitcherAPI {
	readonly isMigrationConfirmationRequired: boolean;
	confirmMigration(shouldKeepLocalData: boolean): Promise<void>;
	declineMigration(): Promise<void>;
}

export function useRepositorySwitcher(user: User | null, isAuthStateStillLoading: boolean): UseRepositorySwitcherAPI {
	const userIDRepositoryIsBoundTo = useRef<string | null>(null);
	const latestRepositorySwitchID = useRef(0);
	const stopWaitingForOnlineToRecheckMigrationRef = useRef<(() => void) | null>(null);
	const [pendingMigrationUserID, setPendingMigrationUserID] = useState<string | null>(null);

	useEffect(() => {
		if (isAuthStateStillLoading) return;

		const nextUserIDRepositoryIsBoundTo = user?.id ?? null;
		if (userIDRepositoryIsBoundTo.current === nextUserIDRepositoryIsBoundTo) return;
		userIDRepositoryIsBoundTo.current = nextUserIDRepositoryIsBoundTo;

		latestRepositorySwitchID.current += 1;
		const thisRepositorySwitchID = latestRepositorySwitchID.current;
		const isRepositorySwitchStale = () => latestRepositorySwitchID.current !== thisRepositorySwitchID;

		setPendingMigrationUserID(null);
		stopWaitingForOnlineToRecheckMigrationRef.current?.();
		stopWaitingForOnlineToRecheckMigrationRef.current = null;

		if (!user) {
			void switchRepositoriesToLocal().catch(error => {
				console.error('Failed to switch to local repositories', error);
				useTasksStore.setState({ isLoading: false });
			});
			return;
		}

		const userID = user.id;

		async function checkWhetherLocalDataNeedsMigration(): Promise<void> {
			try {
				const needsMigrationConfirmation = await doesLocalDataNeedMigrationToCloud(userID);
				if (isRepositorySwitchStale()) return;
				if (needsMigrationConfirmation) setPendingMigrationUserID(userID);
			} catch (error) {
				console.error('Could not check whether local data needs migrating to the cloud, will retry when back online', error);
				if (isRepositorySwitchStale()) return;
				window.addEventListener('online', retryMigrationCheckWhenOnline);
				stopWaitingForOnlineToRecheckMigrationRef.current = () => window.removeEventListener('online', retryMigrationCheckWhenOnline);
			}
		}

		function retryMigrationCheckWhenOnline(): void {
			stopWaitingForOnlineToRecheckMigrationRef.current?.();
			stopWaitingForOnlineToRecheckMigrationRef.current = null;
			if (isRepositorySwitchStale()) return;
			void checkWhetherLocalDataNeedsMigration();
		}

		void (async () => {
			try {
				await switchRepositoriesToCloud(userID, isRepositorySwitchStale);
			} catch (error) {
				console.error('Failed to switch to cloud repositories', error);
				useTasksStore.setState({ isLoading: false });
				return;
			}
			if (isRepositorySwitchStale()) return;
			await checkWhetherLocalDataNeedsMigration();
		})();
	}, [user, isAuthStateStillLoading]);

	const confirmMigration = useCallback(async (shouldKeepLocalData: boolean): Promise<void> => {
		if (!pendingMigrationUserID) return;
		const userID = pendingMigrationUserID;
		const isRepositorySwitchStale = () => userIDRepositoryIsBoundTo.current !== userID;

		setPendingMigrationUserID(null);
		const didMigrationSucceed = await migrateLocalDataToCloud({ userID, shouldKeepLocalData });
		if (isRepositorySwitchStale()) return;

		if (!didMigrationSucceed) {
			setPendingMigrationUserID(userID);
			return;
		}

		await requestCloudSync();
	}, [pendingMigrationUserID]);

	const declineMigration = useCallback(async (): Promise<void> => {
		if (!pendingMigrationUserID) return;
		setPendingMigrationUserID(null);
	}, [pendingMigrationUserID]);

	return {
		isMigrationConfirmationRequired: pendingMigrationUserID !== null,
		confirmMigration,
		declineMigration,
	};
}

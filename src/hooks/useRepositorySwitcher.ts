import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { switchRepositoriesToCloud, switchRepositoriesToLocal } from '../persistence/synchronization/repository-switchers';
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

		if (user) {
			useTasksStore.setState({ isLoading: true });

			void (async () => {
				const needsMigrationConfirmation = await doesLocalDataNeedMigrationToCloud(user.id);
				if (isRepositorySwitchStale()) return;

				if (needsMigrationConfirmation) {
					setPendingMigrationUserID(user.id);
					return;
				}

				await switchRepositoriesToCloud(user.id, isRepositorySwitchStale);
			})();
		}
		else {
			void switchRepositoriesToLocal();
		}
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

		await switchRepositoriesToCloud(userID, isRepositorySwitchStale);
	}, [pendingMigrationUserID]);

	const declineMigration = useCallback(async (): Promise<void> => {
		if (!pendingMigrationUserID) return;
		const userID = pendingMigrationUserID;
		const isRepositorySwitchStale = () => userIDRepositoryIsBoundTo.current !== userID;

		setPendingMigrationUserID(null);
		await switchRepositoriesToCloud(userID, isRepositorySwitchStale);
	}, [pendingMigrationUserID]);

	return {
		isMigrationConfirmationRequired: pendingMigrationUserID !== null,
		confirmMigration,
		declineMigration,
	};
}

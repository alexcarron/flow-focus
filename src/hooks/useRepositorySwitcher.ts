import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { switchRepositoriesToCloud, switchRepositoriesToLocal } from '../persistence/synchronization/repository-switchers';

export function useRepositorySwitcher(user: User | null): void {
	const userIDRepositoryIsBoundTo = useRef<string | null>(null);
	const latestRepositorySwitchID = useRef(0);

	useEffect(() => {
		const nextUserIDRepositoryIsBoundTo = user?.id ?? null;
		if (userIDRepositoryIsBoundTo.current === nextUserIDRepositoryIsBoundTo) return;
		userIDRepositoryIsBoundTo.current = nextUserIDRepositoryIsBoundTo;

		latestRepositorySwitchID.current += 1;
		const thisRepositorySwitchID = latestRepositorySwitchID.current;
		const isRepositorySwitchStale = () => latestRepositorySwitchID.current !== thisRepositorySwitchID;

		if (user) {
			void switchRepositoriesToCloud(user.id, isRepositorySwitchStale);
		} 
		else {
			void switchRepositoriesToLocal();
		}
	}, [user]);
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
	fetchProfile,
	getSession,
	onAuthStateChange,
	signInWithGoogle,
	signOut as signOutOfSupabase,
	updateDisplayName as updateDisplayNameOfProfile,
	resolveDisplayName,
	type UserProfile,
} from '../user-authorization/userAuthorizationService';

export interface UseUserAuthorizationApi {
	readonly user: User | null;
	readonly profile: UserProfile | null;
	readonly displayName: string | null;
	readonly isLoading: boolean;
	signInWithGoogle(): Promise<void>;
	signOut(): Promise<void>;
	updateDisplayName(name: string): Promise<void>;
}

export function useUserAuthorization(): UseUserAuthorizationApi {
	const [user, setUser] = useState<User | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const isMounted = useRef(true);

	const loadUserProfile = useCallback(async (user: User | null): Promise<void> => {
		if (!user) {
			if (isMounted.current) setUserProfile(null);
			return;
		}
		const nextProfile = await fetchProfile(user.id);
		if (isMounted.current) setUserProfile(nextProfile);
	}, []);

	useEffect(() => {
		isMounted.current = true;

		void (async () => {
			const session = await getSession();
			
			if (!isMounted.current) return;
			
			setUser(session?.user ?? null);
			
			await loadUserProfile(session?.user ?? null);
			
			if (isMounted.current) 
				setIsLoading(false);
		})();

		const subscription = onAuthStateChange((session) => {
			setUser(session?.user ?? null);
			void loadUserProfile(session?.user ?? null);
		});

		return () => {
			isMounted.current = false;
			subscription.unsubscribe();
		};
	}, [loadUserProfile]);

	const updateDisplayName = useCallback(
		async (name: string): Promise<void> => {
			if (!user) 
				throw new Error('Cannot update display name while signed out');
			
			const userProfile = await updateDisplayNameOfProfile(user.id, name);
			if (isMounted.current) 
				setUserProfile(userProfile);
		},
		[user],
	);

	const signOut = useCallback(async (): Promise<void> => {
		await signOutOfSupabase();
		if (isMounted.current) {
			setUser(null);
			setUserProfile(null);
		}
	}, []);

	const displayName = useMemo(
		() => (user ? resolveDisplayName(user, userProfile) : null),
		[user, userProfile],
	);

	return useMemo<UseUserAuthorizationApi>(
		() => ({ user, profile: userProfile, displayName, isLoading, signInWithGoogle, signOut, updateDisplayName }),
		[user, userProfile, displayName, isLoading, signOut, updateDisplayName],
	);
}

import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from './userAuthorizationService';
import { hasUnsyncedCachedChanges } from '../persistence/synchronization/perUserCache';

export interface UseUserAuthorizationApi {
	readonly user: User | null;
	readonly profile: UserProfile | null;
	readonly displayName: string | null;
	readonly isLoading: boolean;
	readonly isSignOutConfirmationRequired: boolean;
	signInWithGoogle(): Promise<void>;
	signOut(): Promise<void>;
	confirmSignOut(): Promise<void>;
	cancelSignOutConfirmation(): void;
	updateDisplayName(name: string): Promise<void>;
}

export const UserAuthorizationContext = createContext<UseUserAuthorizationApi | null>(null);

export function UserAuthorizationProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSignOutConfirmationRequired, setIsSignOutConfirmationRequired] = useState(false);
	const isMounted = useRef(true);

	const loadUserProfile = useCallback(async (user: User | null): Promise<void> => {
		if (!user) {
			if (isMounted.current) setUserProfile(null);
			return;
		}
		try {
			const nextProfile = await fetchProfile(user.id);
			if (isMounted.current) setUserProfile(nextProfile);
		} catch (error) {
			console.error('Failed to load the signed-in user profile, falling back to the account name', error);
			if (isMounted.current) setUserProfile(null);
		}
	}, []);

	useEffect(() => {
		isMounted.current = true;

		void (async () => {
			try {
				const session = await getSession();
				if (!isMounted.current) return;
				setUser(session?.user ?? null);
				await loadUserProfile(session?.user ?? null);
			} catch (error) {
				console.error('Failed to restore the signed-in session, continuing signed out', error);
				if (isMounted.current) setUser(null);
			} finally {
				if (isMounted.current) setIsLoading(false);
			}
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

	const performSignOut = useCallback(async (): Promise<void> => {
		await signOutOfSupabase();
		if (isMounted.current) {
			setUser(null);
			setUserProfile(null);
			setIsSignOutConfirmationRequired(false);
		}
	}, []);

	const signOut = useCallback(async (): Promise<void> => {
		if (await hasUnsyncedCachedChanges()) {
			if (isMounted.current) setIsSignOutConfirmationRequired(true);
			return;
		}
		await performSignOut();
	}, [performSignOut]);

	const confirmSignOut = useCallback(async (): Promise<void> => {
		await performSignOut();
	}, [performSignOut]);

	const cancelSignOutConfirmation = useCallback((): void => {
		setIsSignOutConfirmationRequired(false);
	}, []);

	const displayName = useMemo(
		() => (user ? resolveDisplayName(user, userProfile) : null),
		[user, userProfile],
	);

	const userAuthorization = useMemo<UseUserAuthorizationApi>(
		() => ({
			user,
			profile: userProfile,
			displayName,
			isLoading,
			isSignOutConfirmationRequired,
			signInWithGoogle,
			signOut,
			confirmSignOut,
			cancelSignOutConfirmation,
			updateDisplayName,
		}),
		[user, userProfile, displayName, isLoading, isSignOutConfirmationRequired, signOut, confirmSignOut, cancelSignOutConfirmation, updateDisplayName],
	);

	return (
		<UserAuthorizationContext.Provider value={userAuthorization}>
			{children}
		</UserAuthorizationContext.Provider>
	);
}

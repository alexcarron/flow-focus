import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase } from '../persistence/cloud/supabaseClient';

export interface UserProfile {
	id: string;
	displayName: string | null;
}

export async function getSession(): Promise<Session | null> {
	if (!isSupabaseConfigured) return null;
	const { data } = await requireSupabase().auth.getSession();
	return data.session;
}

export function onAuthStateChange(
	callback: (session: Session | null) => void,
): { unsubscribe(): void } {
	if (!isSupabaseConfigured) return { unsubscribe: () => {} };
	const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => callback(session));
	return { unsubscribe: () => data.subscription.unsubscribe() };
}

export async function signInWithGoogle(): Promise<void> {
	if (!isSupabaseConfigured) {
		throw new Error('Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
	}
	const redirectTo = window.location.origin + import.meta.env.BASE_URL;
	const { error } = await requireSupabase().auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo },
	});
	if (error) throw error;
}

export async function signOut(): Promise<void> {
	const { error } = await requireSupabase().auth.signOut();
	if (error) throw error;
}

export async function fetchProfile(userID: string): Promise<UserProfile> {
	const { data, error } = await requireSupabase()
		.from('profiles')
		.select('id, display_name')
		.eq('id', userID)
		.single();
	if (error) throw error;
	return { id: data.id, displayName: data.display_name };
}

export async function updateDisplayName(userID: string, displayName: string): Promise<UserProfile> {
	const trimmed = displayName.trim();
	if (!trimmed) throw new Error('Display name cannot be empty');
	const { data, error } = await requireSupabase()
		.from('profiles')
		.update({ display_name: trimmed })
		.eq('id', userID)
		.select('id, display_name')
		.single();
	if (error) throw error;
	return { id: data.id, displayName: data.display_name };
}

export function resolveDisplayName(user: User, profile: UserProfile | null): string {
	if (profile?.displayName) return profile.displayName;
	const metadataFullName = user.user_metadata?.full_name;
	if (typeof metadataFullName === 'string' && metadataFullName.trim()) return metadataFullName;
	return user.email ?? 'Signed in';
}

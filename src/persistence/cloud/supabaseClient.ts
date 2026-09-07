import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = Boolean(
	import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
	? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
	: null;

export function requireSupabase(): SupabaseClient {
	if (!supabase) throw new Error('Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)');
	return supabase;
}

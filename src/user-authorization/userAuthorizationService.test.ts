import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProfile, updateDisplayName, resolveDisplayName } from './userAuthorizationService';
import type { User } from '@supabase/supabase-js';

const singleMock = vi.fn();
const selectEqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: selectEqMock }));
const updateSelectMock = vi.fn(() => ({ single: singleMock }));
const updateEqMock = vi.fn(() => ({ select: updateSelectMock }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock }));

vi.mock('../persistence/cloud/supabaseClient', () => ({
	isSupabaseConfigured: true,
	requireSupabase: () => ({ from: fromMock }),
}));

beforeEach(() => {
	singleMock.mockReset();
	selectEqMock.mockClear();
	updateSelectMock.mockClear();
	updateEqMock.mockClear();
	updateMock.mockClear();
	selectMock.mockClear();
	fromMock.mockClear();
});

describe('fetchProfile', () => {
	it('returns the profile with its display name mapped from the snake_case column', async () => {
		singleMock.mockResolvedValue({ data: { id: 'user-1', display_name: 'Alex' }, error: null });

		const profile = await fetchProfile('user-1');

		expect(fromMock).toHaveBeenCalledWith('profiles');
		expect(profile).toEqual({ id: 'user-1', displayName: 'Alex' });
	});

	it('throws when the query returns an error', async () => {
		singleMock.mockResolvedValue({ data: null, error: new Error('not found') });

		await expect(fetchProfile('user-1')).rejects.toThrow('not found');
	});
});

describe('updateDisplayName', () => {
	it('trims the name and writes it to the profiles row', async () => {
		singleMock.mockResolvedValue({ data: { id: 'user-1', display_name: 'Alex' }, error: null });

		const profile = await updateDisplayName('user-1', '  Alex  ');

		expect(updateMock).toHaveBeenCalledWith({ display_name: 'Alex' });
		expect(profile).toEqual({ id: 'user-1', displayName: 'Alex' });
	});

	it('rejects a blank name without calling supabase', async () => {
		await expect(updateDisplayName('user-1', '   ')).rejects.toThrow('Display name cannot be empty');
		expect(updateMock).not.toHaveBeenCalled();
	});
});

describe('resolveDisplayName', () => {
	const baseUser = { id: 'user-1', email: 'alex@example.com', user_metadata: {} } as unknown as User;

	it('prefers the profile display name', () => {
		expect(resolveDisplayName(baseUser, { id: 'user-1', displayName: 'Alex' })).toBe('Alex');
	});

	it('falls back to the Google full name when there is no profile display name', () => {
		const user = { ...baseUser, user_metadata: { full_name: 'Alex Carron' } } as unknown as User;
		expect(resolveDisplayName(user, null)).toBe('Alex Carron');
	});

	it('falls back to the email when neither profile nor metadata name exist', () => {
		expect(resolveDisplayName(baseUser, null)).toBe('alex@example.com');
	});
});

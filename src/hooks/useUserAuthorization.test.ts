import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserAuthorization } from './useUserAuthorization';
import type { Session, User } from '@supabase/supabase-js';

const getSessionMock = vi.fn<() => Promise<Session | null>>();
const onAuthStateChangeMock = vi.fn();
const unsubscribeMock = vi.fn();
const fetchProfileMock = vi.fn();
const signOutMock = vi.fn();
const updateDisplayNameMock = vi.fn();
let authStateChangeCallback: (session: Session | null) => void = () => {};

vi.mock('../user-authorization/userAuthorizationService', () => ({
	getSession: () => getSessionMock(),
	onAuthStateChange: (callback: (session: Session | null) => void) => {
		authStateChangeCallback = callback;
		return onAuthStateChangeMock(callback);
	},
	signInWithGoogle: vi.fn(),
	signOut: () => signOutMock(),
	fetchProfile: (userID: string) => fetchProfileMock(userID),
	updateDisplayName: (userID: string, name: string) => updateDisplayNameMock(userID, name),
	resolveDisplayName: (user: User, profile: { displayName: string | null } | null) =>
		profile?.displayName ?? user.email ?? 'Signed in',
}));

function makeUser(overrides: Partial<User> = {}): User {
	return { id: 'user-1', email: 'alex@example.com', user_metadata: {} } as User;
}

function makeSession(user: User): Session {
	return { user } as Session;
}

beforeEach(() => {
	getSessionMock.mockReset();
	onAuthStateChangeMock.mockReset().mockReturnValue({ unsubscribe: unsubscribeMock });
	unsubscribeMock.mockReset();
	fetchProfileMock.mockReset().mockResolvedValue({ id: 'user-1', displayName: 'Alex' });
	signOutMock.mockReset();
	updateDisplayNameMock.mockReset();
});

describe('useUserAuthorization', () => {
	it('restores an existing session and its profile on mount', async () => {
		const user = makeUser();
		getSessionMock.mockResolvedValue(makeSession(user));

		const { result } = renderHook(() => useUserAuthorization());

		expect(result.current.isLoading).toBe(true);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.user).toEqual(user);
	});

	it('starts signed out with no session on mount', async () => {
		getSessionMock.mockResolvedValue(null);

		const { result } = renderHook(() => useUserAuthorization());

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.user).toBeNull();
		expect(result.current.displayName).toBeNull();
	});

	it('updates state when a live auth event fires', async () => {
		getSessionMock.mockResolvedValue(null);
		const { result } = renderHook(() => useUserAuthorization());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		const user = makeUser();
		act(() => {
			authStateChangeCallback(makeSession(user));
		});

		await waitFor(() => expect(result.current.user).toEqual(user));
	});

	it('clears user and profile on sign out', async () => {
		const user = makeUser();
		getSessionMock.mockResolvedValue(makeSession(user));
		const { result } = renderHook(() => useUserAuthorization());
		await waitFor(() => expect(result.current.user).toEqual(user));

		await act(async () => {
			await result.current.signOut();
		});

		expect(signOutMock).toHaveBeenCalled();
		expect(result.current.user).toBeNull();
		expect(result.current.profile).toBeNull();
	});

	it('unsubscribes from auth state changes on unmount', async () => {
		getSessionMock.mockResolvedValue(null);
		const { unmount } = renderHook(() => useUserAuthorization());
		await waitFor(() => expect(onAuthStateChangeMock).toHaveBeenCalled());

		unmount();

		expect(unsubscribeMock).toHaveBeenCalled();
	});

	it('rejects updating the display name while signed out', async () => {
		getSessionMock.mockResolvedValue(null);
		const { result } = renderHook(() => useUserAuthorization());
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await expect(result.current.updateDisplayName('New Name')).rejects.toThrow(
			'Cannot update display name while signed out',
		);
	});
});

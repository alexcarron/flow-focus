import { useContext } from 'react';
import { UserAuthorizationContext, type UseUserAuthorizationApi } from '../user-authorization/UserAuthorizationContext';

export type { UseUserAuthorizationApi };

export function useUserAuthorization(): UseUserAuthorizationApi {
	const userAuthorization = useContext(UserAuthorizationContext);
	if (userAuthorization === null) throw new Error('useUserAuthorization must be called inside a UserAuthorizationProvider');
	return userAuthorization;
}

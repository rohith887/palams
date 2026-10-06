import { useAuthContext } from '../contexts/AuthContext';

/**
 * PBLMS — useAuth Hook
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Convenience hook wrapping AuthContext. Returns:
 *   - user:          Current user { userId, fullName, role } or null
 *   - isAuthenticated: Boolean indicating valid session
 *   - isLoading:     Boolean — true while restoring session on mount
 *   - login:         Function — login(credentials) → Promise<user>
 *   - logout:        Function — logout() → void (navigates to /login)
 *
 * Throws if used outside AuthContextProvider.
 */
export default function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthContext();
  return { user, isAuthenticated, isLoading, login, logout };
}
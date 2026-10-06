import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setAccessToken, getAccessToken, registerAuthDependencies } from '../utils/axiosInstance';
import { isTokenExpired } from '../utils/tokenUtils';

const AuthContext = createContext(null);

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Register with Axios interceptor so it can call refresh/logout
  useEffect(() => {
    registerAuthDependencies(
      { logout: () => handleLogout(false) },
      authService
    );
  }, []);

 useEffect(() => {
  (async () => {
    try {
      const response = await authService.refresh();
      const payload = response.data.data;

      if (payload?.accessToken) {
        setAccessToken(payload.accessToken);
        setAccessTokenState(payload.accessToken);

        try {
          const jwtPayload = JSON.parse(
            atob(payload.accessToken.split('.')[1])
          );

          const userData = {
            userId: jwtPayload.userId,
            fullName: jwtPayload.fullName,
            role: jwtPayload.role,
          };

          setUser(userData);
          setIsAuthenticated(true);
        } catch {
          // Token parse failed — stay unauthenticated
        }
      }
    } catch {
      // Refresh failed — check if the Axios interceptor already refreshed
      const existingToken = getAccessToken();
      if (existingToken) {
        try {
          const jwtPayload = JSON.parse(atob(existingToken.split('.')[1]));
          const userData = {
            userId: jwtPayload.userId,
            fullName: jwtPayload.fullName,
            role: jwtPayload.role,
          };
          setUser(userData);
          setIsAuthenticated(true);
        } catch {
          // Existing token is also invalid — stay unauthenticated
        }
      }
    } finally {
      setIsLoading(false);
    }
  })();
}, []);

  const handleLogin = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    const payload = response.data?.data;
    console.log('[AuthContext] handleLogin response.data keys:', Object.keys(response.data || {}), 'payload keys:', Object.keys(payload || {}), 'accessToken len:', payload?.accessToken?.length);
    if (!payload?.accessToken) throw new Error('Login failed: no access token returned');
    setAccessToken(payload.accessToken);
    setAccessTokenState(payload.accessToken);
    setUser(payload.user);
    setIsAuthenticated(true);
    return payload.user;
  }, []);

  const handleLogout = useCallback(async (callApi = true) => {
    try {
      if (callApi) await authService.logout();
    } catch { /* Ignore network errors during logout */ }
    setAccessToken(null);
    setAccessTokenState(null);
    setUser(null);
    setIsAuthenticated(false);
    // Navigation handled by the calling component via React Router
  }, []);

const handleRefreshToken = useCallback(async () => {
  try {
    const response = await authService.refresh();
    const payload = response.data.data;

    if (payload?.accessToken) {
      setAccessToken(payload.accessToken);
      setAccessTokenState(payload.accessToken);
      return payload.accessToken;
    }
  } catch {
    await handleLogout(false);
  }

  return null;
}, [handleLogout]);

  const value = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    refreshToken: handleRefreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within an AuthContextProvider');
  return ctx;
}

export default AuthContext;
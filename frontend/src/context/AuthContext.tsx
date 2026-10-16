import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { UserAuthSummary, Role } from '../types';

interface AuthContextType {
  user: UserAuthSummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserContext: (user: UserAuthSummary) => void;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuthSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

    const initializeAuth = async () => {
      const storage = getStorage();
      const storedToken = storage?.getItem('access_token');
      const storedUser = storage?.getItem('user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);

          // Verify with /auth/me in background
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          storage?.setItem('user', JSON.stringify(response.data));
        } catch {
          storage?.removeItem('access_token');
          storage?.removeItem('refresh_token');
          storage?.removeItem('user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { access_token, refresh_token, user: userData } = response.data;

    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    storage?.setItem('access_token', access_token);
    storage?.setItem('refresh_token', refresh_token);
    storage?.setItem('user', JSON.stringify(userData));

    setToken(access_token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      storage?.removeItem('access_token');
      storage?.removeItem('refresh_token');
      storage?.removeItem('user');
      setUser(null);
      setToken(null);
    }
  };

  const updateUserContext = (updated: UserAuthSummary) => {
    setUser(updated);
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    storage?.setItem('user', JSON.stringify(updated));
  };

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        updateUserContext,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

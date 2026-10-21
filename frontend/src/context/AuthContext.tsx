import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User, refreshToken?: string) => void;
  registerUser: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Shared singleton promise to avoid race conditions when multiple requests return 401
let refreshPromise: Promise<string | null> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser: User, newRefreshToken?: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const registerUser = useCallback((newToken: string, newUser: User, newRefreshToken?: string) => {
    login(newToken, newUser, newRefreshToken);
  }, [login]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsed);
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  const apiFetch = useCallback(async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    const apiBase =
      import.meta.env.VITE_API_URL ||
      (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5001' : '');
    const url = `${apiBase}${path}`;

    const headers = new Headers(options.headers || {});
    const currentToken = token || localStorage.getItem('token');
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const currentRefreshToken = localStorage.getItem('refreshToken');
      const isAuthEndpoint =
        path.startsWith('/api/auth/refresh') ||
        path.startsWith('/api/auth/login') ||
        path.startsWith('/api/auth/register');

      if (res.status === 401 && currentRefreshToken && !isAuthEndpoint) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: currentRefreshToken }),
              });

              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                login(refreshData.token, refreshData.user, refreshData.refreshToken);
                return refreshData.token as string;
              } else {
                logout();
                return null;
              }
            } catch (err) {
              console.error('Error refreshing token:', err);
              logout();
              return null;
            } finally {
              refreshPromise = null;
            }
          })();
        }

        const refreshedToken = await refreshPromise;

        if (refreshedToken) {
          const newHeaders = new Headers(options.headers || {});
          newHeaders.set('Authorization', `Bearer ${refreshedToken}`);
          if (!(options.body instanceof FormData) && !newHeaders.has('Content-Type')) {
            newHeaders.set('Content-Type', 'application/json');
          }

          res = await fetch(url, {
            ...options,
            headers: newHeaders,
          });
        }
      }
    }

    if (!res.ok) {
      let errorMessage = 'Ha ocurrido un error en el servidor';
      try {
        const errJson = await res.json();
        errorMessage = errJson.message || errorMessage;
      } catch {
        // Fallback to text or generic error
      }

      // ONLY logout on 401 when token cannot be refreshed. Never on 403 (Forbidden)!
      if (
        res.status === 401 &&
        (errorMessage === 'Token is not valid' ||
          errorMessage === 'No token provided, authorization denied' ||
          errorMessage === 'Sesión expirada. Por favor, inicia sesión de nuevo.' ||
          errorMessage === 'Tu cuenta ha sido deshabilitada por el administrador')
      ) {
        logout();
      }

      throw new Error(errorMessage);
    }

    if (res.status === 204) return null as T;

    try {
      return (await res.json()) as T;
    } catch {
      return null as T;
    }
  }, [token, login, logout]);

  const value: AuthContextType = {
    token,
    user,
    isAuthenticated: !!token,
    loading,
    login,
    registerUser,
    logout,
    apiFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

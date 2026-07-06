import React, { createContext, useContext, useState, useEffect } from 'react';

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
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, newRefreshToken?: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    setToken(newToken);
    setUser(newUser);
  };

  const registerUser = (newToken: string, newUser: User, newRefreshToken?: string) => {
    login(newToken, newUser, newRefreshToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const apiBase = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5001' : '');
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
      if (
        res.status === 401 &&
        currentRefreshToken &&
        path !== '/api/auth/refresh' &&
        path !== '/api/auth/login' &&
        path !== '/api/auth/register'
      ) {
        try {
          const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            // Update token context and localStorage
            login(refreshData.token, refreshData.user, refreshData.refreshToken);

            // Re-execute original request with new token
            const newHeaders = new Headers(options.headers || {});
            newHeaders.set('Authorization', `Bearer ${refreshData.token}`);
            if (!(options.body instanceof FormData) && !newHeaders.has('Content-Type')) {
              newHeaders.set('Content-Type', 'application/json');
            }

            res = await fetch(url, {
              ...options,
              headers: newHeaders,
            });
          } else {
            logout();
          }
        } catch (refreshErr) {
          console.error('Error refreshing token:', refreshErr);
          logout();
        }
      }
    }

    if (!res.ok) {
      let errorMessage = 'Ha ocurrido un error en el servidor';
      try {
        const errJson = await res.json();
        errorMessage = errJson.message || errorMessage;
      } catch (e) {
        // Fallback to text or generic error
      }

      // Auto-logout if token is invalid or expired
      if (res.status === 401 || res.status === 403 || errorMessage === 'Token is not valid' || errorMessage === 'No token, authorization denied') {
        logout();
      }

      throw new Error(errorMessage);
    }

    // Handled returning empty response or deleted status
    if (res.status === 204) return null;
    
    try {
      return await res.json();
    } catch (err) {
      return null;
    }
  };

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

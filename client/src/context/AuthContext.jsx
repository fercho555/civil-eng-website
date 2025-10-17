import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || null);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      logout();
      return;
    }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken }), // match backend expected key
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.accessToken);
        localStorage.setItem('accessToken', data.accessToken);

        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
      } else {
        logout();
      }
    } catch (err) {
      console.error('Refresh token error:', err);
      logout();
    }
  }, [refreshToken, logout]);

  // Auto-refresh token shortly before expiry (optional step)
  useEffect(() => {
    if (!token) return;

    const parseJwt = (jwt) => {
      try {
        return JSON.parse(atob(jwt.split('.')[1]));
      } catch {
        return null;
      }
    };

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;

    const expiresInMs = payload.exp * 1000 - Date.now();

    const timeoutId = setTimeout(() => {
      refreshAccessToken();
    }, expiresInMs - 60000);

    return () => clearTimeout(timeoutId);
  }, [token, refreshAccessToken]);

  const login = (userData, accessToken, newRefreshToken) => {
    setUser(userData);
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface UserData {
  id: number;
  username: string;
  cn_name: string;
  role: string;
  company_id?: number | null;
  selected_company: { id: number; short_name: string } | null;
  selected_project: { id: number; short_name: string } | null;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (token: string, user: UserData) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    axios
      .get('/api/v1/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const serverUser = response.data?.data?.user;
        if (serverUser) {
          setUser(serverUser);
          localStorage.setItem(USER_KEY, JSON.stringify(serverUser));
          if (serverUser.selected_company && !localStorage.getItem('selected_company')) {
            localStorage.setItem('selected_company', JSON.stringify(serverUser.selected_company));
          }
          if (serverUser.selected_project && !localStorage.getItem('selected_project')) {
            localStorage.setItem('selected_project', JSON.stringify(serverUser.selected_project));
          }
        } else {
          const userData = localStorage.getItem(USER_KEY);
          if (userData) {
            try {
              setUser(JSON.parse(userData));
            } catch {
              localStorage.removeItem(USER_KEY);
            }
          }
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setUser(null);
      }
      if (e.key === USER_KEY) {
        if (e.newValue) {
          try { setUser(JSON.parse(e.newValue)); } catch { /* ignore */ }
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const login = useCallback((token: string, userData: UserData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (userData.selected_company && !localStorage.getItem('selected_company')) {
      localStorage.setItem('selected_company', JSON.stringify(userData.selected_company));
    }
    if (userData.selected_project && !localStorage.getItem('selected_project')) {
      localStorage.setItem('selected_project', JSON.stringify(userData.selected_project));
    }
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      axios.post('/api/v1/auth/logout', null, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('selected_company');
    localStorage.removeItem('selected_project');
    localStorage.removeItem('redirect_after_login');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

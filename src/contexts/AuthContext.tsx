import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  userData: User | null;
  effectiveUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('app_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          // Refresh user data from server
          try {
            const latest = await api.get('users', parsed.uid);
            setUser(latest);
            localStorage.setItem('app_user', JSON.stringify(latest));
          } catch (err: any) {
            if (err.message && err.message.includes('404')) {
              console.warn("User not found on server, logging out");
              setUser(null);
              localStorage.removeItem('app_user');
            } else {
              throw err; // Re-throw for general error logging below
            }
          }
        } catch (err) {
          console.error("Auth check failed:", err);
          setUser(null);
          localStorage.removeItem('app_user');
        }
      }
      setLoading(false);
    };

    checkAuth();
    
    // Polling or listener simulation
    const interval = setInterval(async () => {
      const savedUser = localStorage.getItem('app_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          const latest = await api.get('users', parsed.uid);
          setUser(latest);
        } catch (err) {
          console.error("Auth sync failed:", err);
        }
      }
    }, 60000); // Sync every 60s

    return () => clearInterval(interval);
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    try {
      const u = await api.auth.login(email);
      setUser(u);
      localStorage.setItem('app_user', JSON.stringify(u));
      window.dispatchEvent(new Event('login-success'));
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData: user,
      effectiveUser: user,
      loading,
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export { api }; // Export for convenience

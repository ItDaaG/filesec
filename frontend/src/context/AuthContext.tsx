import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getMe, setAuthLoginCallback } from '../api/authService';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('auth_token');
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Register login callback for authService
    setAuthLoginCallback(setUser);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isEmailVerified: user?.is_email_verified ?? false,
        isLoading,
        setUser,
        login,
        logout,
      }}
    >
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

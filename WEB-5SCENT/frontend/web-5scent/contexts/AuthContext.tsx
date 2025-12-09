'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '@/lib/api';

interface User {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  address_line?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  profile_pic?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Use useRef to track initialization to prevent double-execution in Strict Mode
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent running this effect multiple times
    if (initialized.current) return;
    initialized.current = true;
    
    // Don't verify token on auth pages to prevent freezing and infinite redirects
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    // Use window.location.pathname instead of usePathname to avoid hooks issues
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthPage = authPages.some(page => currentPath.startsWith(page));

    // Restore auth state from localStorage on mount
    const restoreAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          try {
            // Set user immediately from localStorage
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            
            // Only verify token on non-auth pages
            // IMPORTANT: Skip verification on auth pages to prevent:
            // 1. Blocking loads with API calls
            // 2. Infinite redirect loops if token is invalid
            if (!isAuthPage) {
              // Verify token is still valid (this may cause 401 if token expired)
              const response = await api.get('/me');
              if (response.data) {
                setUser(response.data);
                localStorage.setItem('user', JSON.stringify(response.data));
              }
            }
          } catch (parseError) {
            // JSON parse failed, clear invalid localStorage data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          // No token or user in storage, just set loading false
          setUser(null);
        }
      } catch (error: any) {
        // API verification failed or other error
        // IMPORTANT: Only clear auth on non-auth pages
        // On auth pages (/login, /signup, etc.), keep whatever we have in localStorage
        // so the user can still interact with the forms
        if (!isAuthPage && error.response?.status === 401) {
          // Token is definitely invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
        // For other errors, just set loading false and let the user continue
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, []); // Empty dependency array - run only once on mount

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/login', { email, password });
    const { user: userData, token } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, password_confirmation: string, phone?: string) => {
    const response = await api.post('/register', { name, email, password, password_confirmation, phone });
    const { user: userData, token } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/logout');
    } finally {
      // Always clear local state even if logout API fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...userData } as User;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    updateUser
  }), [user, loading, login, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
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

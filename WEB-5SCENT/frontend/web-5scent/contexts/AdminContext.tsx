'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface Admin {
  admin_id: number;
  name: string;
  email: string;
  role: string;
}

interface AdminContextType {
  admin: Admin | null;
  loading: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore admin auth state from localStorage on mount
    const restoreAuth = async () => {
      try {
        const adminToken = localStorage.getItem('admin_token');
        const storedAdmin = localStorage.getItem('admin');
        
        if (adminToken && storedAdmin) {
          // Set admin immediately from localStorage
          const parsedAdmin = JSON.parse(storedAdmin);
          setAdmin(parsedAdmin);
          
          // Verify token is still valid by calling admin/me endpoint
          try {
            const response = await api.get('/admin/me');
            if (response.data) {
              setAdmin(response.data);
              localStorage.setItem('admin', JSON.stringify(response.data));
            }
          } catch (error: any) {
            console.error('Token verification failed:', error.response?.status);
            // If token is invalid (401), clear auth
            if (error.response?.status === 401) {
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin');
              setAdmin(null);
            }
            // Otherwise keep the stored admin data
          }
        }
      } catch (error) {
        // JSON parse error or other issues, clear auth
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin');
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, []);

  const loginAdmin = async (email: string, password: string) => {
    const response = await api.post('/admin/login', { email, password });
    const { admin: adminData, token } = response.data;
    
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logoutAdmin = async (): Promise<void> => {
    try {
      await api.post('/admin/logout');
    } finally {
      // Always clear local state even if logout API fails
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin');
      setAdmin(null);
      
      // Redirect to admin login page
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }
  };

  return (
    <AdminContext.Provider value={{ admin, loading, loginAdmin, logoutAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

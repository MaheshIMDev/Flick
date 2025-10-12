'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { initializeSocket, disconnectSocket } from '@/lib/socket';

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status?: string;
  is_online?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, display_name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        ;
        setLoading(false);
        return;
      }

      ;
      
      const response = await api.get('/auth/profile');
       response.data);
      
      setUser(response.data);
      initializeSocket(token);
      
    } catch (error: any) {
       error.response?.status);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
       email);
      
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token } = response.data;

      ;
      
      // Save tokens
      localStorage.setItem('accessToken', access_token);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }
      
      // Fetch full profile
      const profileResponse = await api.get('/auth/profile');
      setUser(profileResponse.data);
      
      // Initialize socket
      initializeSocket(access_token);
      
      ;
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
      
    } catch (error: any) {
       error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, username: string, display_name?: string) => {
    try {
       email, username);
      
      const response = await api.post('/auth/signup', { 
        email, 
        password, 
        username,
        display_name: display_name || username
      });
      
      const { access_token, refresh_token } = response.data;

      ;
      
      // Save tokens
      localStorage.setItem('accessToken', access_token);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }
      
      // Fetch full profile
      const profileResponse = await api.get('/auth/profile');
      setUser(profileResponse.data);
      
      // Initialize socket
      initializeSocket(access_token);
      
      ;
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
      
    } catch (error: any) {
       error);
      throw new Error(error.response?.data?.error || 'Signup failed');
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    disconnectSocket();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

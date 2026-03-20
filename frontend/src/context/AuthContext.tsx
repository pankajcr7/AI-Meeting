'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { User, Team } from '@/types';

interface AuthContextType {
  user: User | null;
  team: Team | null;
  teams: Team[];
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  team: null,
  teams: [],
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  switchTeam: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const setAuthData = (userData: User, token?: string) => {
    setUser(userData);
    setTeams(userData.teams || []);
    setTeam((userData.activeTeam as Team) || userData.teams?.[0] || null);
    if (token) {
      localStorage.setItem('token', token);
      Cookies.set('token', token, { expires: 7 });
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setAuthData(data.user);
    } catch {
      setUser(null);
      setTeams([]);
      setTeam(null);
      localStorage.removeItem('token');
      Cookies.remove('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      Cookies.set('token', tokenFromUrl, { expires: 7 });
      window.history.replaceState({}, '', window.location.pathname);
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthData(data.user, data.token);
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setAuthData(data.user, data.token);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setUser(null);
    setTeams([]);
    setTeam(null);
    localStorage.removeItem('token');
    Cookies.remove('token');
  };

  const switchTeam = async (teamId: string) => {
    const { data } = await api.put('/auth/active-team', { teamId });
    setAuthData(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        teams,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        switchTeam,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

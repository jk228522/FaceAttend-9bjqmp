// Auth Context — Global authentication state

import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { loginAdmin, AuthResult } from '@/services/AuthService';

export type AuthState = {
  isLoggedIn: boolean;
  adminId: number | null;
  username: string | null;
};

export type AuthContextType = AuthState & {
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    adminId: null,
    username: null,
  });

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const result = await loginAdmin(username, password);
    if (result.success && result.adminId) {
      setState({
        isLoggedIn: true,
        adminId: result.adminId,
        username: result.username ?? username,
      });
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    setState({ isLoggedIn: false, adminId: null, username: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

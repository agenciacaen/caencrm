import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { loginUser, getProfile } from '../api/chatwoot';
import type { ChatwootAuthUser, ChatwootUserAccount } from '../types/chatwoot';

interface AuthContextType {
  isAuthenticated: boolean;
  user: ChatwootAuthUser | null;
  accounts: ChatwootUserAccount[];
  selectedAccount: ChatwootUserAccount | null;
  pubsubToken: string | null;
  login: (email: string, password: string) => Promise<'needs_account' | 'done'>;
  selectAccount: (account: ChatwootUserAccount) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'caen_crm_auth';
const ACCOUNT_STORAGE_KEY = 'caen_crm_account';

function loadFromStorage<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authData, setAuthData] = useState<{ user: ChatwootAuthUser; token: string } | null>(() => {
    return loadFromStorage<{ user: ChatwootAuthUser; token: string }>(AUTH_STORAGE_KEY);
  });

  const [selectedAccount, setSelectedAccount] = useState<ChatwootUserAccount | null>(() => {
    return loadFromStorage<ChatwootUserAccount>(ACCOUNT_STORAGE_KEY);
  });

  const [pubsubToken, setPubsubToken] = useState<string | null>(null);

  const user = authData?.user || null;
  const accounts = user?.accounts || [];
  const isAuthenticated = !!authData && !!selectedAccount;

  // Tenta obter pubsub_token do login ou via profile API
  useEffect(() => {
    if (!authData) {
      setPubsubToken(null);
      return;
    }

    if (authData.user?.pubsub_token) {
      setPubsubToken(authData.user.pubsub_token);
      return;
    }

    getProfile()
      .then(profile => {
        if (profile.pubsub_token) {
          setPubsubToken(profile.pubsub_token);
        }
      })
      .catch(() => {/* pubsub_token indisponível, WebSocket não será usado */});
  }, [authData]);

  const login = useCallback(async (email: string, password: string): Promise<'needs_account' | 'done'> => {
    const response = await loginUser(email, password);
    const authPayload = { user: response.data, token: response.token };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload));
    setAuthData(authPayload);

    const userAccounts = response.data.accounts || [];

    // If only one account, auto-select it
    if (userAccounts.length === 1) {
      const account = userAccounts[0];
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
      setSelectedAccount(account);
      return 'done';
    }

    // If multiple accounts, let user choose
    return 'needs_account';
  }, []);

  const selectAccount = useCallback((account: ChatwootUserAccount) => {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    setSelectedAccount(account);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    setAuthData(null);
    setSelectedAccount(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      accounts,
      selectedAccount,
      pubsubToken,
      login,
      selectAccount,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

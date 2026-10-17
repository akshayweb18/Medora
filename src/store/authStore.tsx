/**
 * Medora Auth Context
 * Provides authentication state, login, signup, logout, and guest mode.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  User,
  subscribeToAuthState,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  getAuthErrorMessage,
} from '@/services/auth';
import { syncAllLocalDataToCloud } from '@/services/cloudSync';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
}

const GUEST_KEY = 'medora_is_guest';

async function getStoredGuestMode(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && window.localStorage?.getItem(GUEST_KEY) === 'true';
    }
    const val = await SecureStore.getItemAsync(GUEST_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

async function setStoredGuestMode(isGuest: boolean): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(GUEST_KEY, isGuest ? 'true' : 'false');
      }
      return;
    }
    await SecureStore.setItemAsync(GUEST_KEY, isGuest ? 'true' : 'false');
  } catch {
    // Non-fatal
  }
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isGuest: false,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  logout: async () => {},
  continueAsGuest: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check stored guest status
    getStoredGuestMode().then(savedGuest => {
      if (mounted) setIsGuest(savedGuest);
    });

    // Listen to Firebase Auth state
    const unsubscribe = subscribeToAuthState(currentUser => {
      if (!mounted) return;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Trigger cloud sync upon successful login
        syncAllLocalDataToCloud().catch(() => {});
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const loggedUser = await signInWithEmail(email, pass);
      setUser(loggedUser);
      setIsGuest(false);
      await setStoredGuestMode(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: getAuthErrorMessage(err) };
    }
  };

  const signup = async (email: string, pass: string, name?: string) => {
    try {
      const newUser = await signUpWithEmail(email, pass, name);
      setUser(newUser);
      setIsGuest(false);
      await setStoredGuestMode(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: getAuthErrorMessage(err) };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
      setIsGuest(false);
      await setStoredGuestMode(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: getAuthErrorMessage(err) };
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setIsGuest(false);
      await setStoredGuestMode(false);
    } catch (err) {
      console.warn('Logout error:', err);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setStoredGuestMode(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        login,
        signup,
        loginWithGoogle,
        logout,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

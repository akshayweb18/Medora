/**
 * Medora Auth Context
 * Multi-user account isolation & authentication state.
 * Automatically clears previous user's data on logout or account switch,
 * and restores the logged-in user's private data from Firebase Cloud.
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
import {
  syncAllLocalDataToCloud,
  syncCloudDataToLocal,
  clearAllLocalUserData,
} from '@/services/cloudSync';
import { syncProfileWithAuthUser } from '@/db/profiles';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  syncVersion: number;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
}

const GUEST_KEY = 'medora_is_guest';
const LAST_UID_KEY = 'medora_last_auth_user_id';

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

async function getStoredLastUserId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? window.localStorage?.getItem(LAST_UID_KEY) : null;
    }
    return await SecureStore.getItemAsync(LAST_UID_KEY);
  } catch {
    return null;
  }
}

async function setStoredLastUserId(uid: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LAST_UID_KEY, uid);
      }
      return;
    }
    await SecureStore.setItemAsync(LAST_UID_KEY, uid);
  } catch {
    // Non-fatal
  }
}

async function removeStoredLastUserId(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LAST_UID_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(LAST_UID_KEY);
  } catch {
    // Non-fatal
  }
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isGuest: false,
  syncVersion: 0,
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
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    let mounted = true;

    // Check stored guest status
    getStoredGuestMode().then(savedGuest => {
      if (mounted) setIsGuest(savedGuest);
    });

    // Listen to Firebase Auth state
    const unsubscribe = subscribeToAuthState(async currentUser => {
      if (!mounted) return;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          const lastUid = await getStoredLastUserId();
          if (lastUid !== currentUser.uid) {
            // First login or account switch: completely clear local DB to ensure 100% isolation
            await clearAllLocalUserData();
          }
          await setStoredLastUserId(currentUser.uid);

          // Restore this user's private data from Firebase
          const restoreResult = await syncCloudDataToLocal(currentUser.uid);

          // Ensure default profile is created/synced with Google / auth details
          await syncProfileWithAuthUser(currentUser);

          // If brand new account with no cloud records yet, sync initial profile
          if (restoreResult.itemCount === 0) {
            await syncAllLocalDataToCloud(currentUser.uid);
          }

          if (mounted) {
            setSyncVersion(v => v + 1);
          }
        } catch (err) {
          console.warn('[Auth] Error during user cloud synchronization:', err);
        }
      } else {
        // User is logged out / unauthenticated
        try {
          const lastUid = await getStoredLastUserId();
          if (lastUid) {
            // Previous user logged out: wipe all local data immediately
            await clearAllLocalUserData();
            await removeStoredLastUserId();
            if (mounted) {
              setSyncVersion(v => v + 1);
            }
          }
        } catch (err) {
          console.warn('[Auth] Error during logout cleanup:', err);
        }
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
      // Crucial: wipe all user records locally so no PDF or medical info is exposed to the next user
      await clearAllLocalUserData();
      await removeStoredLastUserId();
      setUser(null);
      setIsGuest(false);
      await setStoredGuestMode(false);
      setSyncVersion(v => v + 1);
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
        syncVersion,
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

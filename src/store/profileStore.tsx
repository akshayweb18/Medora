/**
 * MediVault Profile Context
 * Provides the active profile to all screens without prop-drilling.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile } from '@/types';
import { ensureDefaultProfile, getAllProfiles, syncProfileWithAuthUser } from '@/db/profiles';
import { useAuth } from '@/store/authStore';

interface ProfileContextValue {
  activeProfile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  setActiveProfile: (profile: Profile) => void;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  activeProfile: null,
  profiles: [],
  loading: true,
  setActiveProfile: () => {},
  refreshProfiles: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    try {
      let defaultP = await ensureDefaultProfile();
      if (user) {
        const synced = await syncProfileWithAuthUser(user);
        if (synced) defaultP = synced;
      }
      const all = await getAllProfiles();
      const currentDefault = all.find(p => p.id === defaultP.id) ?? defaultP;
      setProfiles(all.length ? all : [currentDefault]);
      setActiveProfile(prev => {
        if (prev) {
          const updated = all.find(p => p.id === prev.id);
          return updated ?? currentDefault;
        }
        return currentDefault;
      });
    } catch (e) {
      console.error('ProfileProvider error:', e);
      const fallbackProfile: Profile = {
        id: 'default-profile',
        name: user?.displayName || 'Me',
        relationship: 'self',
        avatarUri: user?.photoURL || undefined,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfiles(prev => (prev.length ? prev : [fallbackProfile]));
      setActiveProfile(prev => prev ?? fallbackProfile);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshProfiles();
  }, [refreshProfiles]);

  return (
    <ProfileContext.Provider value={{ activeProfile, profiles, loading, setActiveProfile, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

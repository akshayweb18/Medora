/**
 * MediVault Profile Context
 * Provides the active profile to all screens without prop-drilling.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile } from '@/types';
import { ensureDefaultProfile, getAllProfiles } from '@/db/profiles';

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
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    try {
      const defaultP = await ensureDefaultProfile();
      const all = await getAllProfiles();
      setProfiles(all.length ? all : [defaultP]);
      setActiveProfile(prev => {
        if (prev) {
          const updated = all.find(p => p.id === prev.id);
          return updated ?? defaultP;
        }
        return defaultP;
      });
    } catch (e) {
      console.error('ProfileProvider error:', e);
      const fallbackProfile: Profile = {
        id: 'default-profile',
        name: 'Me',
        relationship: 'self',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfiles(prev => (prev.length ? prev : [fallbackProfile]));
      setActiveProfile(prev => prev ?? fallbackProfile);
    } finally {
      setLoading(false);
    }
  }, []);

   
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

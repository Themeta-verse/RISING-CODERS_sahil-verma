import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  userRole: UserRole;
  isGuest: boolean;
  isBackendConnected: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  switchRoleForDemo: (newRole: UserRole) => Promise<void>;
}

const STORAGE_KEY_AUTH = '@social_buddy_auth_session';

const DEFAULT_USER: UserProfile = {
  id: 'usr-alex-001',
  name: 'Alex Mercer',
  email: 'alex.mercer@socialbuddy.io',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  role: 'user',
  isGuest: false,
  interests: ['Workshops', 'Hackathons', 'Tech'],
  bio: 'Design engineer & tech event enthusiast.',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Restore session from Supabase or local storage on boot
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
            // Fetch profile record from public.profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (isMounted) {
              const activeUser: UserProfile = {
                id: session.user.id,
                name: profile?.full_name || session.user.email?.split('@')[0] || 'Member',
                email: session.user.email || '',
                avatarUrl: profile?.avatar_url || DEFAULT_USER.avatarUrl,
                role: (profile?.role as UserRole) || 'user',
                isGuest: false,
                interests: profile?.interests || DEFAULT_USER.interests,
                bio: profile?.bio,
              };
              setUser(activeUser);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          }
        }

        // Fallback to local storage if Supabase is unconfigured or no active remote session
        const stored = await AsyncStorage.getItem(STORAGE_KEY_AUTH);
        if (stored && isMounted) {
          const parsed: UserProfile = JSON.parse(stored);
          setUser(parsed);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn('Failed to restore auth session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    // Listen to Supabase auth state changes if configured
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const { data } = client.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
          const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const activeUser: UserProfile = {
            id: session.user.id,
            name: profile?.full_name || session.user.email?.split('@')[0] || 'Member',
            email: session.user.email || '',
            avatarUrl: profile?.avatar_url || DEFAULT_USER.avatarUrl,
            role: (profile?.role as UserRole) || 'user',
            isGuest: false,
            interests: profile?.interests || DEFAULT_USER.interests,
            bio: profile?.bio,
          };
          setUser(activeUser);
          setIsAuthenticated(true);
        } else if (!session) {
          // If remote session logged out and not guest mode
          setUser((curr) => (curr?.isGuest ? curr : null));
          setIsAuthenticated((curr) => (user?.isGuest ? curr : false));
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (isSupabaseConfigured && supabase && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.session && data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const activeUser: UserProfile = {
            id: data.user.id,
            name: profile?.full_name || data.user.email?.split('@')[0] || 'Member',
            email: data.user.email || '',
            avatarUrl: profile?.avatar_url || DEFAULT_USER.avatarUrl,
            role: (profile?.role as UserRole) || 'user',
            isGuest: false,
          };
          setUser(activeUser);
          setIsAuthenticated(true);
          await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(activeUser));
          return { success: true };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Authentication failed' };
      }
    }

    // Local simulated login for testing and unprovisioned environments
    const userName = email.split('@')[0] || 'Community Pioneer';
    const profile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: userName.charAt(0).toUpperCase() + userName.slice(1),
      email: email,
      avatarUrl: DEFAULT_USER.avatarUrl,
      role: email.includes('admin') ? 'admin' : email.includes('organizer') ? 'organizer' : 'user',
      isGuest: false,
      interests: ['Workshops', 'Hackathons'],
      bio: 'Active local community participant.',
    };

    await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(profile));
    setUser(profile);
    setIsAuthenticated(true);
    return { success: true };
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const newUser: UserProfile = {
            id: data.user.id,
            name,
            email,
            avatarUrl: DEFAULT_USER.avatarUrl,
            role: 'user',
            isGuest: false,
          };
          setUser(newUser);
          setIsAuthenticated(true);
          await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(newUser));
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Local fallback signup
    return login(email);
  };

  const loginAsGuest = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const guestProfile: UserProfile = {
      ...DEFAULT_USER,
      id: 'guest-session-001',
      name: 'Guest Explorer',
      email: 'guest@socialbuddy.local',
      role: 'user',
      isGuest: true,
    };

    await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(guestProfile));
    setUser(guestProfile);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }

    await AsyncStorage.removeItem(STORAGE_KEY_AUTH);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const updatedUser: UserProfile = {
      ...user,
      ...updates,
      // Protect against client-side role tampering
      role: user.role,
    };

    if (isSupabaseConfigured && supabase && !user.isGuest) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: updatedUser.name,
            bio: updatedUser.bio,
            avatar_url: updatedUser.avatarUrl,
            interests: updatedUser.interests,
          })
          .eq('id', user.id);

        if (error) {
          return { success: false, error: error.message };
        }
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    setUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updatedUser));
    return { success: true };
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    if (isSupabaseConfigured && supabase && user && !user.isGuest) {
      try {
        // Delete profile which cascades to registrations, bookmarks, and events via foreign keys
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut().catch(() => {});
      } catch (e: any) {
        console.warn('Backend account deletion error:', e);
      }
    }

    // Clear all local app keys
    await AsyncStorage.multiRemove([
      STORAGE_KEY_AUTH,
      '@social_buddy_saved_ids',
      '@social_buddy_rsvp_ids',
      '@social_buddy_hosted_events',
    ]);

    setUser(null);
    setIsAuthenticated(false);
    return { success: true };
  };

  // Demo tool to toggle roles on mobile without external SQL access
  const switchRoleForDemo = async (newRole: UserRole) => {
    if (!user) return;
    const modified: UserProfile = { ...user, role: newRole };
    setUser(modified);
    await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(modified));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        userRole: user?.role || 'user',
        isGuest: Boolean(user?.isGuest),
        isBackendConnected: isSupabaseConfigured,
        login,
        signUp,
        loginAsGuest,
        logout,
        updateProfile,
        deleteAccount,
        switchRoleForDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

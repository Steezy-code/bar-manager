import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUserIdRef = useRef(null);

  // Fetch user profile from profiles table
  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  // Auth state change listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        lastFetchedUserIdRef.current = user.id;
        fetchProfile(user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        if (user.id !== lastFetchedUserIdRef.current) {
          lastFetchedUserIdRef.current = user.id;
          fetchProfile(user.id);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager',
    isStaff: profile?.role === 'staff',
    isViewer: profile?.role === 'viewer',
    role: profile?.role || null,
    status: profile?.status || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
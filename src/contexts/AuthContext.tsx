import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName?: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user on mount
    async function loadUser() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } finally {
        setLoading(false);
      }
    }
    loadUser();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error && result.data.user) {
      // Create profile if doesn't exist
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', result.data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: result.data.user.id,
          email: result.data.user.email || '',
        });
      }

      // Create default settings if doesn't exist
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', result.data.user.id)
        .maybeSingle();

      if (!existingSettings) {
        await supabase.from('user_settings').insert({
          user_id: result.data.user.id,
        });
      }
    }
    return result;
  }

  async function signUp(email: string, password: string, fullName?: string) {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (!result.error && result.data.user) {
      // Create profile
      await supabase.from('profiles').insert({
        id: result.data.user.id,
        email: result.data.user.email || '',
        full_name: fullName,
      });

      // Create default settings
      await supabase.from('user_settings').insert({
        user_id: result.data.user.id,
      });
    }

    return result;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
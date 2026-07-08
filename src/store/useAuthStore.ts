import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => {
    if (user) {
      const cleanEmail = user.email ? user.email.toLowerCase() : '';
      const cleanNombre = user.nombre ? user.nombre.toLowerCase() : '';
      const isSanti = cleanEmail.includes('santi') || cleanNombre.includes('santi');
      const isAdmin = cleanEmail === 'angel.saguar@telefonica.net';
      const isScout = user.role === 'scout';

      if (!isAdmin && !isSanti && !isScout) {
        supabase.auth.signOut();
        set({ user: null, loading: false });
        return;
      }
      if (isAdmin) {
        user.role = 'admin';
      } else if (!user.role) {
        user.role = 'scout';
      }
    }
    set({ user, loading: false });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },
  refreshUser: async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const cleanEmail = authUser.email ? authUser.email.toLowerCase() : '';
        const isSanti = cleanEmail.includes('santi') || (authUser.user_metadata?.nombre || '').toLowerCase().includes('santi');
        const isAdminEmail = cleanEmail === 'angel.saguar@telefonica.net';
        
        // Fetch profile to see if they exist in users table
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        const hasValidProfile = profile && (profile.role === 'scout' || profile.role === 'admin');

        if (!isAdminEmail && !isSanti && !hasValidProfile) {
          await supabase.auth.signOut();
          set({ user: null, loading: false });
          return;
        }
        
        if (profile) {
          const updatedProfile = {
            ...profile,
            role: isAdminEmail ? 'admin' : (profile.role || 'scout'),
          };
          set({ user: updatedProfile as User, loading: false });
        } else {
          // If auth user exists but profile doesn't, create a temporary user object
          set({ 
            user: { 
              id: authUser.id, 
              email: authUser.email || '', 
              nombre: authUser.user_metadata?.nombre || 'Nuevo Usuario',
              role: isAdminEmail ? 'admin' : 'scout' 
            } as User, 
            loading: false 
          });
        }
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      set({ user: null, loading: false });
    }
  }
}));

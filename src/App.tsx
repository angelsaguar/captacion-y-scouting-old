import React, { useEffect } from 'react';
// Force rebuild to trigger Vercel deployment sync
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Players from '@/pages/Players';
import PlayerDetail from '@/pages/PlayerDetail';
import PlayerForm from '@/pages/PlayerForm';
import Comparison from '@/pages/Comparison';
import Analytics from '@/pages/Analytics';
import Admin from '@/pages/Admin';
import Profile from '@/pages/Profile';
import Observers from '@/pages/Observers';
import Needs from '@/pages/Needs';
import Coaches from '@/pages/Coaches';
import Campograma from '@/pages/Campograma';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const { user, setUser, loading, refreshUser } = useAuthStore();

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          refreshUser();
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Initial session check failed:', error);
        setUser(null);
      }
    };

    checkInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse text-xl font-bold tracking-tighter text-blue-600">U.D. LA POVEDA SCOUTING...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={<Navigate to="/login" />} />
          
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/new" element={<PlayerForm />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/players/:id/edit" element={<PlayerForm />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/observers" element={<Observers />} />
            <Route path="/needs" element={<Needs />} />
            <Route path="/coaches" element={<Coaches />} />
            <Route path="/campograma" element={<Campograma />} />
            <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </TooltipProvider>
  );
}

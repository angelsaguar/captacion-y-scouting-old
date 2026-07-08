import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trophy, Mail, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('placeholder')) {
      setIsConfigured(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      toast.error('Supabase no está configurado. Revisa los Ajustes.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const isSanti = cleanEmail.includes('santi');
    const isAdmin = cleanEmail === 'angel.saguar@telefonica.net';

    if (!isAdmin && !isSanti) {
      toast.error('Acceso restringido: Solo el administrador Ángel Saguar y el observador SANTI tienen permitido el acceso a la plataforma.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        const loggedEmail = data.user.email ? data.user.email.toLowerCase() : '';
        const loggedNombre = (data.user.user_metadata?.nombre || '').toLowerCase();
        const loggedIsSanti = loggedEmail.includes('santi') || loggedNombre.includes('santi');
        const loggedIsAdmin = loggedEmail === 'angel.saguar@telefonica.net';

        if (!loggedIsAdmin && !loggedIsSanti) {
          await supabase.auth.signOut();
          throw new Error('Acceso restringido: Cuenta no autorizada.');
        }
      }

      toast.success('Sesión iniciada correctamente');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[128px]" />
      </div>

      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-1 text-center">
          {!isConfigured && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-left">Supabase no está configurado. Ve a Ajustes {'>'} Secretos y añade VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-2xl shadow-lg ring-4 ring-white/10">
              <UDLaPovedaLogo className="w-16 h-16" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white uppercase">U.D. LA POVEDA SCOUTING</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Acceso autorizado para el administrador Ángel Saguar y el observador SANTI.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Introduce tu correo electrónico" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-600"
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-blue-600"
                  required 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'ENTRAR A LA PLATAFORMA'
              )}
            </Button>
            <p className="text-xs text-center text-slate-400 font-medium mt-1">
              ¿Eres el observador SANTI? <Link to="/register" className="text-blue-500 hover:underline font-bold">Regístrate aquí</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      <div className="absolute bottom-8 text-center w-full text-slate-500 text-xs tracking-widest uppercase font-semibold">
        © 2026 U.D. LA POVEDA - PROFESSIONAL SCOUTING DIVISION
      </div>
    </div>
  );
}

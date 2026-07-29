import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trophy, Mail, Lock, Loader2, UserPlus, FileText, AlertTriangle, KeySquare } from 'lucide-react';
import { toast } from 'sonner';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('placeholder')) {
      setIsConfigured(false);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      toast.error('Supabase no está configurado. Revisa los Ajustes.');
      return;
    }
    setLoading(true);

    try {
      // 0. Check access key
      const requiredKey = import.meta.env.VITE_REGISTRATION_KEY || 'lapoveda_secret_2026';
      if (accessKey !== requiredKey) {
        throw new Error('La Clave de Acceso es incorrecta. Pídela al administrador.');
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanNombre = nombre.trim().toLowerCase();
      const isSanti = cleanEmail.includes('santi') || cleanNombre.includes('santi');
      const isAlejandro = cleanEmail.includes('alejandro') || cleanNombre.includes('alejandro') || cleanEmail.includes('saguar') || cleanNombre.includes('saguar');
      const isAdmin = cleanEmail === 'angel.saguar@telefonica.net';

      if (!isAdmin && !isSanti && !isAlejandro) {
        throw new Error('Acceso restringido: Solo se permite el registro al administrador Ángel Saguar y a los observadores SANTI y ALEJANDRO SAGUAR.');
      }

      // 1. Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
          }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Normally we would wait for email confirmation or auto-login
      // In this setup, we assume profile creation happens via trigger or manually
      // We'll create the profile entry if it doesn't exist (Supabase trigger is better practice)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            { id: data.user.id, email, nombre, role: 'scout' }
          ]);
        
        // Ignore error if profile already exists (trigger might have created it)
        console.log('Profile status:', profileError);
      }

      toast.success('Cuenta creada con éxito. Revisa tu email si se requiere confirmación.');
      navigate('/login');
    } catch (error: any) {
      const errMsg = error.message || '';
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('existe')) {
        toast.error('¡Ya estás registrado! Por favor, vuelve a la pantalla de Inicio de Sesión e ingresa tu correo y contraseña.');
      } else {
        toast.error(errMsg || 'Error al registrarse');
      }
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
              <p className="text-left">Supabase no está configurado. Ve a Ajustes {'>'} Secretos y añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-2xl shadow-lg ring-4 ring-white/10">
              <UDLaPovedaLogo className="w-16 h-16" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white uppercase italic">ÚNETE A U.D. LA POVEDA</CardTitle>
          <CardDescription className="text-slate-400">
            Crea tu cuenta de analista para empezar a scoutear
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-slate-300">Nombre Completo</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="nombre" 
                  type="text" 
                  placeholder="Juan Pérez" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-red-600"
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessKey" className="text-slate-300 font-bold text-red-500">Clave de Acceso (Privada)</Label>
              <div className="relative">
                <KeySquare className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="accessKey" 
                  type="text" 
                  placeholder="Ingresa la clave del club" 
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="bg-slate-800 border-red-900 text-white pl-10 focus:ring-red-600"
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="analista@lapoveda.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-red-600"
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10 focus:ring-red-600"
                  required 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'REGISTRARSE EN EL CLUB'
              )}
            </Button>
            <p className="text-xs text-center text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-red-500 hover:underline font-bold">
                Inicia sesión aquí
              </Link>
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

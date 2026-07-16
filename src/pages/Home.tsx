import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Users, 
  Settings, 
  LogOut, 
  Upload, 
  Link2, 
  Image as ImageIcon, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Default professional football team picture
const DEFAULT_TEAM_PHOTO = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop';

export default function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [teamPhoto, setTeamPhoto] = useState<string>(DEFAULT_TEAM_PHOTO);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  
  useEffect(() => {
    const savedPhoto = localStorage.getItem('team-photo');
    if (savedPhoto) {
      setTeamPhoto(savedPhoto);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            try {
              localStorage.setItem('team-photo', compressedBase64);
              setTeamPhoto(compressedBase64);
              toast.success('Foto del equipo actualizada y optimizada correctamente.');
              setShowPhotoModal(false);
            } catch (err) {
              toast.error('No se pudo guardar la imagen por falta de espacio en el navegador.');
            }
          } else {
            const base64String = reader.result as string;
            try {
              localStorage.setItem('team-photo', base64String);
              setTeamPhoto(base64String);
              toast.success('Foto del equipo actualizada.');
              setShowPhotoModal(false);
            } catch (err) {
              toast.error('La imagen es demasiado grande para el navegador.');
            }
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput.trim()) return;
    
    localStorage.setItem('team-photo', photoUrlInput.trim());
    setTeamPhoto(photoUrlInput.trim());
    toast.success('Foto del equipo actualizada mediante enlace.');
    setShowPhotoModal(false);
    setPhotoUrlInput('');
  };

  const resetDefaultPhoto = () => {
    localStorage.removeItem('team-photo');
    setTeamPhoto(DEFAULT_TEAM_PHOTO);
    toast.success('Se ha restablecido la foto predeterminada.');
    setShowPhotoModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" id="main-portal-home">
      {/* Dynamic Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-lg shadow-blue-500/10 flex-shrink-0">
            <UDLaPovedaLogo className="w-10 h-10" />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white uppercase leading-tight flex items-center gap-2">
              U.D. LA POVEDA <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-normal normal-case">Portal Oficial</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wide">ÁREA DEPORTIVA Y TÉCNICA</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-sm font-bold text-slate-200">{user?.nombre}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ROL: {user?.role === 'admin' ? 'Administrador' : 'Observador / Scout'}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => signOut()}
            className="text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl"
            title="Cerrar sesión"
            id="logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8 md:gap-12 justify-center">
        
        {/* Welcome Block */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase">
            SISTEMA DE GESTIÓN INTEGRAL
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto font-medium">
            Bienvenido, <strong className="text-white">{user?.nombre}</strong>. Accede a las herramientas profesionales de captación de talento o administra el día a día deportivo de tu plantilla.
          </p>
        </div>

        {/* Team Photo Card with upload functionality */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-900 shadow-2xl bg-slate-900/40 aspect-[21/9] min-h-[220px] md:min-h-[350px] group flex flex-col justify-end" id="team-photo-container">
          <img 
            src={teamPhoto} 
            alt="U.D. La Poveda Team Photo" 
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 mb-2 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Nuestra Plantilla</span>
              </div>
              <h3 className="text-xl md:text-3xl font-extrabold text-white uppercase tracking-tight shadow-sm">U.D. LA POVEDA</h3>
              <p className="text-xs md:text-sm text-slate-300 font-medium">Fútbol Base y Profesional • Arganda del Rey, Madrid</p>
            </div>

            <Button
              onClick={() => setShowPhotoModal(true)}
              className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-white uppercase px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
              id="change-team-photo-btn"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Cambiar Foto del Equipo</span>
            </Button>
          </div>
        </div>

        {/* Dual Portal Modules Selection */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8" id="portal-modules">
          
          {/* Card A: Captación y Scouting */}
          <Link 
            to="/scouting"
            className="group relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 hover:border-blue-500/50 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-blue-500/5 hover:-translate-y-1 flex flex-col justify-between min-h-[280px]"
            id="scouting-module-card"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              
              <div className="space-y-1.5">
                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-black">SISTEMA DE TALENTO</span>
                <h4 className="text-2xl font-black text-white uppercase tracking-tight">Captación y Scouting</h4>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  Busca jugadores, realiza informes, analiza necesidades de plantilla, compara rendimientos y visualiza las posiciones estratégicas en el campo de juego.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
              <span>ENTRAR AL SCOUTING</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card B: Gestión de Plantilla / Equipo */}
          <Link 
            to="/gestion-equipo"
            className="group relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 hover:border-emerald-500/50 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-emerald-500/5 hover:-translate-y-1 flex flex-col justify-between min-h-[280px]"
            id="team-management-module-card"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-inner">
                <Settings className="w-7 h-7" />
              </div>
              
              <div className="space-y-1.5">
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">ADMINISTRACIÓN DEPORTIVA</span>
                <h4 className="text-2xl font-black text-white uppercase tracking-tight">Gestión del Equipo</h4>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  Lleva el control total del equipo: gestión de plantilla, asistencia, partidos y resultados, pizarra táctica digital interactiva, videoteca técnica, encuestas y control de lesiones.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              <span>ENTRAR A LA GESTIÓN</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-slate-600 text-xs font-semibold uppercase tracking-wider select-none">
        U.D. LA POVEDA © 2026 • Portal Profesional de Gestión Deportiva
      </footer>

      {/* Photo Update Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                <span>Actualizar Foto del Equipo</span>
              </h3>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Option 1: File Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Opción 1: Subir Archivo Local (Max 2MB)</label>
                <div className="relative border-2 border-dashed border-slate-850 hover:border-blue-500/55 rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center gap-2 group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                  <span className="text-xs text-slate-400 font-medium">Selecciona una foto de tu dispositivo</span>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-[10px] text-slate-600 font-extrabold uppercase bg-slate-950 px-3 py-1 rounded-full">Ó</span>
              </div>

              {/* Option 2: Image URL */}
              <form onSubmit={handleUrlSubmit} className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Opción 2: Pegar Enlace de Imagen</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="url" 
                      placeholder="https://ejemplo.com/foto-equipo.jpg"
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs rounded-xl px-9 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase rounded-xl">
                    Guardar
                  </Button>
                </div>
              </form>

              {/* Reset to Default */}
              <div className="pt-4 border-t border-slate-850 flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={resetDefaultPhoto}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Usar Predeterminada
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPhotoModal(false)}
                  className="text-xs text-slate-400 hover:text-white border-slate-800"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

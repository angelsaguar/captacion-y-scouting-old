import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Trophy, 
  BarChart3, 
  Activity, 
  Play, 
  ClipboardCheck, 
  HeartPulse, 
  Presentation,
  ChevronLeft,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Subcomponents imports
import Plantilla from './gestion/Plantilla';
import Asistencia from './gestion/Asistencia';
import Partidos from './gestion/Partidos';
import Estadisticas from './gestion/Estadisticas';
import PizarraTactica from './gestion/PizarraTactica';
import Videoteca from './gestion/Videoteca';
import Lesionados from './gestion/Lesionados';
import PlanPartido from './gestion/PlanPartido';

type ModuleKey = 
  | 'plantilla' 
  | 'asistencia' 
  | 'partidos' 
  | 'estadisticas' 
  | 'pizarra' 
  | 'videoteca' 
  | 'lesionados' 
  | 'plan';

interface ModuleConfig {
  key: ModuleKey;
  title: string;
  subtext: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function GestionEquipo() {
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);

  const modules: ModuleConfig[] = [
    {
      key: 'plantilla',
      title: 'PLANTILLA',
      subtext: 'FICHA COMPLETA',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      key: 'asistencia',
      title: 'ENTRENAMIENTOS',
      subtext: 'SESIONES Y ASISTENCIA',
      icon: Calendar,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      key: 'partidos',
      title: 'PARTIDOS',
      subtext: 'COMPETICIÓN',
      icon: Trophy,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
    {
      key: 'estadisticas',
      title: 'ESTADÍSTICAS',
      subtext: 'BIG DATA',
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      key: 'pizarra',
      title: 'PIZARRA TÁCTICA',
      subtext: 'ESTRATEGIA',
      icon: Activity,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      borderColor: 'border-emerald-400/20'
    },
    {
      key: 'videoteca',
      title: 'VIDEOTECA',
      subtext: 'VIDEOANÁLISIS',
      icon: Play,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    },
    {
      key: 'lesionados',
      title: 'LESIONADOS',
      subtext: 'CONTROL MÉDICO',
      icon: HeartPulse,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20'
    },
    {
      key: 'plan',
      title: 'PLAN DE PARTIDO',
      subtext: 'PREPARACIÓN',
      icon: Presentation,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    }
  ];

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'plantilla':
        return <Plantilla />;
      case 'asistencia':
        return <Asistencia />;
      case 'partidos':
        return <Partidos />;
      case 'estadisticas':
        return <Estadisticas />;
      case 'pizarra':
        return <PizarraTactica />;
      case 'videoteca':
        return <Videoteca />;
      case 'lesionados':
        return <Lesionados />;
      case 'plan':
        return <PlanPartido />;
      default:
        return null;
    }
  };

  const getModuleTitle = () => {
    const mod = modules.find(m => m.key === activeModule);
    return mod ? `${mod.title} • ${mod.subtext}` : 'GESTIÓN';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1">
      
      {/* Top Breadcrumb Bar */}
      {activeModule ? (
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setActiveModule(null)}
              variant="outline"
              size="sm"
              className="border-slate-850 hover:bg-slate-800 text-slate-300 gap-1.5 rounded-xl h-9 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Volver</span>
            </Button>

            <div className="hidden sm:flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
              <span>Gestión de Equipo</span>
              <span>/</span>
            </div>

            <h2 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
              {getModuleTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-xl">
            <LayoutGrid className="w-4 h-4 text-slate-500" />
            <span>U.D. La Poveda</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Gestión del Equipo
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Administración completa de jugadoras, convocatorias, asistencias, tácticas y control médico de la U.D. La Poveda.
          </p>
        </div>
      )}

      {/* Renders Grid OR Active Module Panel */}
      {activeModule ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderActiveModule()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.key}
                onClick={() => setActiveModule(mod.key)}
                className={`group bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900/80 hover:border-slate-800 rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all gap-8 relative overflow-hidden`}
              >
                {/* Glow Overlay Effect */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/20 pointer-events-none" />

                {/* Top: Icon & Text */}
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl ${mod.bgColor} border ${mod.borderColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${mod.color}`} />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-white text-lg tracking-tight group-hover:text-blue-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">
                      {mod.subtext}
                    </p>
                  </div>
                </div>

                {/* Footer details decorator */}
                <div className="border-t border-slate-950/40 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Acceder</span>
                  <span className="group-hover:translate-x-1.5 transition-transform duration-300 text-blue-500">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

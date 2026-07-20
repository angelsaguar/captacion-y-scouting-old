import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CLUB_TEAMS } from '@/types';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  CalendarDays, 
  MapPin, 
  ClipboardList, 
  AlertTriangle, 
  FileCheck,
  UserCheck,
  Clock,
  Award,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MatchPlayerStat {
  playerId: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  titular: boolean;
  suplente: boolean;
  minutos: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  goles_metidos: number;
  goles_encajados: number;
  asistencias?: number;
}

interface Substitution {
  saleId: string;
  entraId: string;
  minuto: number;
}

interface Match {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  tipo: 'Local' | 'Visitante';
  competicion: 'Liga' | 'Copa' | 'Amistoso';
  estado: 'Programado' | 'Finalizado';
  goles_favor?: number;
  goles_contra?: number;
  acta?: string;
  estadisticas?: {
    jugadoras_stats?: MatchPlayerStat[];
    cambios?: Substitution[];
  };
}

export default function Partidos() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showActaModal, setShowActaModal] = useState<Match | null>(null);
  
  // Interactive statistics editor inside closure modal
  const [matchPlayerStats, setMatchPlayerStats] = useState<MatchPlayerStat[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [newSub, setNewSub] = useState({ saleId: '', entraId: '', minuto: 45 });

  // New match form state
  const [formData, setFormData] = useState({
    rival: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '10:00',
    tipo: 'Local' as 'Local' | 'Visitante',
    competicion: 'Liga' as 'Liga' | 'Copa' | 'Amistoso',
    estado: 'Programado' as 'Programado' | 'Finalizado',
    goles_favor: 0,
    goles_contra: 0,
    acta: ''
  });

  // Load roster and matches on team change
  useEffect(() => {
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    if (savedRoster) {
      setPlayers(JSON.parse(savedRoster));
    } else {
      setPlayers([]);
    }

    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('team_matches')
          .select('*')
          .eq('team', selectedTeam)
          .order('fecha', { ascending: false });

        if (!error && data) {
          const formatted: Match[] = data.map(item => ({
            id: item.id,
            rival: item.rival,
            fecha: item.fecha,
            hora: item.hora,
            tipo: item.tipo as any,
            competicion: item.competicion as any,
            estado: item.estado as any,
            goles_favor: item.goles_favor !== null ? item.goles_favor : undefined,
            goles_contra: item.goles_contra !== null ? item.goles_contra : undefined,
            acta: item.acta || undefined,
            estadisticas: item.estadisticas || undefined
          }));
          
          setMatches(formatted);
          localStorage.setItem(`team_matches_${selectedTeam}`, JSON.stringify(formatted));
          return;
        } else if (error) {
          console.warn('Error fetching matches from Supabase, using local fallback:', error);
        }
      } catch (err) {
        console.warn('Exception fetching matches from Supabase:', err);
      }

      // Local fallback
      const key = `team_matches_${selectedTeam}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setMatches(JSON.parse(saved));
      } else {
        // Default placeholder games
        const defaults: Match[] = [
          { id: 'm1', rival: 'A.D. Arganda', fecha: new Date().toISOString().split('T')[0], hora: '12:00', tipo: 'Local', competicion: 'Liga', estado: 'Programado' },
          { id: 'm2', rival: 'F.C. Rivas Vaciamadrid', fecha: '2026-05-15', hora: '11:30', tipo: 'Visitante', competicion: 'Liga', estado: 'Finalizado', goles_favor: 3, goles_contra: 1, acta: 'Excelente partido de posesión y presión alta. Destacó el juego defensivo por bandas.' }
        ];
        localStorage.setItem(key, JSON.stringify(defaults));
        setMatches(defaults);
      }
    };

    fetchMatches();
  }, [selectedTeam]);

  // Sync modal form states when showActaModal is opened/selected
  useEffect(() => {
    if (showActaModal) {
      const existingStats = showActaModal.estadisticas;
      
      const initialPlayerStats = players.map(p => {
        const saved = existingStats?.jugadoras_stats?.find((s: any) => s.playerId === p.id);
        return {
          playerId: p.id,
          nombre: p.nombre,
          apellidos: p.apellidos,
          dorsal: p.dorsal,
          posicion: p.posicion,
          titular: saved ? saved.titular : false,
          suplente: saved ? saved.suplente : false,
          minutos: saved ? saved.minutos : 0,
          tarjetas_amarillas: saved ? saved.tarjetas_amarillas : 0,
          tarjetas_rojas: saved ? saved.tarjetas_rojas : 0,
          goles_metidos: saved ? saved.goles_metidos : 0,
          goles_encajados: saved ? saved.goles_encajados : 0,
          asistencias: saved ? (saved.asistencias || 0) : 0
        };
      });

      setMatchPlayerStats(initialPlayerStats);
      setSubstitutions(existingStats?.cambios || []);
    } else {
      setMatchPlayerStats([]);
      setSubstitutions([]);
    }
  }, [showActaModal, players]);

  const saveMatches = async (updated: Match[]) => {
    setMatches(updated);
    localStorage.setItem(`team_matches_${selectedTeam}`, JSON.stringify(updated));

    // Try to sync to Supabase in the background
    try {
      for (const match of updated) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id);
        const payload = {
          team: selectedTeam,
          rival: match.rival,
          fecha: match.fecha,
          hora: match.hora,
          tipo: match.tipo,
          competicion: match.competicion,
          estado: match.estado,
          goles_favor: match.goles_favor ?? null,
          goles_contra: match.goles_contra ?? null,
          acta: match.acta ?? null,
          estadisticas: match.estadisticas || {}
        };

        if (isUuid) {
          await supabase
            .from('team_matches')
            .upsert({ id: match.id, ...payload });
        } else {
          // If it's a temporary ID, insert it and let Supabase assign a real UUID
          const { data, error } = await supabase
            .from('team_matches')
            .insert({ ...payload })
            .select();

          if (!error && data && data[0]) {
            // Update the temporary ID in state and local storage with the new UUID
            match.id = data[0].id;
            setMatches([...updated]);
            localStorage.setItem(`team_matches_${selectedTeam}`, JSON.stringify(updated));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync team matches to Supabase:', err);
    }
  };

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rival.trim()) {
      toast.error('El nombre del equipo rival es obligatorio');
      return;
    }

    const newMatch: Match = {
      id: crypto.randomUUID(),
      rival: formData.rival,
      fecha: formData.fecha,
      hora: formData.hora,
      tipo: formData.tipo,
      competicion: formData.competicion,
      estado: formData.estado,
      goles_favor: formData.estado === 'Finalizado' ? formData.goles_favor : undefined,
      goles_contra: formData.estado === 'Finalizado' ? formData.goles_contra : undefined,
      acta: formData.estado === 'Finalizado' ? formData.acta : undefined
    };

    const updated = [newMatch, ...matches];
    saveMatches(updated);
    toast.success('Partido registrado en el calendario.');
    
    // Clear form
    setFormData({
      rival: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '10:00',
      tipo: 'Local',
      competicion: 'Liga',
      estado: 'Programado',
      goles_favor: 0,
      goles_contra: 0,
      acta: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteMatch = async (id: string, rival: string) => {
    if (confirm(`¿Estás seguro de eliminar el partido contra ${rival}?`)) {
      const updated = matches.filter(m => m.id !== id);
      saveMatches(updated);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        try {
          await supabase
            .from('team_matches')
            .delete()
            .eq('id', id);
        } catch (err) {
          console.warn('Failed to delete match from Supabase:', err);
        }
      }

      toast.success('Partido eliminado del calendario.');
    }
  };

  const handleSaveActa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showActaModal) return;

    const updated = matches.map(m => {
      if (m.id === showActaModal.id) {
        return {
          ...m,
          estado: 'Finalizado' as const,
          goles_favor: showActaModal.goles_favor || 0,
          goles_contra: showActaModal.goles_contra || 0,
          acta: showActaModal.acta || '',
          estadisticas: {
            jugadoras_stats: matchPlayerStats,
            cambios: substitutions
          }
        };
      }
      return m;
    });

    saveMatches(updated);
    toast.success('Resultado, Acta y Estadísticas del partido actualizados correctamente.');
    setShowActaModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Selector & Add */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 border border-slate-900 p-4 rounded-2xl">
        <div className="w-full sm:w-auto flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Equipo Activo</label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-slate-950 text-white font-bold text-sm border border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            {CLUB_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Partido</span>
        </Button>
      </div>

      {/* Add Match Form */}
      {showAddForm && (
        <form onSubmit={handleAddMatch} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
          <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-blue-500" />
            <span>Detalles del próximo partido</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Equipo Rival *</label>
              <input 
                type="text" 
                required
                value={formData.rival}
                onChange={(e) => setFormData({...formData, rival: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. A.D. Arganda"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Fecha</label>
              <input 
                type="date" 
                required
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Hora</label>
              <input 
                type="time" 
                required
                value={formData.hora}
                onChange={(e) => setFormData({...formData, hora: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Localía</label>
              <select 
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Local">Local (UD La Poveda)</option>
                <option value="Visitante">Visitante (Fuera)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Competición</label>
              <select 
                value={formData.competicion}
                onChange={(e) => setFormData({...formData, competicion: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Liga">Liga</option>
                <option value="Copa">Copa</option>
                <option value="Amistoso">Amistoso</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Estado Inicial</label>
              <select 
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Programado">Programado</option>
                <option value="Finalizado">Finalizado / Ya jugado</option>
              </select>
            </div>
          </div>

          {formData.estado === 'Finalizado' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850 pt-4 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-semibold text-slate-400">Goles a Favor</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.goles_favor}
                  onChange={(e) => setFormData({...formData, goles_favor: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Goles en Contra</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.goles_contra}
                  onChange={(e) => setFormData({...formData, goles_contra: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Resumen del Acta / Comentarios</label>
                <textarea 
                  value={formData.acta}
                  onChange={(e) => setFormData({...formData, acta: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-11"
                  placeholder="Escribe un breve resumen técnico..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddForm(false)}
              className="text-xs border-slate-800 text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              Añadir Partido
            </Button>
          </div>
        </form>
      )}

      {/* Fixtures List */}
      <div className="space-y-4">
        <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Calendario de Partidos</h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.length > 0 ? (
            matches.map((match) => (
              <div 
                key={match.id}
                className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-800 transition-all gap-4"
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-900/60 pb-3">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    match.competicion === 'Liga' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    match.competicion === 'Copa' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-slate-950 text-slate-500 border border-slate-850'
                  }`}>
                    {match.competicion}
                  </span>

                  <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{match.fecha} • {match.hora}</span>
                  </span>
                </div>

                {/* Main match score screen */}
                <div className="flex items-center justify-around py-2">
                  {/* Home Team */}
                  <div className="flex flex-col items-center gap-1.5 w-1/3 text-center">
                    {match.tipo === 'Local' ? (
                      <div className="w-10 h-10 bg-white p-1 rounded-xl flex items-center justify-center shadow-lg">
                        <UDLaPovedaLogo className="w-full h-full" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center shadow-md">
                        <Trophy className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <span className="font-extrabold text-white text-xs uppercase truncate max-w-full">
                      {match.tipo === 'Local' ? 'LA POVEDA' : match.rival}
                    </span>
                  </div>

                  {/* SCORE BOARD */}
                  <div className="flex flex-col items-center justify-center w-1/3">
                    {match.estado === 'Finalizado' ? (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl md:text-3xl font-black text-white bg-slate-950/60 border border-slate-850 px-3 py-1 rounded-xl">
                          {match.tipo === 'Local' ? match.goles_favor : match.goles_contra}
                        </span>
                        <span className="text-slate-600 font-bold">-</span>
                        <span className="text-2xl md:text-3xl font-black text-white bg-slate-950/60 border border-slate-850 px-3 py-1 rounded-xl">
                          {match.tipo === 'Local' ? match.goles_contra : match.goles_favor}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-extrabold bg-slate-950 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-850">
                        VS
                      </div>
                    )}
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>{match.tipo === 'Local' ? 'Campo Local' : 'Campo Rival'}</span>
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center gap-1.5 w-1/3 text-center">
                    {match.tipo === 'Local' ? (
                      <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center shadow-md">
                        <Trophy className="w-5 h-5 text-slate-500" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-white p-1 rounded-xl flex items-center justify-center shadow-lg">
                        <UDLaPovedaLogo className="w-full h-full" />
                      </div>
                    )}
                    <span className="font-extrabold text-white text-xs uppercase truncate max-w-full">
                      {match.tipo === 'Local' ? match.rival : 'LA POVEDA'}
                    </span>
                  </div>
                </div>

                {/* Match footer actions / Report display */}
                <div className="border-t border-slate-900/60 pt-3 flex items-center justify-between">
                  <div>
                    {match.estado === 'Finalizado' && match.acta && (
                      <Button
                        onClick={() => setShowActaModal(match)}
                        variant="ghost"
                        className="text-[10px] font-black text-blue-400 hover:text-white flex items-center gap-1 px-2.5 h-7 bg-blue-500/10 hover:bg-blue-600 rounded-lg uppercase"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Ver Acta del Partido</span>
                      </Button>
                    )}

                    {match.estado === 'Programado' && (
                      <Button
                        onClick={() => setShowActaModal(match)}
                        className="text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1 px-2.5 h-7 rounded-lg uppercase"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Cerrar Partido</span>
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={() => handleDeleteMatch(match.id, match.rival)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl flex flex-col items-center justify-center gap-2">
              <Trophy className="w-12 h-12 text-slate-800" />
              <h5 className="font-bold text-white text-sm uppercase">No hay partidos programados</h5>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">Comienza añadiendo partidos de liga o amistosos al calendario técnico.</p>
            </div>
          )}
        </div>
      </div>

      {/* Match Result / Acta Editor Modal */}
      {showActaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <form onSubmit={handleSaveActa} className="bg-slate-900 border border-slate-850 rounded-3xl w-full max-w-4xl my-8 overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-850 flex items-center justify-between bg-slate-900">
              <h3 className="font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <span>Acta y Estadísticas Detalladas: VS {showActaModal.rival}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowActaModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto">
              {/* Left Column: Marcador, Acta y Sustituciones (4 cols on large screens) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-4">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850/60 pb-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Resultado General</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-slate-400">Goles La Poveda</label>
                        <button
                          type="button"
                          onClick={() => {
                            const sum = matchPlayerStats.reduce((acc, curr) => acc + (curr.goles_metidos || 0), 0);
                            setShowActaModal({ ...showActaModal, goles_favor: sum });
                            toast.success(`Marcador auto-llenado con la suma de goles: ${sum}`);
                          }}
                          className="text-[9px] text-blue-400 hover:underline font-bold"
                        >
                          Auto-sumar
                        </button>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        required
                        value={showActaModal.goles_favor ?? 0}
                        onChange={(e) => setShowActaModal({...showActaModal, goles_favor: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Goles Rival</label>
                      <input 
                        type="number" 
                        min="0"
                        required
                        value={showActaModal.goles_contra ?? 0}
                        onChange={(e) => setShowActaModal({...showActaModal, goles_contra: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Substitutions Section */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-4">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850/60 pb-2">
                    <ArrowUpDown className="w-4 h-4 text-emerald-500" />
                    <span>Control de Cambios</span>
                  </h4>

                  {/* Add substitution form */}
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Sale Jugadora</label>
                        <select
                          value={newSub.saleId}
                          onChange={(e) => setNewSub({...newSub, saleId: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1.5 mt-1 text-[11px] text-white focus:outline-none"
                        >
                          <option value="">Selecciona...</option>
                          {players.map(p => (
                            <option key={`sale-${p.id}`} value={p.id}>{p.nombre} {p.apellidos} ({p.dorsal})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Entra Jugadora</label>
                        <select
                          value={newSub.entraId}
                          onChange={(e) => setNewSub({...newSub, entraId: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1.5 mt-1 text-[11px] text-white focus:outline-none"
                        >
                          <option value="">Selecciona...</option>
                          {players.map(p => (
                            <option key={`entra-${p.id}`} value={p.id}>{p.nombre} {p.apellidos} ({p.dorsal})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400">Minuto de Cambio</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={newSub.minuto}
                          onChange={(e) => setNewSub({...newSub, minuto: parseInt(e.target.value) || 45})}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1.5 mt-1 text-[11px] text-white focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSub.saleId || !newSub.entraId) {
                            toast.error('Debes seleccionar ambas jugadoras para registrar el cambio.');
                            return;
                          }
                          if (newSub.saleId === newSub.entraId) {
                            toast.error('Una jugadora no puede cambiarse por sí misma.');
                            return;
                          }
                          setSubstitutions([...substitutions, { ...newSub }]);
                          // Auto set minutes: player who left gets 'minuto', player who entered gets '90 - minuto' or similar
                          setMatchPlayerStats(stats => stats.map(st => {
                            if (st.playerId === newSub.saleId) {
                              return { ...st, titular: true, minutos: newSub.minuto };
                            }
                            if (st.playerId === newSub.entraId) {
                              return { ...st, titular: false, minutos: Math.max(0, 90 - newSub.minuto) };
                            }
                            return st;
                          }));
                          toast.success('Cambio registrado e incorporado a la distribución de minutos.');
                          setNewSub({ saleId: '', entraId: '', minuto: 45 });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-[10px] uppercase h-[30px]"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* Substitutions list */}
                  {substitutions.length > 0 ? (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pt-2 border-t border-slate-850/60">
                      {substitutions.map((sub, i) => {
                        const salePlayer = players.find(p => p.id === sub.saleId);
                        const entraPlayer = players.find(p => p.id === sub.entraId);
                        return (
                          <div key={`sub-item-${i}`} className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl text-[10px] border border-slate-850">
                            <span className="text-slate-300 font-semibold truncate max-w-[280px]">
                              Min {sub.minuto}': <span className="text-red-400 font-extrabold">↓</span> {salePlayer?.nombre} <span className="text-emerald-400 font-extrabold">↑</span> {entraPlayer?.nombre}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSubstitutions(substitutions.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-400 font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-2">No se han registrado sustituciones todavía.</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Resumen Técnico del Encuentro</label>
                  <textarea 
                    required
                    value={showActaModal.acta || ''}
                    onChange={(e) => setShowActaModal({...showActaModal, acta: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-32"
                    placeholder="Ej. Dominio absoluto de balón, los goles llegaron de jugadas trenzadas por banda izquierda..."
                  />
                </div>
              </div>

              {/* Right Column: Player lineup and detailed stats (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 flex flex-col h-full space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span>Rendimiento Individual de Jugadoras</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">({players.length} registradas)</span>
                  </div>

                  {players.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs text-slate-500 italic">No hay jugadoras en la plantilla activa para este equipo. Agrega jugadoras en el apartado Plantilla.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {/* Grid Header */}
                      <div className="grid grid-cols-12 gap-1 px-2 py-1.5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        <div className="col-span-3">Jugadora</div>
                        <div className="col-span-1 text-center" title="Titular">TIT</div>
                        <div className="col-span-1 text-center" title="Suplente">SUP</div>
                        <div className="col-span-2 text-center" title="Minutos Jugados">MIN</div>
                        <div className="col-span-1 text-center" title="Goles Marcados">GOL</div>
                        <div className="col-span-1 text-center" title="Asistencias">ASI</div>
                        <div className="col-span-1 text-center" title="Goles Encajados (Portera)">ENC</div>
                        <div className="col-span-1 text-center" title="Tarjetas Amarillas">TA</div>
                        <div className="col-span-1 text-center" title="Tarjetas Rojas">TR</div>
                      </div>

                      {/* Players Rows */}
                      {matchPlayerStats.map((stat, idx) => (
                        <div 
                          key={`row-${stat.playerId}`}
                          className={`grid grid-cols-12 gap-1 items-center px-2 py-2 rounded-xl border text-xs transition-colors ${
                            stat.titular 
                              ? 'bg-blue-950/20 border-blue-900/40' 
                              : stat.suplente
                                ? 'bg-emerald-950/15 border-emerald-900/30'
                                : 'bg-slate-950/60 border-slate-850 hover:border-slate-800'
                          }`}
                        >
                          <div className="col-span-3 flex items-center gap-2 truncate">
                            <span className="w-5 h-5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center font-black text-[9px] text-slate-300 shrink-0">
                              {stat.dorsal}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-white text-[11px] truncate leading-tight">{stat.nombre}</p>
                              <p className="text-[9px] text-slate-500 font-semibold uppercase leading-none mt-0.5">{stat.posicion}</p>
                            </div>
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <input 
                              type="checkbox"
                              checked={stat.titular}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, titular: checked, suplente: checked ? false : s.suplente, minutos: checked ? 90 : (s.suplente ? 30 : 0) } : s
                                ));
                              }}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <input 
                              type="checkbox"
                              checked={stat.suplente}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, suplente: checked, titular: checked ? false : s.titular, minutos: checked ? 30 : (s.titular ? 90 : 0) } : s
                                ));
                              }}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </div>

                          <div className="col-span-2 px-1">
                            <input 
                              type="number"
                              min="0"
                              max="120"
                              value={stat.minutos}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, minutos: val } : s
                                ));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 text-center font-bold text-slate-200 text-xs"
                            />
                          </div>

                          <div className="col-span-1 px-0.5">
                            <input 
                              type="number"
                              min="0"
                              value={stat.goles_metidos}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, goles_metidos: val } : s
                                ));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 text-center font-bold text-emerald-400 text-xs"
                            />
                          </div>

                          <div className="col-span-1 px-0.5">
                            <input 
                              type="number"
                              min="0"
                              value={stat.asistencias || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, asistencias: val } : s
                                ));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 text-center font-bold text-sky-450 text-xs"
                            />
                          </div>

                          <div className="col-span-1 px-0.5">
                            <input 
                              type="number"
                              min="0"
                              value={stat.goles_encajados}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, goles_encajados: val } : s
                                ));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 text-center font-bold text-indigo-400 text-xs"
                              disabled={stat.posicion !== 'PORTERO'}
                              title={stat.posicion !== 'PORTERO' ? 'Solo para Porteras' : ''}
                            />
                          </div>

                          <div className="col-span-1 px-0.5">
                            <input 
                              type="number"
                              min="0"
                              max="2"
                              value={stat.tarjetas_amarillas}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, tarjetas_amarillas: val } : s
                                ));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 text-center font-bold text-amber-400 text-xs"
                            />
                          </div>

                          <div className="col-span-1 px-0.5">
                            <input 
                              type="number"
                              min="0"
                              max="1"
                              value={stat.tarjetas_rojas}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMatchPlayerStats(prev => prev.map((s, i) => 
                                  i === idx ? { ...s, tarjetas_rojas: val } : s
                                ));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 text-center font-bold text-red-500 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-850 flex justify-end gap-2 bg-slate-950">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowActaModal(null)}
                className="text-xs border-slate-850 text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase"
              >
                Cerrar Acta e Guardar Estadísticas
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

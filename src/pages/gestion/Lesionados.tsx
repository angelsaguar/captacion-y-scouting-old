import React, { useState, useEffect } from 'react';
import { CLUB_TEAMS } from '@/types';
import { 
  HeartPulse, 
  Plus, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Stethoscope,
  Activity,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
}

interface InjuryRecord {
  id: string;
  playerId: string;
  playerName: string;
  diagnostico: string;
  fecha_lesion: string;
  gravedad: 'Baja Prolongada' | 'Duda Semanal' | 'Precaución';
  vuelta_estimada: string;
  comentarios?: string;
  recuperado: boolean;
}

export default function Lesionados() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    playerId: '',
    diagnostico: '',
    fecha_lesion: new Date().toISOString().split('T')[0],
    gravedad: 'Duda Semanal' as InjuryRecord['gravedad'],
    vuelta_estimada: '',
    comentarios: ''
  });

  // Load team players & injuries
  useEffect(() => {
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const roster: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];
    setPlayers(roster);

    const key = `team_injuries_${selectedTeam}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setInjuries(JSON.parse(saved));
    } else {
      // Default placeholder injury
      const defaults: InjuryRecord[] = [
        {
          id: 'inj1',
          playerId: '3',
          playerName: 'Marcos Ruiz',
          diagnostico: 'Esguince de tobillo grado II',
          fecha_lesion: '2026-05-10',
          gravedad: 'Duda Semanal',
          vuelta_estimada: '2026-05-24',
          comentarios: 'Comienza carrera continua y trabajo individualizado con el readaptador.',
          recuperado: false
        }
      ];
      localStorage.setItem(key, JSON.stringify(defaults));
      setInjuries(defaults);
    }
  }, [selectedTeam]);

  const saveInjuries = (updated: InjuryRecord[]) => {
    setInjuries(updated);
    localStorage.setItem(`team_injuries_${selectedTeam}`, JSON.stringify(updated));
  };

  const handleAddInjury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerId || !formData.diagnostico.trim()) {
      toast.error('Debe seleccionar un jugador y describir el diagnóstico.');
      return;
    }

    const player = players.find(p => p.id === formData.playerId);
    if (!player) return;

    const newInjury: InjuryRecord = {
      id: crypto.randomUUID(),
      playerId: player.id,
      playerName: `${player.nombre} ${player.apellidos}`,
      diagnostico: formData.diagnostico,
      fecha_lesion: formData.fecha_lesion,
      gravedad: formData.gravedad,
      vuelta_estimada: formData.vuelta_estimada || 'Indefinida',
      comentarios: formData.comentarios,
      recuperado: false
    };

    const updated = [newInjury, ...injuries];
    saveInjuries(updated);
    toast.success(`${player.nombre} ha sido añadido al parte médico.`);

    // Clear form
    setFormData({
      playerId: '',
      diagnostico: '',
      fecha_lesion: new Date().toISOString().split('T')[0],
      gravedad: 'Duda Semanal',
      vuelta_estimada: '',
      comentarios: ''
    });
    setShowAddForm(false);
  };

  const handleDeleteInjury = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el registro médico de ${name}?`)) {
      const updated = injuries.filter(inj => inj.id !== id);
      saveInjuries(updated);
      toast.success('Parte médico eliminado.');
    }
  };

  const handleMarkRecovered = (id: string, playerName: string) => {
    const updated = injuries.map(inj => {
      if (inj.id === id) {
        return { ...inj, recuperado: true };
      }
      return inj;
    });
    saveInjuries(updated);
    toast.success(`¡Excelente noticia! ${playerName} marcado como RECUPERADO.`);
  };

  // Active (non-recovered) vs Recovered (history) injuries
  const activeInjuries = injuries.filter(inj => !inj.recuperado);
  const historyInjuries = injuries.filter(inj => inj.recuperado);

  return (
    <div className="space-y-6">
      {/* Selector & Actions */}
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
          className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir al Parte Médico</span>
        </Button>
      </div>

      {/* Add Injury Form */}
      {showAddForm && (
        <form onSubmit={handleAddInjury} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
          <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2 mb-4">
            <HeartPulse className="w-4 h-4 text-red-500" />
            <span>Registrar lesión de jugadora</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Jugadora Afectada *</label>
              <select 
                required
                value={formData.playerId}
                onChange={(e) => setFormData({...formData, playerId: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 cursor-pointer font-bold"
              >
                <option value="">Selecciona jugadora...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Diagnóstico / Lesión *</label>
              <input 
                type="text" 
                required
                value={formData.diagnostico}
                onChange={(e) => setFormData({...formData, diagnostico: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. Rotura de fibras o sobrecarga..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Fecha de Lesión</label>
              <input 
                type="date" 
                required
                value={formData.fecha_lesion}
                onChange={(e) => setFormData({...formData, fecha_lesion: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Gravedad</label>
              <select 
                value={formData.gravedad}
                onChange={(e) => setFormData({...formData, gravedad: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 cursor-pointer font-bold"
              >
                <option value="Precaución">Precaución / Fatiga</option>
                <option value="Duda Semanal">Duda Semanal</option>
                <option value="Baja Prolongada">Baja Prolongada</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Fecha de Alta Estimada</label>
              <input 
                type="date" 
                value={formData.vuelta_estimada}
                onChange={(e) => setFormData({...formData, vuelta_estimada: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div className="col-span-full">
              <label className="text-xs font-semibold text-slate-400">Comentarios Médicos o de Readaptación</label>
              <textarea 
                value={formData.comentarios}
                onChange={(e) => setFormData({...formData, comentarios: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-20"
                placeholder="Indica si realiza fisio, carrera continua o reposo total..."
              />
            </div>
          </div>

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
              className="text-xs bg-red-600 hover:bg-red-500 text-white"
            >
              Añadir Parte
            </Button>
          </div>
        </form>
      )}

      {/* Main List Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Injuries Grid Column */}
        <div className="space-y-4">
          <h5 className="font-extrabold text-xs text-red-400 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            <span>En Tratamiento / Recuperación ({activeInjuries.length})</span>
          </h5>

          <div className="space-y-3">
            {activeInjuries.length > 0 ? (
              activeInjuries.map((inj) => (
                <div 
                  key={inj.id}
                  className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-800 transition-colors gap-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h6 className="font-extrabold text-white text-xs uppercase truncate leading-none">{inj.playerName}</h6>
                      <p className="text-[10px] text-red-400 font-extrabold uppercase mt-1.5 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                        <span>{inj.diagnostico}</span>
                      </p>
                    </div>

                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                      inj.gravedad === 'Baja Prolongada' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      inj.gravedad === 'Duda Semanal' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {inj.gravedad}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl text-[10px] text-slate-350 font-medium">
                    {inj.comentarios || 'Sin observaciones complementarias de fisioterapia.'}
                  </div>

                  <div className="border-t border-slate-900/60 pt-3 flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Baja: {inj.fecha_lesion} • Vuelta: {inj.vuelta_estimada}</span>
                    </span>

                    <div className="flex gap-1.5">
                      <Button
                        onClick={() => handleMarkRecovered(inj.id, inj.playerName)}
                        className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 px-2.5 h-7 rounded-lg uppercase flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recuperado</span>
                      </Button>

                      <Button
                        onClick={() => handleDeleteInjury(inj.id, inj.playerName)}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl flex flex-col items-center justify-center gap-1">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <h6 className="font-extrabold text-white text-xs uppercase">Plantilla 100% Disponible</h6>
                <p className="text-[10px] text-slate-550 max-w-xs">¡No hay jugadoras de baja actualmente!</p>
              </div>
            )}
          </div>
        </div>

        {/* History Column */}
        <div className="space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Historial de Altas Médicas ({historyInjuries.length})</span>
          </h5>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {historyInjuries.length > 0 ? (
              historyInjuries.map((inj) => (
                <div 
                  key={inj.id}
                  className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h6 className="font-bold text-slate-300 text-xs uppercase truncate">{inj.playerName}</h6>
                    <p className="text-[9px] text-emerald-500 font-extrabold uppercase mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{inj.diagnostico} (Recuperada)</span>
                    </p>
                  </div>

                  <Button
                    onClick={() => handleDeleteInjury(inj.id, inj.playerName)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Stethoscope className="w-8 h-8 text-slate-800" />
                <p className="text-[10px] text-slate-600 font-bold uppercase">Sin historial médico previo</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

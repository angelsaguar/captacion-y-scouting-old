import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, UserPlus, FileText, Loader2, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { CLUB_TEAMS, Observer } from '@/types';
import { supabase } from '@/lib/supabase';
import { getObservers } from '@/lib/observers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CreatePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerCreated: () => void;
}

const POSITIONS = [
  'PORTERO',
  'CENTRAL',
  'LATERAL DERECHO',
  'LATERAL IZQUIERDO',
  'PIVOTE',
  'INTERIOR',
  'MEDIOCAMPISTA',
  'MEDIA PUNTA',
  'EXTREMO DERECHO',
  'EXTREMO IZQUIERDO',
  'DELANTERO'
];

export function CreatePlayerModal({ isOpen, onClose, onPlayerCreated }: CreatePlayerModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [observers, setObservers] = useState<Observer[]>([]);

  // Form State
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [apodo, setApodo] = useState('');
  const [posicion, setPosicion] = useState('CENTRAL');
  const [estado, setEstado] = useState<'Observado' | 'En seguimiento' | 'Interesa' | 'Fichado' | 'Rechazado'>('Observado');
  const [equipoActual, setEquipoActual] = useState('');
  const [equipoAsignado, setEquipoAsignado] = useState('SENIOR FEMENINO');
  const [potencial, setPotencial] = useState(3);
  const [lateralidad, setLateralidad] = useState<'Derecho' | 'Izquierdo' | 'Ambidiestro'>('Derecho');
  const [anioNacimiento, setAnioNacimiento] = useState(new Date().getFullYear() - 17);
  const [observador, setObservador] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadObservers();
    }
  }, [isOpen]);

  const loadObservers = async () => {
    try {
      const list = await getObservers();
      setObservers(list);
    } catch {}
  };

  const handleReset = () => {
    setNombre('');
    setApellidos('');
    setApodo('');
    setPosicion('CENTRAL');
    setEstado('Observado');
    setEquipoActual('');
    setEquipoAsignado('SENIOR FEMENINO');
    setPotencial(3);
    setLateralidad('Derecho');
    setAnioNacimiento(new Date().getFullYear() - 17);
    setObservador('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellidos.trim()) {
      toast.error('Nombre y apellidos son obligatorios');
      return;
    }

    setLoading(true);
    const newId = crypto.randomUUID();
    const playerPayload = {
      id: newId,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      apodo: apodo.trim() || null,
      posicion,
      estado,
      equipo_actual: equipoActual.trim() || null,
      equipo_asignado: equipoAsignado || 'SENIOR FEMENINO',
      potencial,
      lateralidad,
      anio_nacimiento: Number(anioNacimiento) || 2005,
      observador: observador || null,
      es_plantilla: false,
      origen: 'scouting',
      created_at: new Date().toISOString()
    };

    try {
      // 1. Save to Supabase
      const { data, error } = await supabase
        .from('players')
        .insert({
          id: newId,
          nombre: playerPayload.nombre,
          apellidos: playerPayload.apellidos,
          apodo: playerPayload.apodo,
          posicion: playerPayload.posicion,
          estado: playerPayload.estado,
          equipo_actual: playerPayload.equipo_actual,
          equipo_asignado: playerPayload.equipo_asignado,
          potencial: playerPayload.potencial,
          lateralidad: playerPayload.lateralidad,
          anio_nacimiento: playerPayload.anio_nacimiento,
          observador: playerPayload.observador,
          es_plantilla: false,
          origen: 'scouting'
        })
        .select()
        .single();

      if (error) {
        console.warn('Supabase DB insert warning, using local failover:', error);
      }
    } catch (dbErr) {
      console.warn('DB insert error in CreatePlayerModal, saving locally:', dbErr);
    }

    // 2. Always persist locally in scouting_local_players
    const localScoutingSaved = localStorage.getItem('scouting_local_players');
    let localScoutingList: any[] = localScoutingSaved ? JSON.parse(localScoutingSaved) : [];
    
    // Check if player already exists locally
    const normKey = `${playerPayload.nombre} ${playerPayload.apellidos}`.toLowerCase();
    const existingIdx = localScoutingList.findIndex((p: any) => 
      p.id === newId || `${p.nombre} ${p.apellidos}`.toLowerCase() === normKey
    );

    if (existingIdx >= 0) {
      localScoutingList[existingIdx] = { ...localScoutingList[existingIdx], ...playerPayload };
    } else {
      localScoutingList.unshift(playerPayload);
    }
    localStorage.setItem('scouting_local_players', JSON.stringify(localScoutingList));

    // 3. Clean any scouting deletion flags
    const scoutingDelSaved = localStorage.getItem('scouting_deleted_players');
    if (scoutingDelSaved) {
      try {
        const scoutingDelList: string[] = JSON.parse(scoutingDelSaved);
        const cleaned = scoutingDelList.filter(item => 
          item !== newId && 
          item !== normKey
        );
        localStorage.setItem('scouting_deleted_players', JSON.stringify(cleaned));
      } catch {}
    }

    // 4. Sync to team roster if estado === 'Fichado'
    if (estado === 'Fichado' && equipoAsignado) {
      const rosterKey = `team_roster_${equipoAsignado}`;
      const savedRoster = localStorage.getItem(rosterKey);
      let rosterArr: any[] = savedRoster ? JSON.parse(savedRoster) : [];

      const existsInRoster = rosterArr.some((p: any) => 
        p.id === newId || `${p.nombre?.trim()} ${p.apellidos?.trim()}`.toLowerCase() === normKey
      );

      if (!existsInRoster) {
        rosterArr.push({
          id: newId,
          nombre: playerPayload.nombre,
          apellidos: playerPayload.apellidos,
          dorsal: (rosterArr.length + 1).toString(),
          posicion: playerPayload.posicion,
          foto_url: '',
          anio_nacimiento: playerPayload.anio_nacimiento,
          lateralidad: playerPayload.lateralidad,
          estado_fisico: 'Disponible',
          origen: 'scouting'
        });
        localStorage.setItem(rosterKey, JSON.stringify(rosterArr));
      }

      // Clear team deletion records if any
      const teamDelKey = `team_deleted_players_${equipoAsignado}`;
      const teamDelSaved = localStorage.getItem(teamDelKey);
      if (teamDelSaved) {
        try {
          const teamDelList: any[] = JSON.parse(teamDelSaved);
          const cleanedTeamDel = teamDelList.filter(dp => dp.id !== newId && dp.fullName !== normKey);
          localStorage.setItem(teamDelKey, JSON.stringify(cleanedTeamDel));
        } catch {}
      }
    }

    setLoading(false);
    toast.success(`Jugadora ${playerPayload.nombre} ${playerPayload.apellidos} registrada correctamente`);
    handleReset();
    onClose();
    onPlayerCreated();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl z-10 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white italic">Alta Rápida de Jugadora</h2>
                  <p className="text-xs text-slate-400">Registra una nueva jugadora en la base de Captación y Scouting.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Nombre *</Label>
                  <Input 
                    required 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    placeholder="Ej: Lucía" 
                    className="bg-slate-800/60 border-slate-700 text-white" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Apellidos *</Label>
                  <Input 
                    required 
                    value={apellidos} 
                    onChange={e => setApellidos(e.target.value)} 
                    placeholder="Ej: García Martínez" 
                    className="bg-slate-800/60 border-slate-700 text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Apodo / Nombre Deportivo</Label>
                  <Input 
                    value={apodo} 
                    onChange={e => setApodo(e.target.value)} 
                    placeholder="Ej: 'Lu'" 
                    className="bg-slate-800/60 border-slate-700 text-emerald-400 font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Demarcación / Posición *</Label>
                  <Select value={posicion} onValueChange={setPosicion}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar posición" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Estado de Captación *</Label>
                  <Select value={estado} onValueChange={(val: any) => setEstado(val)}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white font-medium">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Observado">Observado</SelectItem>
                      <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                      <SelectItem value="Interesa">Interesa</SelectItem>
                      <SelectItem value="Fichado">Fichado</SelectItem>
                      <SelectItem value="Rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Equipo de Origen (Club)</Label>
                  <Input 
                    value={equipoActual} 
                    onChange={e => setEquipoActual(e.target.value)} 
                    placeholder="Ej: Rayo Vallecano" 
                    className="bg-slate-800/60 border-slate-700 text-white" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Equipo Asignado del Club</Label>
                  <Select value={equipoAsignado} onValueChange={setEquipoAsignado}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLUB_TEAMS.map(team => (
                        <SelectItem key={team} value={team}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Potencial (1-5)</Label>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPotencial(star)}
                        className="p-1 rounded-md hover:bg-slate-800 transition-colors focus:outline-none"
                      >
                        <Star className={`h-6 w-6 ${star <= potencial ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Lateralidad</Label>
                  <Select value={lateralidad} onValueChange={(val: any) => setLateralidad(val)}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white">
                      <SelectValue placeholder="Lateralidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Derecho">Derecho</SelectItem>
                      <SelectItem value="Izquierdo">Izquierdo</SelectItem>
                      <SelectItem value="Ambidiestro">Ambidiestro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Año de Nacimiento</Label>
                  <Input 
                    type="number" 
                    min={1980} 
                    max={2026} 
                    value={anioNacimiento} 
                    onChange={e => setAnioNacimiento(parseInt(e.target.value) || 2005)} 
                    className="bg-slate-800/60 border-slate-700 text-white" 
                  />
                </div>
              </div>

              {observers.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Observador / Scout Asignado</Label>
                  <Select value={observador} onValueChange={setObservador}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 text-white">
                      <SelectValue placeholder="Seleccionar observador (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Sin observador --</SelectItem>
                      {observers.map(obs => (
                        <SelectItem key={obs.id} value={obs.name}>{obs.name} ({obs.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    onClose();
                    navigate('/players/new');
                  }}
                  className="w-full sm:w-auto text-xs text-slate-300 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white"
                >
                  <FileText className="h-4 w-4 mr-2 text-red-400" />
                  Abrir Formulario Completo
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 shadow-lg shadow-red-950/40"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Guardar Jugadora
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

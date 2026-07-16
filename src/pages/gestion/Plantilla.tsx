import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { Player, CLUB_TEAMS } from '@/types';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Download, 
  Search,
  BadgeAlert,
  GraduationCap,
  Shirt,
  CalendarDays,
  Contact,
  Activity,
  Heart,
  Printer,
  MessageCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  foto_url?: string;
  anio_nacimiento?: number;
  lateralidad?: string;
  telefono?: string;
  email?: string;
  estado_fisico: 'Disponible' | 'Lesionado' | 'Duda';
}

export default function Plantilla() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [scoutingSignedPlayers, setScoutingSignedPlayers] = useState<Player[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<TeamPlayer | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<TeamPlayer | null>(null);
  
  // WhatsApp composer state
  const [whatsappModalPlayer, setWhatsappModalPlayer] = useState<TeamPlayer | null>(null);
  const [whatsappMessageText, setWhatsappMessageText] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dorsal: '',
    posicion: 'DELANTERO',
    foto_url: '',
    anio_nacimiento: new Date().getFullYear() - 18,
    lateralidad: 'Derecho',
    telefono: '',
    email: '',
    estado_fisico: 'Disponible' as 'Disponible' | 'Lesionado' | 'Duda'
  });

  // Load team roster from localStorage on team change
  useEffect(() => {
    const key = `team_roster_${selectedTeam}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setPlayers(JSON.parse(saved));
    } else {
      // Default placeholder players for demo if empty
      const defaults: TeamPlayer[] = [
        { id: '1', nombre: 'Carlos', apellidos: 'López', dorsal: '10', posicion: 'DELANTERO', estado_fisico: 'Disponible', anio_nacimiento: 2005, lateralidad: 'Derecho', foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
        { id: '2', nombre: 'Sofía', apellidos: 'Martínez', dorsal: '8', posicion: 'MEDIA PUNTA', estado_fisico: 'Disponible', anio_nacimiento: 2006, lateralidad: 'Ambidiestro', foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop' },
        { id: '3', nombre: 'Marcos', apellidos: 'Ruiz', dorsal: '4', posicion: 'CENTRAL', estado_fisico: 'Lesionado', anio_nacimiento: 2004, lateralidad: 'Derecho', foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }
      ];
      localStorage.setItem(key, JSON.stringify(defaults));
      setPlayers(defaults);
    }
    
    // Load signed players from scouting database
    fetchSignedScoutingPlayers();
  }, [selectedTeam]);

  const fetchSignedScoutingPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('estado', 'Fichado');
      
      if (!error && data) {
        setScoutingSignedPlayers(data);

        // Get deleted player names and IDs to prevent auto-syncing them back
        const deletedKey = `team_deleted_players_${selectedTeam}`;
        const deletedSaved = localStorage.getItem(deletedKey);
        const deletedPlayers: { id?: string; fullName: string }[] = deletedSaved ? JSON.parse(deletedSaved) : [];

        // Auto-sync signed players assigned to SENIOR FEMENINO
        const seniorFemeninoSigned = data.filter(p => {
          const matchTeam = p.equipo_asignado?.toUpperCase() === 'SENIOR FEMENINO';
          if (!matchTeam) return false;
          
          const fullName = `${p.nombre.trim()} ${p.apellidos.trim()}`.toLowerCase();
          const isDeleted = deletedPlayers.some(dp => 
            (dp.id && dp.id === p.id) || dp.fullName === fullName
          );
          return !isDeleted;
        });

        if (seniorFemeninoSigned.length > 0) {
          const key = `team_roster_SENIOR FEMENINO`;
          const saved = localStorage.getItem(key);
          let roster: TeamPlayer[] = saved ? JSON.parse(saved) : [];
          let changed = false;

          seniorFemeninoSigned.forEach(sp => {
            const exists = roster.some(p => 
              p.nombre.trim().toLowerCase() === sp.nombre.trim().toLowerCase() && 
              p.apellidos.trim().toLowerCase() === sp.apellidos.trim().toLowerCase()
            );
            if (!exists) {
              const newPlayer: TeamPlayer = {
                id: sp.id || crypto.randomUUID(),
                nombre: sp.nombre,
                apellidos: sp.apellidos,
                dorsal: sp.dorsal || (roster.length + 1).toString(),
                posicion: sp.posicion,
                foto_url: sp.foto_url || '',
                anio_nacimiento: sp.anio_nacimiento || 2005,
                lateralidad: sp.lateralidad || 'Derecho',
                telefono: sp.telefono || '',
                email: sp.email || '',
                estado_fisico: 'Disponible'
              };
              roster.push(newPlayer);
              changed = true;
            }
          });

          if (changed) {
            localStorage.setItem(key, JSON.stringify(roster));
            if (selectedTeam === 'SENIOR FEMENINO') {
              setPlayers(roster);
            }
            toast.success('Se han sincronizado automáticamente los fichajes de Scouting al Senior Femenino.');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveRoster = (updated: TeamPlayer[]) => {
    setPlayers(updated);
    localStorage.setItem(`team_roster_${selectedTeam}`, JSON.stringify(updated));
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellidos.trim()) {
      toast.error('Nombre y Apellidos son obligatorios');
      return;
    }

    const newPlayer: TeamPlayer = {
      id: crypto.randomUUID(),
      ...formData,
      dorsal: formData.dorsal || (players.length + 1).toString()
    };

    const updated = [...players, newPlayer];
    saveRoster(updated);
    toast.success(`${newPlayer.nombre} ha sido añadido a la plantilla.`);
    
    // Clear form
    setFormData({
      nombre: '',
      apellidos: '',
      dorsal: '',
      posicion: 'DELANTERO',
      foto_url: '',
      anio_nacimiento: new Date().getFullYear() - 18,
      lateralidad: 'Derecho',
      telefono: '',
      email: '',
      estado_fisico: 'Disponible'
    });
    setShowAddForm(false);
  };

  const handleDeletePlayer = (player: TeamPlayer) => {
    const updated = players.filter(p => p.id !== player.id);
    saveRoster(updated);

    // Save to deleted list to prevent auto-syncing back
    const deletedKey = `team_deleted_players_${selectedTeam}`;
    const deletedSaved = localStorage.getItem(deletedKey);
    const deletedPlayers: { id?: string; fullName: string }[] = deletedSaved ? JSON.parse(deletedSaved) : [];
    
    const fullName = `${player.nombre.trim()} ${player.apellidos.trim()}`.toLowerCase();
    const alreadyStored = deletedPlayers.some(dp => 
      (dp.id && dp.id === player.id) || dp.fullName === fullName
    );
    
    if (!alreadyStored) {
      deletedPlayers.push({ id: player.id, fullName });
      localStorage.setItem(deletedKey, JSON.stringify(deletedPlayers));
    }

    toast.success(`${player.nombre} ${player.apellidos} ha sido eliminado de la plantilla.`);
  };

  const handleImportPlayer = (scoutPlayer: Player) => {
    // Check if already in roster
    if (players.some(p => p.nombre.toLowerCase() === scoutPlayer.nombre.toLowerCase() && p.apellidos.toLowerCase() === scoutPlayer.apellidos.toLowerCase())) {
      toast.error('Este jugador ya está en la plantilla.');
      return;
    }

    const newPlayer: TeamPlayer = {
      id: crypto.randomUUID(),
      nombre: scoutPlayer.nombre,
      apellidos: scoutPlayer.apellidos,
      dorsal: scoutPlayer.dorsal || (players.length + 1).toString(),
      posicion: scoutPlayer.posicion,
      foto_url: scoutPlayer.foto_url || '',
      anio_nacimiento: scoutPlayer.anio_nacimiento || 2005,
      lateralidad: scoutPlayer.lateralidad || 'Derecho',
      telefono: scoutPlayer.telefono || '',
      email: scoutPlayer.email || '',
      estado_fisico: 'Disponible'
    };

    const updated = [...players, newPlayer];
    saveRoster(updated);
    toast.success(`Importado con éxito: ${scoutPlayer.nombre} ${scoutPlayer.apellidos}`);
  };

  const filteredPlayers = players.filter(p => 
    `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.posicion.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.dorsal.includes(searchQuery)
  );

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

        <div className="w-full sm:w-auto flex gap-2">
          <Button 
            onClick={() => setShowImportDialog(true)}
            variant="outline" 
            className="flex-1 sm:flex-none text-xs font-bold uppercase tracking-wider border-slate-800 hover:bg-slate-800 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Importar Fichajes</span>
          </Button>

          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 sm:flex-none text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Jugadora</span>
          </Button>
        </div>
      </div>

      {/* Add Player Form */}
      {showAddForm && (
        <form onSubmit={handleAddPlayer} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
          <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-blue-500" />
            <span>Datos de la nueva jugadora</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Nombre *</label>
              <input 
                type="text" 
                required
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. Carlos"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Apellidos *</label>
              <input 
                type="text" 
                required
                value={formData.apellidos}
                onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. Gómez Ruiz"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Dorsal</label>
              <input 
                type="text" 
                value={formData.dorsal}
                onChange={(e) => setFormData({...formData, dorsal: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. 10"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Posición Principal</label>
              <select 
                value={formData.posicion}
                onChange={(e) => setFormData({...formData, posicion: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="PORTERO">PORTERO</option>
                <option value="CENTRAL">CENTRAL</option>
                <option value="LATERAL">LATERAL</option>
                <option value="MEDIO CENTRO DEFENSIVO">MEDIO CENTRO DEFENSIVO</option>
                <option value="INTERIOR">INTERIOR</option>
                <option value="MEDIA PUNTA">MEDIA PUNTA</option>
                <option value="EXTREMO">EXTREMO</option>
                <option value="DELANTERO">DELANTERO</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Año de Nacimiento</label>
              <input 
                type="number" 
                value={formData.anio_nacimiento}
                onChange={(e) => setFormData({...formData, anio_nacimiento: parseInt(e.target.value) || 2005})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Lateralidad</label>
              <select 
                value={formData.lateralidad}
                onChange={(e) => setFormData({...formData, lateralidad: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Derecho">Derecho</option>
                <option value="Izquierdo">Izquierdo</option>
                <option value="Ambidiestro">Ambidiestro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Foto de Perfil (Max 3MB)</label>
              <div className="flex gap-2 mt-1">
                <input 
                  type="url" 
                  value={formData.foto_url}
                  onChange={(e) => setFormData({...formData, foto_url: e.target.value})}
                  className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="https://images.unsplash.com/... o sube un archivo"
                />
                <label className="bg-slate-850 hover:bg-slate-850 border border-slate-750 text-[11px] font-bold text-slate-200 px-3 flex items-center justify-center rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                  <span>Sube</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 3 * 1024 * 1024) {
                          toast.error('La foto es demasiado grande. El límite es de 3MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({...formData, foto_url: reader.result as string});
                          toast.success('Foto cargada correctamente.');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Teléfono</label>
              <input 
                type="tel" 
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="+34 600..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Correo Electrónico</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="jugador@ejemplo.com"
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
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              Guardar Jugadora
            </Button>
          </div>
        </form>
      )}

      {/* Roster Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Buscar jugadora por nombre, dorsal o posición..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/30 border border-slate-900 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
        />
      </div>

      {/* Players list Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.length > 0 ? (
          filteredPlayers.map((player) => (
            <div 
              key={player.id} 
              onClick={() => setSelectedPlayerProfile(player)}
              className="bg-slate-900/40 border border-slate-900 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg hover:shadow-blue-500/5 transition-all gap-4 cursor-pointer group"
            >
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-850 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  {player.foto_url ? (
                    <img 
                      src={player.foto_url} 
                      alt={player.nombre} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-slate-600" />
                  )}
                  <span className="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border border-slate-950">
                    {player.dorsal}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-white text-sm truncate uppercase tracking-tight group-hover:text-blue-400 transition-colors">{player.nombre} {player.apellidos}</h5>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">{player.posicion}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[9px] bg-slate-950 text-slate-400 border border-slate-850 rounded-full px-2 py-0.5 font-semibold">
                      <CalendarDays className="w-2.5 h-2.5" />
                      <span>{player.anio_nacimiento || 'N/A'}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[9px] bg-slate-950 text-slate-400 border border-slate-850 rounded-full px-2 py-0.5 font-semibold">
                      <Shirt className="w-2.5 h-2.5" />
                      <span>{player.lateralidad || 'Derecho'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="border-t border-slate-900 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    player.estado_fisico === 'Disponible' ? 'bg-emerald-500' :
                    player.estado_fisico === 'Lesionado' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{player.estado_fisico}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-blue-400 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity mr-2">Ver Ficha →</span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayerToDelete(player);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                    title="Eliminar de la plantilla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl flex flex-col items-center justify-center gap-2">
            <Users className="w-12 h-12 text-slate-700" />
            <h5 className="font-bold text-white text-sm uppercase">Sin jugadoras registradas</h5>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">Añade jugadoras manualmente o importa tus fichajes desde el apartado de scouting.</p>
          </div>
        )}
      </div>

      {/* Import Scouting Fichados Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-850 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                <span>Importar Fichajes de Scouting</span>
              </h3>
              <button 
                onClick={() => setShowImportDialog(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                A continuación se muestran los jugadores que han sido marcados con el estado <strong className="text-emerald-500">"Fichado"</strong> en el módulo de Scouting. Haz clic en importar para añadirlos a <strong className="text-white">{selectedTeam}</strong>.
              </p>

              <div className="space-y-2">
                {scoutingSignedPlayers.length > 0 ? (
                  scoutingSignedPlayers.map((sp) => (
                    <div 
                      key={sp.id} 
                      className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {sp.foto_url ? (
                            <img src={sp.foto_url} alt={sp.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h6 className="font-bold text-white text-xs truncate uppercase">{sp.nombre} {sp.apellidos}</h6>
                          <p className="text-[9px] text-blue-400 font-extrabold uppercase mt-0.5">{sp.posicion} • {sp.equipo_actual || 'Sin Club'}</p>
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleImportPlayer(sp)}
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold uppercase py-1.5 h-auto rounded-lg"
                      >
                        Importar
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-slate-950 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                    <BadgeAlert className="w-8 h-8 text-slate-700" />
                    <h6 className="font-bold text-slate-400 text-xs uppercase">No hay fichajes disponibles</h6>
                    <p className="text-[10px] text-slate-650 max-w-xs">Registra y marca jugadores como "Fichado" en la sección de Scouting para que aparezcan aquí.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-950">
              <Button 
                variant="outline" 
                onClick={() => setShowImportDialog(false)}
                className="text-xs border-slate-850 text-slate-400 hover:text-white"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ficha Técnica / Profile Detail Modal */}
      {selectedPlayerProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:hidden">
          <div className="bg-slate-900 border border-slate-850 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span>Ficha Técnica y Rendimiento</span>
              </h3>
              <button 
                onClick={() => setSelectedPlayerProfile(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row gap-5 items-center pb-4 border-b border-slate-850">
                <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  {selectedPlayerProfile.foto_url ? (
                    <img src={selectedPlayerProfile.foto_url} alt={selectedPlayerProfile.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-12 h-12 text-slate-700" />
                  )}
                  <span className="absolute bottom-1.5 right-1.5 bg-blue-600 text-white text-xs font-black h-6 w-6 rounded-full flex items-center justify-center border border-slate-950">
                    {selectedPlayerProfile.dorsal}
                  </span>
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">
                    {selectedPlayerProfile.nombre} {selectedPlayerProfile.apellidos}
                  </h4>
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                    {selectedPlayerProfile.posicion} • Dorsal {selectedPlayerProfile.dorsal}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      selectedPlayerProfile.estado_fisico === 'Disponible' ? 'bg-emerald-500' :
                      selectedPlayerProfile.estado_fisico === 'Lesionado' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedPlayerProfile.estado_fisico}</span>
                  </div>
                </div>
              </div>

              {/* Data sheets grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tech specifications */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2">
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-1.5">Especificaciones Físicas y Técnicas</h5>
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Año Nacimiento:</span> <strong className="text-white">{selectedPlayerProfile.anio_nacimiento || 'N/A'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Lateralidad:</span> <strong className="text-white">{selectedPlayerProfile.lateralidad || 'Derecho'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Contacto Telefónico:</span> <strong className="text-white">{selectedPlayerProfile.telefono || 'No registrado'}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Email:</span> <strong className="text-white truncate max-w-[150px]">{selectedPlayerProfile.email || 'No registrado'}</strong></div>
                  </div>
                </div>

                {/* Mocked performance ratings */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2">
                  <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-1.5">Métricas de Rendimiento Estimado</h5>
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Partidos Jugados:</span> <strong className="text-white">14 partidos</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Goles Marcados:</span> <strong className="text-emerald-400">{selectedPlayerProfile.posicion === 'DELANTERO' ? 9 : selectedPlayerProfile.posicion === 'EXTREMO' ? 6 : 1}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Asistencias Realizadas:</span> <strong className="text-indigo-400">5 asistencias</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-semibold">Asistencia Entrenamientos:</span> <strong className="text-amber-400">93% de las sesiones</strong></div>
                  </div>
                </div>
              </div>

              {/* Action bar inside profile */}
              <div className="pt-4 border-t border-slate-850 flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2">
                  {/* WhatsApp send button */}
                  {selectedPlayerProfile.telefono ? (
                    <Button 
                      onClick={() => {
                        setWhatsappModalPlayer(selectedPlayerProfile);
                        setWhatsappMessageText(`Hola ${selectedPlayerProfile.nombre}, `);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl px-4 py-2.5 transition-all flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      variant="outline"
                      className="text-xs border-slate-850 text-slate-500 flex items-center gap-1.5"
                      title="Sin teléfono registrado"
                    >
                      <MessageCircle className="w-4 h-4 text-slate-600" />
                      <span>WhatsApp</span>
                    </Button>
                  )}

                  {/* Print report button */}
                  <Button 
                    onClick={() => {
                      window.focus();
                      window.print();
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded-xl px-4 py-2.5 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Informe PDF</span>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setPlayerToDelete(selectedPlayerProfile);
                    }}
                    variant="ghost" 
                    className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Jugadora</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPlayerProfile(null)}
                    className="text-xs border-slate-800 text-slate-400 hover:text-white"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider">¿Eliminar Jugadora?</h4>
              <p className="text-xs text-slate-400">
                ¿Estás seguro de que deseas eliminar a <strong className="text-white font-bold">{playerToDelete.nombre} {playerToDelete.apellidos}</strong> de la plantilla? Esta acción no se puede deshacer y evitará que se sincronice automáticamente en el futuro.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlayerToDelete(null)}
                className="flex-1 text-xs font-bold uppercase border-slate-800 text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handleDeletePlayer(playerToDelete);
                  if (selectedPlayerProfile && selectedPlayerProfile.id === playerToDelete.id) {
                    setSelectedPlayerProfile(null);
                  }
                  setPlayerToDelete(null);
                }}
                className="flex-1 text-xs font-bold uppercase bg-red-600 hover:bg-red-500 text-white"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Message Composer Modal */}
      {whatsappModalPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2 text-emerald-500 border-b border-slate-800 pb-3">
              <MessageCircle className="w-5 h-5" />
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Redactar Mensaje de WhatsApp</h4>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Destinataria: <strong className="text-white">{whatsappModalPlayer.nombre} {whatsappModalPlayer.apellidos}</strong>
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Teléfono: {whatsappModalPlayer.telefono}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Mensaje</label>
              <textarea
                value={whatsappMessageText}
                onChange={(e) => setWhatsappMessageText(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all font-sans leading-relaxed resize-none"
                placeholder="Escribe tu mensaje aquí..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWhatsappModalPlayer(null)}
                className="flex-1 text-xs font-bold uppercase border-slate-800 text-slate-300 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  let phone = whatsappModalPlayer.telefono.replace(/\D/g, '');
                  if (phone.length === 9) {
                    phone = '34' + phone;
                  }
                  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessageText)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                  setWhatsappModalPlayer(null);
                  toast.success('Abriendo WhatsApp...');
                }}
                className="flex-1 text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Mensaje</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Area for Ficha Técnica (Portal-rendered at document.body for flawless printing) */}
      {selectedPlayerProfile && createPortal(
        <div id="printable-player-report" className="print-only-container p-10 bg-white text-black min-h-screen">
          <div className="max-w-3xl mx-auto border-4 border-double border-slate-400 p-8 rounded-3xl relative">
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 bg-gray-100 border border-gray-300 rounded-xl overflow-hidden flex items-center justify-center">
                  {selectedPlayerProfile.foto_url ? (
                    <img src={selectedPlayerProfile.foto_url} alt={selectedPlayerProfile.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400 text-3xl font-bold">UD</div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase">{selectedPlayerProfile.nombre} {selectedPlayerProfile.apellidos}</h1>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedPlayerProfile.posicion} • DORSAL {selectedPlayerProfile.dorsal}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">U.D. LA POVEDA • INFORME TÉCNICO OFICIAL</p>
                </div>
              </div>
              <div className="bg-slate-900 text-white font-mono font-black text-xl h-12 w-12 rounded-full flex items-center justify-center">
                #{selectedPlayerProfile.dorsal}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-extrabold text-slate-950 uppercase border-b border-gray-300 pb-1 text-[10px] tracking-wider">Datos Personales</h3>
                <p><span className="text-gray-500 font-semibold">Año de Nacimiento:</span> <strong className="text-slate-900">{selectedPlayerProfile.anio_nacimiento || 'N/A'}</strong></p>
                <p><span className="text-gray-500 font-semibold">Lateralidad:</span> <strong className="text-slate-900">{selectedPlayerProfile.lateralidad || 'Derecho'}</strong></p>
                <p><span className="text-gray-500 font-semibold">Estado Físico:</span> <strong className="text-slate-900">{selectedPlayerProfile.estado_fisico}</strong></p>
                <p><span className="text-gray-500 font-semibold">Teléfono:</span> <strong className="text-slate-900">{selectedPlayerProfile.telefono || 'No registrado'}</strong></p>
                <p><span className="text-gray-500 font-semibold">Email:</span> <strong className="text-slate-900">{selectedPlayerProfile.email || 'No registrado'}</strong></p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <h3 className="font-extrabold text-slate-950 uppercase border-b border-gray-300 pb-1 text-[10px] tracking-wider">Rendimiento y Estadísticas</h3>
                <p><span className="text-gray-500 font-semibold">Partidos Disputados:</span> <strong className="text-slate-900">14 partidos</strong></p>
                <p><span className="text-gray-500 font-semibold">Goles Marcados:</span> <strong className="text-slate-900">{selectedPlayerProfile.posicion === 'DELANTERO' ? 9 : selectedPlayerProfile.posicion === 'EXTREMO' ? 6 : 1}</strong></p>
                <p><span className="text-gray-500 font-semibold">Asistencias Realizadas:</span> <strong className="text-slate-900">5 asistencias</strong></p>
                <p><span className="text-gray-500 font-semibold">Asistencia a Entrenamientos:</span> <strong className="text-slate-900">93% de las sesiones</strong></p>
                <p><span className="text-gray-500 font-semibold">Valoración General:</span> <strong className="text-blue-600">8.5 / 10</strong></p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-t border-gray-300 pt-4">
                <h3 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Evaluación Técnica del Entrenador</h3>
                <p className="text-gray-600 leading-relaxed italic">
                  "Jugadora con gran disciplina táctica, excelente toma de decisiones bajo presión y un compromiso de asistencia de entrenamiento excelente. Muestra gran proyección y adaptabilidad al modelo de juego."
                </p>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>U.D. LA POVEDA © 2026</span>
              <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Printable Style Block */}
      <style>{`
        .print-only-container {
          display: none !important;
        }
        @media print {
          html, body {
            background-color: white !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            display: none !important;
          }
          .print-only-container {
            display: block !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          @page {
            size: portrait;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}

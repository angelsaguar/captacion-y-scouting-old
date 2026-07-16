import React, { useState, useEffect } from 'react';
import { CLUB_TEAMS } from '@/types';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Plus, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  Sparkles,
  Award,
  Users,
  ClipboardList,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
}

interface AttendanceRecord {
  playerId: string;
  status: 'Presente' | 'Ausente' | 'No Justificó' | 'Lesionado' | 'Retraso' | 'Justificado';
}

interface SessionTask {
  id: string;
  titulo: string;
  duracion: string;
  descripcion: string;
}

interface SessionFile {
  id: string;
  nombre: string;
  tamano: string;
  tipo: string;
  dataUrl?: string;
}

interface AttendanceSession {
  id: string;
  fecha: string;
  tipo: 'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro';
  descripcion: string;
  records: AttendanceRecord[];
  tareas?: SessionTask[];
  archivos?: SessionFile[];
}

export default function Asistencia() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState<'asistencia' | 'planificacion'>('asistencia');
  const [previewFile, setPreviewFile] = useState<SessionFile | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFile) {
      setPreviewBlobUrl(null);
      return;
    }

    let url: string | null = null;
    try {
      if (previewFile.dataUrl) {
        // Convert data URL to Blob URL to bypass browser iframe & security block on data: URIs
        const arr = previewFile.dataUrl.split(',');
        if (arr.length > 1) {
          const mime = arr[0].match(/:(.*?);/)?.[1] || '';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          url = URL.createObjectURL(blob);
          setPreviewBlobUrl(url);
        } else {
          setPreviewBlobUrl(previewFile.dataUrl);
        }
      }
    } catch (error) {
      console.error("Error creating preview blob URL:", error);
      // Fallback to direct data URL if conversion fails
      setPreviewBlobUrl(previewFile.dataUrl || null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewFile]);
  
  // New session form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Entrenamiento' as 'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro',
    descripcion: 'Sesión de entrenamiento habitual'
  });

  // Load roster and sessions on team change
  useEffect(() => {
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    let currentRoster: TeamPlayer[] = [];
    if (savedRoster) {
      currentRoster = JSON.parse(savedRoster);
    } else {
      currentRoster = [
        { id: '1', nombre: 'Carlos', apellidos: 'López', dorsal: '10', posicion: 'DELANTERO' },
        { id: '2', nombre: 'Sofía', apellidos: 'Martínez', dorsal: '8', posicion: 'MEDIA PUNTA' },
        { id: '3', nombre: 'Marcos', apellidos: 'Ruiz', dorsal: '4', posicion: 'CENTRAL' }
      ];
    }
    setPlayers(currentRoster);

    // Fetch from Supabase, fallback to localStorage
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('team', selectedTeam)
          .order('fecha', { ascending: false });

        if (!error && data) {
          const formatted: AttendanceSession[] = data.map(item => ({
            id: item.id,
            fecha: item.fecha,
            tipo: item.tipo as any,
            descripcion: item.descripcion || '',
            records: item.records || [],
            tareas: item.tareas || [],
            archivos: item.archivos || []
          }));
          
          setSessions(formatted);
          if (formatted.length > 0) {
            setSelectedSession(formatted[0]);
          } else {
            setSelectedSession(null);
          }
          localStorage.setItem(`team_sessions_${selectedTeam}`, JSON.stringify(formatted));
          return;
        } else if (error) {
          console.warn('Error fetching attendance from Supabase, using local fallback:', error);
        }
      } catch (err) {
        console.warn('Exception fetching attendance from Supabase:', err);
      }

      // Local fallback
      const sessionsKey = `team_sessions_${selectedTeam}`;
      const savedSessions = localStorage.getItem(sessionsKey);
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setSelectedSession(parsed[0]);
        } else {
          setSelectedSession(null);
        }
      } else {
        // Create a default session to make it look active immediately
        const defaultRecords = currentRoster.map(p => ({
          playerId: p.id,
          status: 'Presente' as const
        }));
        const defaultSession: AttendanceSession = {
          id: 'default-session-1',
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Entrenamiento',
          descripcion: 'Entrenamiento Táctico de inicio de semana',
          records: defaultRecords
        };
        const initialSessions = [defaultSession];
        localStorage.setItem(sessionsKey, JSON.stringify(initialSessions));
        setSessions(initialSessions);
        setSelectedSession(defaultSession);
      }
    };

    fetchSessions();
  }, [selectedTeam]);

  const saveSessions = async (updated: AttendanceSession[]) => {
    setSessions(updated);
    localStorage.setItem(`team_sessions_${selectedTeam}`, JSON.stringify(updated));

    // Try to sync to Supabase in the background
    try {
      for (const sess of updated) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sess.id);
        const payload = {
          team: selectedTeam,
          fecha: sess.fecha,
          tipo: sess.tipo,
          descripcion: sess.descripcion,
          records: sess.records,
          tareas: sess.tareas || [],
          archivos: sess.archivos || []
        };

        if (isUuid) {
          await supabase
            .from('attendance_sessions')
            .upsert({ id: sess.id, ...payload });
        } else {
          // If it's a temporary ID, insert it and let Supabase assign a real UUID
          const { data, error } = await supabase
            .from('attendance_sessions')
            .insert({ ...payload })
            .select();

          if (!error && data && data[0]) {
            // Update the temporary ID in state and local storage with the new UUID
            sess.id = data[0].id;
            setSessions([...updated]);
            localStorage.setItem(`team_sessions_${selectedTeam}`, JSON.stringify(updated));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync attendance sessions to Supabase:', err);
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (players.length === 0) {
      toast.error('No se pueden crear sesiones si la plantilla está vacía. Añade jugadoras primero.');
      return;
    }

    const defaultRecords: AttendanceRecord[] = players.map(p => ({
      playerId: p.id,
      status: 'Presente'
    }));

    const newSession: AttendanceSession = {
      id: crypto.randomUUID(),
      fecha: newSessionData.fecha,
      tipo: newSessionData.tipo,
      descripcion: newSessionData.descripcion,
      records: defaultRecords
    };

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setSelectedSession(newSession);
    setShowNewForm(false);
    toast.success('Nueva sesión de asistencia creada.');
  };

  const handleUpdateStatus = (playerId: string, status: AttendanceRecord['status']) => {
    if (!selectedSession) return;

    const updatedRecords = selectedSession.records.map(rec => {
      if (rec.playerId === playerId) {
        return { ...rec, status };
      }
      return rec;
    });

    const updatedSession = { ...selectedSession, records: updatedRecords };
    
    // Update active session and general list
    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta sesión de asistencia?')) {
      const updated = sessions.filter(s => s.id !== id);
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        try {
          await supabase
            .from('attendance_sessions')
            .delete()
            .eq('id', id);
        } catch (err) {
          console.warn('Failed to delete attendance session from Supabase:', err);
        }
      }

      saveSessions(updated);
      setSelectedSession(updated.length > 0 ? updated[0] : null);
      toast.success('Sesión de asistencia eliminada.');
    }
  };

  const handleAddTask = (titulo: string, duracion: string, descripcion: string) => {
    if (!selectedSession) return;
    
    const newTask = {
      id: crypto.randomUUID(),
      titulo,
      duracion,
      descripcion
    };

    const currentTareas = selectedSession.tareas || [];
    const updatedSession = {
      ...selectedSession,
      tareas: [...currentTareas, newTask]
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Tarea añadida con éxito');
  };

  const handleDeleteTask = (taskId: string) => {
    if (!selectedSession) return;
    
    const currentTareas = selectedSession.tareas || [];
    const updatedSession = {
      ...selectedSession,
      tareas: currentTareas.filter(t => t.id !== taskId)
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Tarea eliminada');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Check file size (limit to 1.5MB for localStorage)
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 1.5MB para almacenamiento local).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newFile = {
        id: crypto.randomUUID(),
        nombre: file.name,
        tamano: (file.size / 1024).toFixed(1) + ' KB',
        tipo: file.type,
        dataUrl
      };

      const currentFiles = selectedSession.archivos || [];
      const updatedSession = {
        ...selectedSession,
        archivos: [...currentFiles, newFile]
      };

      setSelectedSession(updatedSession);
      const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
      saveSessions(updatedSessions);
      toast.success('Archivo subido con éxito');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFile = (fileId: string) => {
    if (!selectedSession) return;
    
    const currentFiles = selectedSession.archivos || [];
    const updatedSession = {
      ...selectedSession,
      archivos: currentFiles.filter(f => f.id !== fileId)
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Archivo eliminado');
  };

  // Helper stats calculations
  const getSessionStats = (session: AttendanceSession) => {
    const total = session.records.length;
    if (total === 0) return { presentCount: 0, percentage: 0 };
    const presentCount = session.records.filter(r => r.status === 'Presente' || r.status === 'Retraso').length;
    return {
      presentCount,
      percentage: Math.round((presentCount / total) * 100)
    };
  };

  return (
    <div className="space-y-6">
      {/* Selector & Create */}
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
          onClick={() => setShowNewForm(!showNewForm)}
          className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Sesión</span>
        </Button>
      </div>

      {/* New Session Form */}
      {showNewForm && (
        <form onSubmit={handleCreateSession} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
          <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Planificar nueva sesión</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Fecha de la sesión</label>
              <input 
                type="date" 
                required
                value={newSessionData.fecha}
                onChange={(e) => setNewSessionData({...newSessionData, fecha: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Tipo de Sesión</label>
              <select 
                value={newSessionData.tipo}
                onChange={(e) => setNewSessionData({...newSessionData, tipo: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Entrenamiento">Entrenamiento</option>
                <option value="Partido">Partido</option>
                <option value="Reunión">Reunión</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Descripción / Objetivo</label>
              <input 
                type="text" 
                required
                value={newSessionData.descripcion}
                onChange={(e) => setNewSessionData({...newSessionData, descripcion: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. Táctica a balón parado"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNewForm(false)}
              className="text-xs border-slate-800 text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Iniciar Registro
            </Button>
          </div>
        </form>
      )}

      {/* Main Grid: Selector of sessions (Left) + Player status editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Sessions List */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Historial de Sesiones</h5>
            <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-400 px-2.5 py-1 rounded-full font-bold">{sessions.length}</span>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {sessions.length > 0 ? (
              sessions.map((sess) => {
                const stats = getSessionStats(sess);
                const isActive = selectedSession?.id === sess.id;
                
                return (
                  <div 
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isActive 
                        ? 'bg-blue-600/10 border-blue-600' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md mb-1.5 ${
                          sess.tipo === 'Entrenamiento' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          sess.tipo === 'Partido' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {sess.tipo}
                        </span>
                        <h6 className="font-bold text-white text-xs truncate max-w-[160px]">{sess.descripcion}</h6>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 shrink-0">{sess.fecha}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 text-[10px]">
                      <span className="text-slate-400 font-semibold">Asistencia:</span>
                      <span className={`font-black ${stats.percentage >= 80 ? 'text-emerald-400' : stats.percentage >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {stats.percentage}% ({stats.presentCount}/{sess.records.length})
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Calendar className="w-8 h-8 text-slate-700" />
                <p className="text-xs uppercase font-bold text-slate-400">Sin sesiones todavía</p>
                <p className="text-[10px] text-slate-600">Haz clic en Nueva Sesión para empezar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Roster attendance editor */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 min-h-[400px]">
          {selectedSession ? (
            <div className="space-y-6">
              
              {/* Session Header Details */}
              <div className="flex items-start justify-between border-b border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-extrabold text-white text-base uppercase tracking-tight">{selectedSession.descripcion}</h5>
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/10 uppercase">{selectedSession.tipo}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">PROGRAMADA PARA: {selectedSession.fecha}</p>
                </div>

                <Button 
                  onClick={() => handleDeleteSession(selectedSession.id)}
                  variant="ghost"
                  className="text-xs font-bold text-slate-500 hover:text-red-400 py-1.5 h-auto rounded-xl shrink-0"
                >
                  Eliminar Sesión
                </Button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-900 gap-1 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('asistencia')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors border-b-2 rounded-t-lg ${
                    activeTab === 'asistencia'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/10'
                  }`}
                >
                  Asistencia Jugadoras
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('planificacion')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors border-b-2 rounded-t-lg ${
                    activeTab === 'planificacion'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/10'
                  }`}
                >
                  Diseño de la Sesión y Tareas
                </button>
              </div>

              {activeTab === 'asistencia' ? (
                /* Roster Attendance Table Grid */
                <div className="space-y-2.5">
                  {selectedSession.records.map((rec) => {
                  const pInfo = players.find(p => p.id === rec.playerId);
                  if (!pInfo) return null;

                  return (
                    <div 
                      key={rec.playerId}
                      className="bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      {/* Left: Player name & dorsal */}
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-xs rounded-full flex items-center justify-center shrink-0">
                          {pInfo.dorsal}
                        </div>
                        <div>
                          <h6 className="font-bold text-white text-xs uppercase">{pInfo.nombre} {pInfo.apellidos}</h6>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{pInfo.posicion}</p>
                        </div>
                      </div>

                      {/* Right: Interactive attendance statuses */}
                      <div className="flex flex-wrap items-center gap-1">
                        
                        {/* PRESENT */}
                        <button
                          onClick={() => handleUpdateStatus(rec.playerId, 'Presente')}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                            rec.status === 'Presente'
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Presente
                        </button>

                        {/* LATE */}
                        <button
                          onClick={() => handleUpdateStatus(rec.playerId, 'Retraso')}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                            rec.status === 'Retraso'
                              ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                              : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Retraso
                        </button>

                        {/* NO JUSTIFICO */}
                        <button
                          onClick={() => handleUpdateStatus(rec.playerId, 'No Justificó')}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                            rec.status === 'No Justificó' || rec.status === 'Ausente'
                              ? 'bg-red-500/15 border-red-500 text-red-400'
                              : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          No Justificó
                        </button>

                        {/* JUSTIFIED */}
                        <button
                          onClick={() => handleUpdateStatus(rec.playerId, 'Justificado')}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                            rec.status === 'Justificado'
                              ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                              : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Justificado
                        </button>

                        {/* INJURED */}
                        <button
                          onClick={() => handleUpdateStatus(rec.playerId, 'Lesionado')}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                            rec.status === 'Lesionado'
                              ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400'
                              : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Lesionado
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
              ) : (
                /* Planning Dashboard */
                <div className="space-y-6">
                  {/* Tareas / Ejercicios Section */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        <h5 className="font-bold text-white text-xs uppercase tracking-wider">Tareas y Ejercicios Diseñados</h5>
                      </div>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {selectedSession.tareas?.length || 0} tareas
                      </span>
                    </div>

                    {/* Task List */}
                    {selectedSession.tareas && selectedSession.tareas.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSession.tareas.map((task) => (
                          <div key={task.id} className="bg-slate-950/80 border border-slate-850 p-3.5 rounded-xl flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold shrink-0">
                                  {task.duracion} min
                                </span>
                                <h6 className="font-extrabold text-white text-xs uppercase">{task.titulo}</h6>
                              </div>
                              <p className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">{task.descripcion}</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs italic">
                        No hay tareas diseñadas para esta sesión. Añade una tarea a continuación.
                      </div>
                    )}

                    {/* Add Task Form (Inline) */}
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
                      <h6 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Añadir nueva tarea/ejercicio</h6>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input 
                          type="text" 
                          placeholder="Título de la tarea (ej: Rondo 4v4+2)" 
                          id="newTaskTitle"
                          className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input 
                          type="text" 
                          placeholder="Duración (ej: 15 min)" 
                          id="newTaskDuration"
                          className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <textarea 
                        placeholder="Descripción de la tarea, organización, reglas de provocación, etc..." 
                        id="newTaskDesc"
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                      />
                      <div className="flex justify-end">
                        <Button 
                          type="button"
                          onClick={() => {
                            const titleEl = document.getElementById('newTaskTitle') as HTMLInputElement;
                            const durEl = document.getElementById('newTaskDuration') as HTMLInputElement;
                            const descEl = document.getElementById('newTaskDesc') as HTMLTextAreaElement;
                            if (titleEl && durEl && descEl) {
                              if (!titleEl.value.trim()) {
                                toast.error('Especifica un título para la tarea');
                                return;
                              }
                              handleAddTask(titleEl.value, durEl.value || '10', descEl.value);
                              titleEl.value = '';
                              durEl.value = '';
                              descEl.value = '';
                            }
                          }}
                          className="text-[10px] uppercase font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 h-8 px-3 rounded-lg"
                        >
                          Añadir Tarea
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Archivos / Blueprint Upload Section */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                        <h5 className="font-bold text-white text-xs uppercase tracking-wider">Subir Archivo de Sesión (Diseño, PDF, Imagen)</h5>
                      </div>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {selectedSession.archivos?.length || 0} archivos
                      </span>
                    </div>

                    {/* File Upload Dropzone */}
                    <div className="border border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer relative transition-colors bg-slate-950/20 group">
                      <input 
                        type="file" 
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-8 h-8 text-slate-600 group-hover:text-emerald-400 mx-auto transition-colors" />
                      <p className="text-xs text-slate-300 font-bold uppercase mt-2">Seleccionar o arrastrar archivos</p>
                      <p className="text-[10px] text-slate-500 mt-1">Soporta PDF, PNG, JPG, DOCX (Máximo 1.5MB)</p>
                    </div>

                    {/* File List */}
                    {selectedSession.archivos && selectedSession.archivos.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSession.archivos.map((file) => (
                          <div key={file.id} className="bg-slate-950/60 border border-slate-850 hover:border-slate-800 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white uppercase truncate" title={file.nombre}>{file.nombre}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">{file.tamano}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {file.dataUrl && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile(file)}
                                    className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
                                    title="Visualizar archivo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a 
                                    href={file.dataUrl} 
                                    download={file.nombre}
                                    className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
                                    title="Descargar archivo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                              <button 
                                type="button"
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1.5 bg-slate-900 hover:bg-red-500/15 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/20 rounded-lg transition-all"
                                title="Eliminar archivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs italic">
                        No hay archivos subidos para esta sesión.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <Users className="w-12 h-12 text-slate-800" />
              <h5 className="font-bold text-white uppercase text-sm">Sin sesión activa</h5>
              <p className="text-xs text-slate-500 max-w-xs">Selecciona una sesión de asistencia de la izquierda o crea una nueva para registrar la asistencia.</p>
            </div>
          )}
        </div>

      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full shadow-2xl text-left flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h4 className="font-extrabold text-white text-base uppercase tracking-wider truncate max-w-md" title={previewFile.nombre}>
                  {previewFile.nombre}
                </h4>
              </div>
              <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-400 px-2.5 py-1 rounded-full font-bold">
                {previewFile.tamano}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950/50 rounded-2xl p-4 flex items-center justify-center border border-slate-950">
              {previewFile.tipo.startsWith('image/') ? (
                <img 
                  src={previewBlobUrl || previewFile.dataUrl} 
                  alt={previewFile.nombre} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : previewFile.tipo === 'application/pdf' ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <iframe 
                    src={previewBlobUrl || previewFile.dataUrl} 
                    className="w-full h-[55vh] rounded-lg border border-slate-850 bg-white" 
                    title={previewFile.nombre}
                  />
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-4 w-full text-center space-y-1">
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wide">
                      💡 ¿La visualización está bloqueada por el navegador?
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Algunos navegadores bloquean la carga de PDFs dentro de paneles integrados por seguridad. Puedes pulsar el botón{' '}
                      <span className="text-emerald-400 font-bold">"Abrir en Pestaña Nueva"</span> de abajo para visualizarlo en pantalla completa al instante.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-4">
                  <FileText className="w-16 h-16 text-slate-700 mx-auto" />
                  <p className="text-sm font-bold uppercase text-slate-300">Vista previa no disponible para este formato</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Este archivo ({previewFile.nombre}) tiene un formato que no se puede previsualizar directamente en el navegador. Descárgalo para abrirlo con tu aplicación preferida.
                  </p>
                  {previewFile.dataUrl && (
                    <a
                      href={previewBlobUrl || previewFile.dataUrl}
                      download={previewFile.nombre}
                      className="inline-flex items-center gap-2 text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Archivo</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-slate-900">
              {previewBlobUrl && previewFile.tipo === 'application/pdf' && (
                <a
                  href={previewBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold uppercase bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Pestaña Nueva</span>
                </a>
              )}
              {previewFile.dataUrl && (
                <a
                  href={previewBlobUrl || previewFile.dataUrl}
                  download={previewFile.nombre}
                  className="text-xs font-bold uppercase bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-200 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
              )}
              <Button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

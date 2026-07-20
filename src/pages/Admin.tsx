import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { User, Observer, CLUB_TEAMS } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserPlus, 
  Trash2, 
  Mail, 
  Key, 
  UserCheck, 
  Plus, 
  Database, 
  RefreshCw, 
  CloudUpload, 
  CheckCircle, 
  AlertCircle,
  Scale,
  Dumbbell,
  Calendar,
  ChevronRight,
  Users2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getObservers, addObserver, deleteObserver } from '@/lib/observers';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [observers, setObservers] = useState<Observer[]>([]);
  const [loading, setLoading] = useState(true);

  // States for observer management form
  const [newObsName, setNewObsName] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Cloud Sync state
  const [syncingAll, setSyncingAll] = useState(false);
  const [localCounts, setLocalCounts] = useState({
    players: 0,
    matches: 0,
    sessions: 0,
    plans: 0,
    physical: 0,
    anthropometrics: 0,
    coaches: 0,
    needs: 0,
    observers: 0
  });

  const loadLocalCounts = () => {
    let playersCount = 0;
    let matchesCount = 0;
    let sessionsCount = 0;
    let plansCount = 0;

    CLUB_TEAMS.forEach(team => {
      const roster = localStorage.getItem(`team_roster_${team}`);
      if (roster) {
        try { playersCount += JSON.parse(roster).length; } catch {}
      }
      const matches = localStorage.getItem(`team_matches_${team}`);
      if (matches) {
        try { matchesCount += JSON.parse(matches).length; } catch {}
      }
      const sessions = localStorage.getItem(`team_sessions_${team}`);
      if (sessions) {
        try { sessionsCount += JSON.parse(sessions).length; } catch {}
      }
      const plans = localStorage.getItem(`team_gameplans_${team}`);
      if (plans) {
        try { plansCount += JSON.parse(plans).length; } catch {}
      }
    });

    let physicalCount = 0;
    const physical = localStorage.getItem('ud_poveda_physical_test_history');
    if (physical) {
      try { physicalCount = JSON.parse(physical).length; } catch {}
    }

    let anthropometricsCount = 0;
    const antropo = localStorage.getItem('ud_poveda_anthropometric_history');
    if (antropo) {
      try { anthropometricsCount = JSON.parse(antropo).length; } catch {}
    }

    let coachesCount = 0;
    const coaches = localStorage.getItem('ud_lapoveda_coaches_backup');
    if (coaches) {
      try { coachesCount = JSON.parse(coaches).length; } catch {}
    }

    let needsCount = 0;
    const needs = localStorage.getItem('ud_lapoveda_needs_backup');
    if (needs) {
      try { needsCount = JSON.parse(needs).length; } catch {}
    }

    let observersCount = 0;
    const observersSaved = localStorage.getItem('ud_lapoveda_observers_backup');
    if (observersSaved) {
      try { observersCount = JSON.parse(observersSaved).length; } catch {}
    }

    setLocalCounts({
      players: playersCount,
      matches: matchesCount,
      sessions: sessionsCount,
      plans: plansCount,
      physical: physicalCount,
      anthropometrics: anthropometricsCount,
      coaches: coachesCount,
      needs: needsCount,
      observers: observersCount
    });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData) setUsers(usersData);

        const observersList = await getObservers();
        setObservers(observersList);
      } catch (err) {
        console.error('Failed to load initial admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    loadLocalCounts();
  }, []);

  const handleAddObserver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObsName.trim()) {
      toast.error('Por favor escribe un nombre para el observador');
      return;
    }
    setSavingObs(true);
    try {
      const created = await addObserver(newObsName.trim());
      setObservers(prev => [...prev.filter(o => o.id !== created.id), created].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setNewObsName('');
      toast.success('Observador registrado con éxito');
      loadLocalCounts();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar observador');
    } finally {
      setSavingObs(false);
    }
  };

  const handleDeleteObserver = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este observador? No afectará a informes de jugadores existentes.')) return;
    try {
      const success = await deleteObserver(id);
      if (success) {
        setObservers(prev => prev.filter(o => o.id !== id));
        toast.success('Observador eliminado');
        loadLocalCounts();
      } else {
        toast.error('No se pudo eliminar el observador');
      }
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleFullCloudSync = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isUrlValid = (url: any) => typeof url === 'string' && url && (url.startsWith('http://') || url.startsWith('https://'));

    if (!isUrlValid(supabaseUrl) || !supabaseAnonKey) {
      toast.error('Supabase no está configurado. Ve a Ajustes > Secretos en la barra lateral y añade las variables.');
      return;
    }

    setSyncingAll(true);
    const toastId = toast.loading('Iniciando sincronización completa de la base de datos local...');
    
    let stats = {
      players: 0,
      matches: 0,
      sessions: 0,
      plans: 0,
      physical: 0,
      anthropometrics: 0,
      coaches: 0,
      needs: 0,
      observers: 0
    };

    try {
      // 1. Sync Players (Rosters)
      toast.loading('Sincronizando plantillas de equipos...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const rosterStr = localStorage.getItem(`team_roster_${team}`);
        if (rosterStr) {
          try {
            const roster = JSON.parse(rosterStr);
            const updatedRoster = [...roster];
            let changed = false;

            for (let i = 0; i < updatedRoster.length; i++) {
              const p = updatedRoster[i];
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id);
              let targetId = p.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedRoster[i] = { ...p, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                nombre: p.nombre,
                apellidos: p.apellidos,
                posicion: p.posicion,
                dorsal: p.dorsal || null,
                lateralidad: p.lateralidad || 'Derecho',
                anio_nacimiento: p.anio_nacimiento ? parseInt(p.anio_nacimiento as any) : null,
                telefono: p.telefono || null,
                email: p.email || null,
                foto_url: p.foto_url || null,
                estado: 'Fichado',
                equipo_asignado: team
              };

              const { error } = await supabase.from('players').upsert(payload);
              if (!error) stats.players++;
            }

            if (changed) {
              localStorage.setItem(`team_roster_${team}`, JSON.stringify(updatedRoster));
            }
          } catch (e) {
            console.error('Error syncing roster for team ' + team, e);
          }
        }
      }

      // 2. Sync Matches
      toast.loading('Sincronizando histórico de partidos...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const matchesStr = localStorage.getItem(`team_matches_${team}`);
        if (matchesStr) {
          try {
            const matches = JSON.parse(matchesStr);
            const updatedMatches = [...matches];
            let changed = false;

            for (let i = 0; i < updatedMatches.length; i++) {
              const m = updatedMatches[i];
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(m.id);
              let targetId = m.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedMatches[i] = { ...m, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                team: team,
                rival: m.rival,
                fecha: m.fecha,
                hora: m.hora,
                tipo: m.tipo,
                competicion: m.competicion,
                estado: m.estado,
                goles_favor: m.goles_favor !== undefined ? m.goles_favor : null,
                goles_contra: m.goles_contra !== undefined ? m.goles_contra : null,
                acta: m.acta || null,
                estadisticas: m.estadisticas || {}
              };

              const { error } = await supabase.from('team_matches').upsert(payload);
              if (!error) stats.matches++;
            }

            if (changed) {
              localStorage.setItem(`team_matches_${team}`, JSON.stringify(updatedMatches));
            }
          } catch (e) {
            console.error('Error syncing matches for team ' + team, e);
          }
        }
      }

      // 3. Sync Attendance Sessions
      toast.loading('Sincronizando sesiones de asistencia...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const sessionsStr = localStorage.getItem(`team_sessions_${team}`);
        if (sessionsStr) {
          try {
            const sessions = JSON.parse(sessionsStr);
            const updatedSessions = [...sessions];
            let changed = false;

            for (let i = 0; i < updatedSessions.length; i++) {
              const s = updatedSessions[i];
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.id);
              let targetId = s.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedSessions[i] = { ...s, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                team: team,
                fecha: s.fecha,
                tipo: s.tipo,
                descripcion: s.descripcion || null,
                records: s.records || [],
                tareas: s.tareas || [],
                archivos: s.archivos || []
              };

              const { error } = await supabase.from('attendance_sessions').upsert(payload);
              if (!error) stats.sessions++;
            }

            if (changed) {
              localStorage.setItem(`team_sessions_${team}`, JSON.stringify(updatedSessions));
            }
          } catch (e) {
            console.error('Error syncing sessions for team ' + team, e);
          }
        }
      }

      // 4. Sync Match Plans
      toast.loading('Sincronizando planes de partido tácticos...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const plansStr = localStorage.getItem(`team_gameplans_${team}`);
        if (plansStr) {
          try {
            const plans = JSON.parse(plansStr);
            const updatedPlans = [...plans];
            let changed = false;

            for (let i = 0; i < updatedPlans.length; i++) {
              const p = updatedPlans[i];
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id);
              let targetId = p.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedPlans[i] = { ...p, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                team: team,
                rival_name: p.rivalName,
                fecha_partido: p.fechaPartido,
                sistema: p.sistema,
                sistema_rival: p.sistemaRival,
                convocatoria: p.convocatoria || [],
                objetivos_tacticos: p.objetivos_tacticos || '',
                alineacion_propuesta: p.alineacion_propuesta || '',
                puntos_fuertes_rival: p.puntos_fuertes_rival || '',
                balon_parado: p.balon_parado || ''
              };

              const { error } = await supabase.from('match_plans').upsert(payload);
              if (!error) stats.plans++;
            }

            if (changed) {
              localStorage.setItem(`team_gameplans_${team}`, JSON.stringify(updatedPlans));
            }
          } catch (e) {
            console.error('Error syncing match plans for team ' + team, e);
          }
        }
      }

      // 5. Sync Coaches
      toast.loading('Sincronizando directores técnicos...', { id: toastId });
      const coachesStr = localStorage.getItem('ud_lapoveda_coaches_backup');
      if (coachesStr) {
        try {
          const coaches = JSON.parse(coachesStr);
          for (const c of coaches) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.id);
            const payload = {
              id: isUuid ? c.id : undefined,
              nombre: c.nombre,
              club: c.club,
              equipo: c.equipo,
              categoria: c.categoria,
              edad: c.edad || null,
              email: c.email || null,
              telefono: c.telefono || null,
              observaciones: c.observaciones || null,
              equipo_asignado: c.equipo_asignado || null
            };

            const { error } = await supabase.from('coaches').upsert(payload);
            if (!error) stats.coaches++;
          }
        } catch (e) {
          console.error('Error syncing coaches', e);
        }
      }

      // 6. Sync Needs
      toast.loading('Sincronizando necesidades de fichajes...', { id: toastId });
      const needsStr = localStorage.getItem('ud_lapoveda_needs_backup');
      if (needsStr) {
        try {
          const needs = JSON.parse(needsStr);
          for (const n of needs) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(n.id);
            const payload = {
              id: isUuid ? n.id : undefined,
              equipo: n.equipo,
              posicion: n.posicion,
              solicitante: n.solicitante,
              observaciones: n.observaciones || null
            };

            const { error } = await supabase.from('needs').upsert(payload);
            if (!error) stats.needs++;
          }
        } catch (e) {
          console.error('Error syncing needs', e);
        }
      }

      // 7. Sync Observers
      toast.loading('Sincronizando catálogo de observadores...', { id: toastId });
      const observersStr = localStorage.getItem('ud_lapoveda_observers_backup');
      if (observersStr) {
        try {
          const obsList = JSON.parse(observersStr);
          for (const o of obsList) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(o.id);
            const payload = {
              id: isUuid ? o.id : undefined,
              nombre: o.nombre,
              foto_url: o.foto_url || null
            };

            const { error } = await supabase.from('observers').upsert(payload);
            if (!error) stats.observers++;
          }
        } catch (e) {
          console.error('Error syncing observers', e);
        }
      }

      // 8. Sync Physical Tests
      toast.loading('Sincronizando histórico de pruebas físicas...', { id: toastId });
      const physicalStr = localStorage.getItem('ud_poveda_physical_test_history');
      if (physicalStr) {
        try {
          const physList = JSON.parse(physicalStr);
          const { data: dbPlayers } = await supabase.from('players').select('id, nombre, apellidos');
          const attributePayloads: any[] = [];
          const playerIdsToClear = new Set<string>();

          physList.forEach((record: any) => {
            let targetId = record.player_id;
            const match = dbPlayers?.find(p => 
              p.id === record.player_id || 
              `${p.nombre.trim()} ${p.apellidos.trim()}`.toLowerCase() === record.player_name.toLowerCase()
            );
            if (match) {
              targetId = match.id;
            }

            playerIdsToClear.add(targetId);

            if (record.yoyo_m > 0) attributePayloads.push({ player_id: targetId, atributo: `Physical:${record.date}:yoyo_m`, valor: Number(record.yoyo_m) });
            if (record.yoyo_kmh > 0) attributePayloads.push({ player_id: targetId, atributo: `Physical:${record.date}:yoyo_kmh`, valor: Number(record.yoyo_kmh) });
            if (record.illinois > 0) attributePayloads.push({ player_id: targetId, atributo: `Physical:${record.date}:illinois`, valor: Number(record.illinois) });
            if (record.vel30m > 0) attributePayloads.push({ player_id: targetId, atributo: `Physical:${record.date}:vel30m`, valor: Number(record.vel30m) });
          });

          for (const pid of Array.from(playerIdsToClear)) {
            await supabase.from('player_attributes').delete().eq('player_id', pid).like('atributo', 'Physical:%');
          }

          if (attributePayloads.length > 0) {
            await supabase.from('player_attributes').upsert(attributePayloads);
            stats.physical = physList.length;
          }
        } catch (e) {
          console.error('Error syncing physical tests', e);
        }
      }

      // 9. Sync Anthropometrics
      toast.loading('Sincronizando controles antropométricos...', { id: toastId });
      const antropoStr = localStorage.getItem('ud_poveda_anthropometric_history');
      if (antropoStr) {
        try {
          const antList = JSON.parse(antropoStr);
          const { data: dbPlayers } = await supabase.from('players').select('id, nombre, apellidos');
          const attributePayloads: any[] = [];
          const playerIdsToClear = new Set<string>();

          antList.forEach((record: any) => {
            let targetId = record.player_id;
            const match = dbPlayers?.find(p => 
              p.id === record.player_id || 
              `${p.nombre.trim()} ${p.apellidos.trim()}`.toLowerCase() === record.player_name.toLowerCase()
            );
            if (match) {
              targetId = match.id;
            }

            playerIdsToClear.add(targetId);

            const metrics = [
              { key: 'weight', val: record.weight },
              { key: 'height', val: record.height },
              { key: 'body_fat_pct', val: record.body_fat_pct },
              { key: 'muscle_pct', val: record.muscle_pct },
              { key: 'water_pct', val: record.water_pct },
              { key: 'waist_cm', val: record.waist_cm },
              { key: 'hip_cm', val: record.hip_cm },
              { key: 'wingspan_cm', val: record.wingspan_cm }
            ];

            metrics.forEach(m => {
              if (m.val > 0) {
                attributePayloads.push({
                  player_id: targetId,
                  atributo: `Antropo:${record.date}:${m.key}`,
                  valor: Number(m.val)
                });
              }
            });
          });

          for (const pid of Array.from(playerIdsToClear)) {
            await supabase.from('player_attributes').delete().eq('player_id', pid).like('atributo', 'Antropo:%');
          }

          if (attributePayloads.length > 0) {
            await supabase.from('player_attributes').upsert(attributePayloads);
            stats.anthropometrics = antList.length;
          }
        } catch (e) {
          console.error('Error syncing anthropometrics', e);
        }
      }

      toast.success('¡Sincronización completada con éxito!', { id: toastId });
      toast.success(`Datos cargados a Supabase: ${stats.players} jugadoras, ${stats.matches} partidos, ${stats.sessions} asistencias, ${stats.plans} planes, ${stats.physical} pruebas físicas, ${stats.anthropometrics} controles antropométricos.`);
      loadLocalCounts();
    } catch (err: any) {
      console.error(err);
      toast.error('Ocurrió un error en la sincronización general: ' + (err.message || err), { id: toastId });
    } finally {
      setSyncingAll(false);
    }
  };

  const registrationKey = import.meta.env.VITE_REGISTRATION_KEY || 'lapoveda_secret_2026';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
          <p className="text-muted-foreground">Gestión de usuarios, permisos y copia de seguridad cloud.</p>
        </div>
        <Button className="bg-slate-900">
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Scout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-widest">Scouts Activos</CardTitle>
            <Shield className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-widest">Clave de Registro de analistas</CardTitle>
            <Key className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div>
              <p className="text-xl font-mono font-bold text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg inline-block select-all">
                {registrationKey}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Comparte esta clave con otros analistas para que puedan registrarse en la aplicación.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SYNC PANEL CARD */}
      <Card className="border border-blue-900/40 bg-slate-950/40 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-900 bg-slate-950/80 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg font-bold">Copia de Seguridad y Sincronización Supabase Cloud</CardTitle>
                <p className="text-xs text-slate-400">Sube y respalda todo el almacenamiento de local-storage en tu base de datos central de Supabase.</p>
              </div>
            </div>
            <Button 
              onClick={handleFullCloudSync} 
              disabled={syncingAll}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-lg shadow-blue-600/15"
            >
              {syncingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Sincronizar Todo en Supabase
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
            {[
              { label: 'Jugadoras de Plantilla', count: localCounts.players, icon: Users2, color: 'text-emerald-400 bg-emerald-500/5' },
              { label: 'Historial de Partidos', count: localCounts.matches, icon: Calendar, color: 'text-blue-400 bg-blue-500/5' },
              { label: 'Control de Asistencias', count: localCounts.sessions, icon: CheckCircle, color: 'text-violet-400 bg-violet-500/5' },
              { label: 'Planes de Partido', count: localCounts.plans, icon: ChevronRight, color: 'text-amber-400 bg-amber-500/5' },
              { label: 'Pruebas Físicas', count: localCounts.physical, icon: Dumbbell, color: 'text-rose-400 bg-rose-500/5' },
              { label: 'Controles Antropométricos', count: localCounts.anthropometrics, icon: Scale, color: 'text-sky-400 bg-sky-500/5' },
              { label: 'Ficheros de Coaches', count: localCounts.coaches, icon: Shield, color: 'text-teal-400 bg-teal-500/5' },
              { label: 'Informe de Necesidades', count: localCounts.needs, icon: AlertCircle, color: 'text-indigo-400 bg-indigo-500/5' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">{item.label}</span>
                    <strong className="text-lg font-black text-white">{item.count} <span className="text-[10px] text-slate-400 font-normal">locales</span></strong>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-4 bg-blue-500/5 border border-blue-900/20 rounded-xl text-left flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300 leading-relaxed">
              <span className="font-bold block text-blue-200 mb-0.5">ℹ️ Acerca del proceso:</span>
              La sincronización realiza una operación de <strong>Upsert</strong> inteligente. Los registros locales con identificadores UUID se actualizarán o insertarán en Supabase respetando la integridad. Si los registros locales poseen identificaciones provisionales, el sistema les asignará UUIDs seguros de forma automática para evitar colisiones y los guardará sincronizados en tu sesión local.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
           </Table>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm mt-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
          <div>
            <CardTitle>Directorio de Observadores / Scouts</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Da de alta nuevos observadores para que se puedan seleccionar al dar de alta un jugador.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddObserver} className="flex gap-3 max-w-md bg-slate-900/20 p-1.5 rounded-xl border border-slate-800">
            <Input
              placeholder="Nombre del nuevo observador..."
              value={newObsName}
              onChange={(e) => setNewObsName(e.target.value)}
              className="bg-transparent border-none text-white focus-visible:ring-0 text-sm"
            />
            <Button type="submit" disabled={savingObs} className="bg-blue-600 hover:bg-blue-500 font-bold shrink-0 rounded-lg">
              <Plus className="w-4 h-4 mr-1.5" /> Registrar
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Observador</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-500 italic">
                    No hay observadores de alta todavía. Registra uno arriba.
                  </TableCell>
                </TableRow>
              ) : (
                observers.map((obs) => (
                  <TableRow key={obs.id}>
                    <TableCell className="font-semibold text-slate-200">{obs.nombre}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {obs.created_at ? new Date(obs.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-950/20 rounded-lg hover:text-red-400"
                        onClick={() => handleDeleteObserver(obs.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


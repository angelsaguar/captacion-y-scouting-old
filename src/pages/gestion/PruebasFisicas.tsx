import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Search, 
  Save, 
  Download, 
  Upload, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Filter, 
  Calendar, 
  Zap, 
  Clock, 
  Activity, 
  ChevronRight, 
  History, 
  User, 
  Users, 
  CheckCircle2,
  Cloud,
  ArrowLeftRight,
  Info,
  CalendarDays,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CLUB_TEAMS } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  anio_nacimiento?: number;
}

interface PhysicalTestHistoryRecord {
  id: string;            // Unique UUID or timestamp-based ID
  player_id: string;     // Player's unique ID
  player_name: string;   // Display name
  team: string;          // Team name (e.g. "Senior Femenino")
  date: string;          // Registration date "YYYY-MM-DD"
  yoyo_m: number;        // Yo-Yo Test Distance (meters)
  yoyo_kmh: number;      // Yo-Yo Max Speed (km/h)
  illinois: number;      // Illinois Agility (seconds)
  vel30m: number;        // 30m Sprint Speed (seconds)
  notes?: string;        // Optional remarks/comments
}

export default function PruebasFisicas() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [allPlayers, setAllPlayers] = useState<(TeamPlayer & { team: string })[]>([]);
  
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Unified History state
  const [historyRecords, setHistoryRecords] = useState<PhysicalTestHistoryRecord[]>([]);

  // Form states
  const [formPlayerId, setFormPlayerId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [yoyoM, setYoyoM] = useState<string>('');
  const [yoyoKmh, setYoyoKmh] = useState<string>('');
  const [illinois, setIllinois] = useState<string>('');
  const [vel30m, setVel30m] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Search & Filter states
  const [filterTeam, setFilterTeam] = useState<string>('Todos');
  const [filterPlayerId, setFilterPlayerId] = useState<string>('Todos');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Comparison module states
  const [selectedComparePlayerId, setSelectedComparePlayerId] = useState<string>('');
  const [compareDateA, setCompareDateA] = useState<string>('');
  const [compareDateB, setCompareDateB] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'yoyo' | 'illinois' | 'vel30'>('yoyo');

  // Load all players and local history records
  useEffect(() => {
    // 1. Gather all players from all teams in localStorage to form a unified pool
    const pool: (TeamPlayer & { team: string })[] = [];
    CLUB_TEAMS.forEach(team => {
      const rosterKey = `team_roster_${team}`;
      const savedRoster = localStorage.getItem(rosterKey);
      if (savedRoster) {
        const roster: TeamPlayer[] = JSON.parse(savedRoster);
        roster.forEach(p => {
          pool.push({ ...p, team });
        });
      }
    });
    setAllPlayers(pool);

    // 2. Load physical test history from localStorage
    const savedHistory = localStorage.getItem('ud_poveda_physical_test_history');
    if (savedHistory) {
      setHistoryRecords(JSON.parse(savedHistory));
    } else {
      // Migrate legacy structure if present
      const migrated: PhysicalTestHistoryRecord[] = [];
      CLUB_TEAMS.forEach(team => {
        const legacyTestsKey = `team_physical_tests_${team}`;
        const legacySaved = localStorage.getItem(legacyTestsKey);
        if (legacySaved) {
          try {
            const legacyData = JSON.parse(legacySaved);
            const rosterKey = `team_roster_${team}`;
            const rosterSaved = localStorage.getItem(rosterKey);
            const roster: TeamPlayer[] = rosterSaved ? JSON.parse(rosterSaved) : [];
            
            Object.keys(legacyData).forEach(pId => {
              const legacyItem = legacyData[pId];
              const player = roster.find(r => r.id === pId);
              if (!player) return;

              // Extract Baseline
              if (legacyItem.inicio_yoyo_m || legacyItem.inicio_illinois || legacyItem.inicio_vel30m) {
                migrated.push({
                  id: `${pId}_baseline`,
                  player_id: pId,
                  player_name: `${player.nombre} ${player.apellidos}`,
                  team: team,
                  date: '2025-09-15', // Approximate baseline date
                  yoyo_m: parseFloat(legacyItem.inicio_yoyo_m) || 0,
                  yoyo_kmh: parseFloat(legacyItem.inicio_yoyo_kmh) || 0,
                  illinois: parseFloat(legacyItem.inicio_illinois) || 0,
                  vel30m: parseFloat(legacyItem.inicio_vel30m) || 0,
                  notes: 'Control Inicial Migrado'
                });
              }
              // Extract Mid-season
              if (legacyItem.mid_yoyo_m || legacyItem.mid_illinois || legacyItem.mid_vel30m) {
                migrated.push({
                  id: `${pId}_mid`,
                  player_id: pId,
                  player_name: `${player.nombre} ${player.apellidos}`,
                  team: team,
                  date: '2026-01-14', // Approximate mid-season date
                  yoyo_m: parseFloat(legacyItem.mid_yoyo_m) || 0,
                  yoyo_kmh: parseFloat(legacyItem.mid_yoyo_kmh) || 0,
                  illinois: parseFloat(legacyItem.mid_illinois) || 0,
                  vel30m: parseFloat(legacyItem.mid_vel30m) || 0,
                  notes: 'Control Enero Migrado'
                });
              }
              // Extract Final
              if (legacyItem.final_yoyo_m || legacyItem.final_illinois || legacyItem.final_vel30m) {
                migrated.push({
                  id: `${pId}_final`,
                  player_id: pId,
                  player_name: `${player.nombre} ${player.apellidos}`,
                  team: team,
                  date: '2026-05-20', // Approximate final date
                  yoyo_m: parseFloat(legacyItem.final_yoyo_m) || 0,
                  yoyo_kmh: parseFloat(legacyItem.final_yoyo_kmh) || 0,
                  illinois: parseFloat(legacyItem.final_illinois) || 0,
                  vel30m: parseFloat(legacyItem.final_vel30m) || 0,
                  notes: 'Control Final Migrado'
                });
              }
            });
          } catch (e) {
            console.error('Error migrating legacy physical records', e);
          }
        }
      });

      if (migrated.length > 0) {
        setHistoryRecords(migrated);
        localStorage.setItem('ud_poveda_physical_test_history', JSON.stringify(migrated));
      }
    }
  }, []);

  // Update players list when selected team changes in the form
  useEffect(() => {
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const roster: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];
    setPlayers(roster);
    
    // Automatically select the first player of that roster if available
    if (roster.length > 0) {
      setFormPlayerId(roster[0].id);
    } else {
      setFormPlayerId('');
    }
  }, [selectedTeam]);

  // Synchronize from Supabase (Pull)
  const handleSyncFromCloud = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Descargando datos de pruebas físicas desde la nube...');
    try {
      // 1. Fetch all players
      const { data: dbPlayers, error: dbPlayersError } = await supabase
        .from('players')
        .select('id, nombre, apellidos')
        .eq('estado', 'Fichado');
        
      if (dbPlayersError) throw dbPlayersError;

      // 2. Fetch all physical attributes
      const { data: dbAttrs, error: dbAttrsError } = await supabase
        .from('player_attributes')
        .select('player_id, atributo, valor')
        .like('atributo', 'Physical:%');
        
      if (dbAttrsError) throw dbAttrsError;

      if (!dbAttrs || dbAttrs.length === 0) {
        toast.info('No se encontraron registros de pruebas físicas en la nube. Se usará el almacenamiento local.', { id: toastId });
        setIsSyncing(false);
        return;
      }

      // 3. Group and parse attributes
      const parsedRecords: Record<string, any> = {};
      
      dbAttrs.forEach(attr => {
        const parts = attr.atributo.split(':');
        if (parts.length >= 3) {
          const date = parts[1]; // YYYY-MM-DD
          const metric = parts[2]; // yoyo_m, yoyo_kmh, illinois, vel30m
          const playerId = attr.player_id;
          
          // Find player details
          const playerObj = dbPlayers?.find(p => p.id === playerId) || 
                            allPlayers.find(p => p.id === playerId);
          const playerName = playerObj ? `${playerObj.nombre} ${playerObj.apellidos}` : 'Jugadora Desconocida';
          
          // Find player's team
          const localPlayer = allPlayers.find(p => p.id === playerId);
          const team = localPlayer ? localPlayer.team : (CLUB_TEAMS[0]);

          const recordKey = `${playerId}_${date}`;
          if (!parsedRecords[recordKey]) {
            parsedRecords[recordKey] = {
              id: recordKey,
              player_id: playerId,
              player_name: playerName,
              team: team,
              date: date,
              yoyo_m: 0,
              yoyo_kmh: 0,
              illinois: 0,
              vel30m: 0,
              notes: 'Sincronizado de la Nube'
            };
          }
          
          if (metric === 'yoyo_m') parsedRecords[recordKey].yoyo_m = attr.valor;
          if (metric === 'yoyo_kmh') parsedRecords[recordKey].yoyo_kmh = attr.valor;
          if (metric === 'illinois') parsedRecords[recordKey].illinois = attr.valor;
          if (metric === 'vel30m') parsedRecords[recordKey].vel30m = attr.valor;
        }
      });

      const list: PhysicalTestHistoryRecord[] = Object.values(parsedRecords);
      
      // Sort chronologically (descending)
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistoryRecords(list);
      localStorage.setItem('ud_poveda_physical_test_history', JSON.stringify(list));
      toast.success(`Sincronización completada: ${list.length} registros cargados de la nube.`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al descargar de la nube: ' + (err.message || err), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Synchronize to Supabase (Push)
  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Sincronizando pruebas físicas con la nube...');
    try {
      // 1. Load active db players for matching
      const { data: dbPlayers, error: dbPlayersError } = await supabase
        .from('players')
        .select('id, nombre, apellidos')
        .eq('estado', 'Fichado');

      if (dbPlayersError) throw dbPlayersError;

      // 2. Prepare database payloads
      const attributePayloads: { player_id: string; atributo: string; valor: number }[] = [];
      const playerIdsToClear = new Set<string>();

      historyRecords.forEach(record => {
        let targetId = record.player_id;
        const match = dbPlayers?.find(p => 
          p.id === record.player_id || 
          `${p.nombre.trim()} ${p.apellidos.trim()}`.toLowerCase() === record.player_name.toLowerCase()
        );
        if (match) {
          targetId = match.id;
        }

        playerIdsToClear.add(targetId);

        // Create payloads for each metric
        if (record.yoyo_m !== undefined && record.yoyo_m > 0) {
          attributePayloads.push({
            player_id: targetId,
            atributo: `Physical:${record.date}:yoyo_m`,
            valor: Number(record.yoyo_m)
          });
        }
        if (record.yoyo_kmh !== undefined && record.yoyo_kmh > 0) {
          attributePayloads.push({
            player_id: targetId,
            atributo: `Physical:${record.date}:yoyo_kmh`,
            valor: Number(record.yoyo_kmh)
          });
        }
        if (record.illinois !== undefined && record.illinois > 0) {
          attributePayloads.push({
            player_id: targetId,
            atributo: `Physical:${record.date}:illinois`,
            valor: Number(record.illinois)
          });
        }
        if (record.vel30m !== undefined && record.vel30m > 0) {
          attributePayloads.push({
            player_id: targetId,
            atributo: `Physical:${record.date}:vel30m`,
            valor: Number(record.vel30m)
          });
        }
      });

      // 3. Clear existing physical attributes for the relevant players to avoid orphans
      for (const pid of Array.from(playerIdsToClear)) {
        await supabase.from('player_attributes')
          .delete()
          .eq('player_id', pid)
          .like('atributo', 'Physical:%');
      }

      // 4. Batch upsert the new physical attributes
      if (attributePayloads.length > 0) {
        const { error: upsertErr } = await supabase
          .from('player_attributes')
          .upsert(attributePayloads);

        if (upsertErr) throw upsertErr;
      }

      toast.success(`Éxito: ${historyRecords.length} registros sincronizados con la base de datos cloud.`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al sincronizar con la nube: ' + (err.message || err), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Form Submission
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPlayerId) {
      toast.error('Por favor, selecciona una jugadora válida.');
      return;
    }

    if (!formDate) {
      toast.error('Por favor, introduce una fecha de registro.');
      return;
    }

    const selectedPlayer = players.find(p => p.id === formPlayerId);
    if (!selectedPlayer) {
      toast.error('Jugadora no encontrada en la plantilla activa.');
      return;
    }

    const parseVal = (val: string): number => {
      if (!val) return 0;
      return parseFloat(val.replace(',', '.')) || 0;
    };

    const numYoyoM = parseVal(yoyoM);
    const numYoyoKmh = parseVal(yoyoKmh);
    const numIllinois = parseVal(illinois);
    const numVel30m = parseVal(vel30m);

    if (numYoyoM === 0 && numYoyoKmh === 0 && numIllinois === 0 && numVel30m === 0) {
      toast.error('Por favor, introduce al menos una métrica de rendimiento válida.');
      return;
    }

    // Check if a record already exists for this player on this date
    const recordKey = `${formPlayerId}_${formDate}`;
    const existingIndex = historyRecords.findIndex(r => r.player_id === formPlayerId && r.date === formDate);

    const newRecord: PhysicalTestHistoryRecord = {
      id: recordKey,
      player_id: formPlayerId,
      player_name: `${selectedPlayer.nombre} ${selectedPlayer.apellidos}`,
      team: selectedTeam,
      date: formDate,
      yoyo_m: numYoyoM,
      yoyo_kmh: numYoyoKmh,
      illinois: numIllinois,
      vel30m: numVel30m,
      notes: formNotes || 'Control Físico'
    };

    let updatedHistory = [...historyRecords];
    if (existingIndex > -1) {
      // Overwrite / Update
      updatedHistory[existingIndex] = newRecord;
      toast.success(`Registro actualizado para ${selectedPlayer.nombre} el día ${formDate}.`);
    } else {
      // Add new
      updatedHistory.unshift(newRecord);
      toast.success(`Control físico de ${selectedPlayer.nombre} guardado correctamente.`);
    }

    // Sort chronologically
    updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setHistoryRecords(updatedHistory);
    localStorage.setItem('ud_poveda_physical_test_history', JSON.stringify(updatedHistory));

    // Reset metrics fields
    setYoyoM('');
    setYoyoKmh('');
    setIllinois('');
    setVel30m('');
    setFormNotes('');
  };

  // Delete a physical record
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de control físico?')) {
      const updated = historyRecords.filter(r => r.id !== id);
      setHistoryRecords(updated);
      localStorage.setItem('ud_poveda_physical_test_history', JSON.stringify(updated));
      toast.success('Registro eliminado.');
    }
  };

  // Export Filtered History to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredRecords.map((r, idx) => ({
        'Nº': idx + 1,
        'FECHA': r.date,
        'JUGADORA': r.player_name,
        'EQUIPO': r.team,
        'YO-YO DISTANCIA (m)': r.yoyo_m || '-',
        'YO-YO VELOCIDAD (km/h)': r.yoyo_kmh || '-',
        'AGILIDAD ILLINOIS (s)': r.illinois || '-',
        'VELOCIDAD 30M (s)': r.vel30m || '-',
        'OBSERVACIONES': r.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Controles");
      
      const max_cols = [
        { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
      ];
      worksheet['!cols'] = max_cols;

      XLSX.writeFile(workbook, `historial_pruebas_fisicas.xlsx`);
      toast.success('Historial exportado a Excel con éxito.');
    } catch (err) {
      toast.error('Error al exportar a Excel.');
    }
  };

  // Import from Excel to History
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.error('El archivo de Excel está vacío.');
          return;
        }

        const updatedHistory = [...historyRecords];
        let importCount = 0;

        rawData.forEach((row: any) => {
          const rowName = String(row['JUGADORA'] || '').trim().toLowerCase();
          const rowTeam = String(row['EQUIPO'] || '').trim();
          const rowDate = String(row['FECHA'] || new Date().toISOString().split('T')[0]);

          // Attempt to match player in all players pool
          const matchedPlayer = allPlayers.find(p => {
            const fullName = `${p.nombre} ${p.apellidos}`.toLowerCase();
            return fullName.includes(rowName) || rowName.includes(p.nombre.toLowerCase());
          });

          if (matchedPlayer) {
            const parseNum = (v: any) => {
              if (!v || v === '-') return 0;
              return parseFloat(String(v).replace(',', '.')) || 0;
            };

            const recordKey = `${matchedPlayer.id}_${rowDate}`;
            const existingIdx = updatedHistory.findIndex(h => h.id === recordKey);

            const newRec: PhysicalTestHistoryRecord = {
              id: recordKey,
              player_id: matchedPlayer.id,
              player_name: `${matchedPlayer.nombre} ${matchedPlayer.apellidos}`,
              team: matchedPlayer.team || rowTeam || CLUB_TEAMS[0],
              date: rowDate,
              yoyo_m: parseNum(row['YO-YO DISTANCIA (m)'] || row['YOYO_M'] || 0),
              yoyo_kmh: parseNum(row['YO-YO VELOCIDAD (km/h)'] || row['YOYO_KMH'] || 0),
              illinois: parseNum(row['AGILIDAD ILLINOIS (s)'] || row['ILLINOIS'] || 0),
              vel30m: parseNum(row['VELOCIDAD 30M (s)'] || row['VEL30M'] || 0),
              notes: String(row['OBSERVACIONES'] || 'Excel Import')
            };

            if (existingIdx > -1) {
              updatedHistory[existingIdx] = newRec;
            } else {
              updatedHistory.unshift(newRec);
            }
            importCount++;
          }
        });

        if (importCount > 0) {
          // Sort chronologically
          updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistoryRecords(updatedHistory);
          localStorage.setItem('ud_poveda_physical_test_history', JSON.stringify(updatedHistory));
          toast.success(`Importados correctamente ${importCount} registros de rendimiento.`);
        } else {
          toast.warning('No se pudo identificar a las jugadoras por nombre completo en el Excel.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al parsear el archivo de Excel.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  // Filtered history records logic
  const filteredRecords = historyRecords.filter(r => {
    // 1. Team filter
    if (filterTeam !== 'Todos' && r.team !== filterTeam) return false;
    
    // 2. Player filter
    if (filterPlayerId !== 'Todos' && r.player_id !== filterPlayerId) return false;
    
    // 3. Date filter
    if (filterDate && r.date !== filterDate) return false;

    // 4. Text query (for quick filter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.player_name.toLowerCase().includes(q);
      const matchTeam = r.team.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      if (!matchName && !matchTeam && !matchNotes) return false;
    }

    return true;
  });

  // Unique list of dates in history for date filtering
  const uniqueDates = Array.from(new Set(historyRecords.map(r => r.date))).sort();

  // Players filtered by the filter-team to feed the player filter dropdown
  const filterTeamPlayers = allPlayers.filter(p => filterTeam === 'Todos' || p.team === filterTeam);

  // Set default comparison player when list is loaded
  useEffect(() => {
    if (historyRecords.length > 0 && !selectedComparePlayerId) {
      // Find the first player who has at least one record
      const firstWithRecord = historyRecords[0].player_id;
      setSelectedComparePlayerId(firstWithRecord);
    }
  }, [historyRecords]);

  // Handle comparison dates defaults when comparison player changes
  useEffect(() => {
    if (selectedComparePlayerId) {
      const playerRecs = historyRecords
        .filter(r => r.player_id === selectedComparePlayerId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // chronological order
      
      if (playerRecs.length >= 2) {
        setCompareDateA(playerRecs[0].date);
        setCompareDateB(playerRecs[playerRecs.length - 1].date);
      } else if (playerRecs.length === 1) {
        setCompareDateA(playerRecs[0].date);
        setCompareDateB('');
      } else {
        setCompareDateA('');
        setCompareDateB('');
      }
    }
  }, [selectedComparePlayerId, historyRecords]);

  // Progression data for selected player
  const getSelectedPlayerChartData = () => {
    if (!selectedComparePlayerId) return [];
    return historyRecords
      .filter(r => r.player_id === selectedComparePlayerId)
      .map(r => ({
        fecha: r.date,
        'Yo-Yo Test (m)': r.yoyo_m || null,
        'Yo-Yo Vel. (km/h)': r.yoyo_kmh || null,
        'Agilidad Illinois (s)': r.illinois || null,
        'Velocidad 30M (s)': r.vel30m || null
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()); // chronological sort
  };

  const chartData = getSelectedPlayerChartData();

  // Calculate direct progress summary
  const getProgressSummary = () => {
    if (!selectedComparePlayerId || !compareDateA || !compareDateB) return null;
    const recA = historyRecords.find(r => r.player_id === selectedComparePlayerId && r.date === compareDateA);
    const recB = historyRecords.find(r => r.player_id === selectedComparePlayerId && r.date === compareDateB);

    if (!recA || !recB) return null;

    const calcDiff = (valA: number, valB: number, lowerIsBetter = false) => {
      if (!valA || !valB) return null;
      const absDiff = valB - valA;
      const pctDiff = (absDiff / valA) * 100;
      const isImprovement = lowerIsBetter ? absDiff < 0 : absDiff > 0;
      return {
        valA,
        valB,
        absDiff: absDiff.toFixed(2),
        pctDiff: pctDiff.toFixed(1),
        isImprovement
      };
    };

    return {
      yoyo: calcDiff(recA.yoyo_m, recB.yoyo_m, false),
      yoyoKmh: calcDiff(recA.yoyo_kmh, recB.yoyo_kmh, false),
      illinois: calcDiff(recA.illinois, recB.illinois, true),
      vel30m: calcDiff(recA.vel30m, recB.vel30m, true)
    };
  };

  const progressSummary = getProgressSummary();
  const comparePlayer = allPlayers.find(p => p.id === selectedComparePlayerId);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Dumbbell className="w-40 h-40 text-white" />
        </div>
        
        <div className="space-y-1 z-10">
          <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase block">MÓDULO DE VALORACIÓN</span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Control y Pruebas Físicas</h2>
          <p className="text-xs text-slate-400 font-bold uppercase">U.D. LA POVEDA • HISTORIAL DE CAPACIDAD ATLÉTICA Y EVOLUCIÓN</p>
        </div>

        <div className="flex flex-wrap gap-2.5 z-10 w-full md:w-auto">
          {/* Cloud Sync Buttons */}
          <Button
            onClick={handleSyncFromCloud}
            disabled={isSyncing}
            variant="outline"
            className="flex-1 md:flex-none text-xs font-bold uppercase tracking-wider border-slate-850 hover:bg-slate-900 text-slate-300 hover:text-white flex items-center justify-center gap-2"
          >
            <Cloud className={cn("w-4 h-4 text-emerald-400", isSyncing && "animate-spin")} />
            <span>Descargar Cloud</span>
          </Button>

          <Button
            onClick={handleSyncToCloud}
            disabled={isSyncing}
            variant="outline"
            className="flex-1 md:flex-none text-xs font-bold uppercase tracking-wider border-blue-500/30 hover:bg-blue-950/20 text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2"
          >
            <Cloud className={cn("w-4 h-4 text-blue-400", isSyncing && "animate-spin")} />
            <span>Sincronizar Subida</span>
          </Button>

          {/* Tab switches */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-850 gap-1 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => setActiveTab('form')}
              className={cn(
                "flex-1 sm:flex-none text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                activeTab === 'form' 
                  ? "bg-amber-500 text-slate-950 shadow-md" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Registro</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex-1 sm:flex-none text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                activeTab === 'history' 
                  ? "bg-amber-500 text-slate-950 shadow-md" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial y Comparativas</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: REGISTRATION FORM */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Input Form */}
          <div className="lg:col-span-2 bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-6">
            <div className="border-b border-slate-900 pb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Formulario de Evaluación de Aptitudes</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 uppercase font-bold">Introduce los datos del control atlético en el orden correspondiente</p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-6 text-left">
              {/* Selector Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">1. Seleccionar Equipo</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-bold uppercase"
                  >
                    {CLUB_TEAMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">2. Seleccionar Jugadora</label>
                  <select
                    value={formPlayerId}
                    onChange={(e) => setFormPlayerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-bold uppercase"
                  >
                    {players.length === 0 ? (
                      <option value="">No hay jugadoras de alta</option>
                    ) : (
                      players.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.dorsal} • {p.nombre} {p.apellidos} ({p.posicion})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">3. Fecha del Registro</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Metrics Fields in Order */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-4">
                <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider block border-b border-slate-900 pb-2">
                  4. Métricas de Rendimiento Físico
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Yo-Yo Distance */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-blue-400" />
                      <span>Yo-Yo Test - Distancia Recomenzada (metros)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 1240"
                      value={yoyoM}
                      onChange={(e) => setYoyoM(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">Metros totales recorridos en la prueba de recuperación intermitente Yo-Yo.</span>
                  </div>

                  {/* Yo-Yo Speed */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span>Yo-Yo Test - Velocidad Estimada (km/h)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 14.5"
                      value={yoyoKmh}
                      onChange={(e) => setYoyoKmh(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">Velocidad máxima estimada correspondiente al último nivel superado.</span>
                  </div>

                  {/* Illinois Agility */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Test de Agilidad de Illinois (segundos)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 16.85"
                      value={illinois}
                      onChange={(e) => setIllinois(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">Tiempo en completar el circuito de agilidad con giros y eslalon. (Menos es mejor)</span>
                  </div>

                  {/* Speed 30M */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Sprint de Velocidad Lineal - 30 Metros (segundos)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 4.25"
                      value={vel30m}
                      onChange={(e) => setVel30m(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">Tiempo de aceleración lineal máxima en 30 metros llanos. (Menos es mejor)</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">5. Observaciones o Incidencias</label>
                <textarea
                  placeholder="Añade detalles relevantes del control (ej: 'Falta por molestia en isquiotibiales', 'Calzado nuevo', etc.)"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-amber-500 text-xs text-white p-3 rounded-xl focus:outline-none min-h-[80px]"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setYoyoM('');
                    setYoyoKmh('');
                    setIllinois('');
                    setVel30m('');
                    setFormNotes('');
                  }}
                  className="text-xs font-bold uppercase text-slate-400 hover:text-white"
                >
                  Limpiar campos
                </Button>
                
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs tracking-wider px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Registro</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Quick Help / Instructions Sidebar */}
          <div className="space-y-6">
            {/* Directives */}
            <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 text-left space-y-4">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                <Info className="w-4 h-4 text-amber-500" />
                <span>Instrucciones de Uso</span>
              </h4>

              <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <p>Selecciona primero el <strong>Equipo</strong> para filtrar la lista de jugadoras activas y registradas en la app.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <p>Elige a la <strong>Jugadora</strong> en el desplegable e introduce la <strong>Fecha del Control</strong> (puedes registrar varios al año por jugadora).</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <p>Completa las marcas físicas. Si no se realiza un test específico en esta fecha, puedes dejar la casilla en blanco.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">4</div>
                  <p>Pulsa en <strong>"Guardar Registro"</strong>. Los datos se almacenarán localmente. Al terminar, no olvides sincronizar con la <strong>Nube Cloud</strong> desde los botones superiores.</p>
                </div>
              </div>
            </div>

            {/* Quick stats panel */}
            <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 text-left space-y-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider border-b border-slate-900 pb-3">
                Resumen del Historial
              </h4>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-850/50">
                  <span className="text-[9px] text-slate-500 font-black uppercase">Controles Totales</span>
                  <div className="text-xl font-black text-white mt-1">{historyRecords.length}</div>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-850/50">
                  <span className="text-[9px] text-slate-500 font-black uppercase">Jugadoras Evaluadas</span>
                  <div className="text-xl font-black text-amber-500 mt-1">
                    {Array.from(new Set(historyRecords.map(r => r.player_id))).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: HISTORY, SEARCH FILTERS & COMPARISON */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>Buscador y Filtros de Rendimiento</span>
              </h4>
              
              <div className="flex items-center gap-2">
                {/* Excel tools */}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                  id="excel-import-history"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('excel-import-history')?.click()}
                  className="text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border border-slate-850 text-slate-400 hover:text-white transition-all"
                >
                  Importar Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 transition-all"
                >
                  Exportar Filtrado
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Filter by Team */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtrar por Equipo</label>
                <select
                  value={filterTeam}
                  onChange={(e) => {
                    setFilterTeam(e.target.value);
                    setFilterPlayerId('Todos'); // reset player filter
                  }}
                  className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Todos">TODOS LOS EQUIPOS</option>
                  {CLUB_TEAMS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Player */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtrar por Jugadora</label>
                <select
                  value={filterPlayerId}
                  onChange={(e) => setFilterPlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Todos">TODAS LAS JUGADORAS</option>
                  {filterTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.dorsal} • {p.nombre} {p.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtrar por Fecha</label>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-mono font-bold"
                >
                  <option value="">TODAS LAS FECHAS</option>
                  {uniqueDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Filter by text */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Búsqueda rápida</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Escribe nombre, obs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 focus:border-amber-500 text-xs rounded-xl pl-9 pr-3 py-2.5 text-white font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Records Table and Comparison split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: History Records Table (7 columns) */}
            <div className="lg:col-span-7 bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  Listado de Controles ({filteredRecords.length})
                </h4>
                <span className="text-[10px] text-slate-500 font-black">Escala Métricas Estándar</span>
              </div>

              <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950/40">
                <table className="w-full border-collapse text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-900 font-black text-slate-400 uppercase text-[9px] border-b border-slate-850 tracking-wider">
                      <th className="p-3">FECHA</th>
                      <th className="p-3">JUGADORA</th>
                      <th className="p-3 text-center text-blue-400">YO-YO (m)</th>
                      <th className="p-3 text-center text-yellow-500">YO-YO (km/h)</th>
                      <th className="p-3 text-center text-emerald-400">ILLINOIS (s)</th>
                      <th className="p-3 text-center text-amber-500">VEL 30M (s)</th>
                      <th className="p-3 text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 font-semibold">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 uppercase font-bold">
                          No hay registros que coincidan con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{r.date}</td>
                          <td className="p-3">
                            <div className="font-bold text-white uppercase text-[11px]">{r.player_name}</div>
                            <div className="text-[9px] text-slate-500 uppercase font-black">{r.team}</div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-blue-300">{r.yoyo_m || '-'}</td>
                          <td className="p-3 text-center font-mono text-slate-300">{r.yoyo_kmh || '-'}</td>
                          <td className="p-3 text-center font-mono text-emerald-300">{r.illinois ? `${r.illinois}s` : '-'}</td>
                          <td className="p-3 text-center font-mono text-amber-300">{r.vel30m ? `${r.vel30m}s` : '-'}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {/* Quick click to select for comparison */}
                              <button
                                onClick={() => setSelectedComparePlayerId(r.player_id)}
                                title="Seleccionar para comparativa"
                                className="p-1.5 rounded-lg bg-blue-900/10 hover:bg-blue-900/30 text-blue-400 transition-colors border border-blue-500/10"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteRecord(r.id)}
                                className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-900/40 text-red-400 transition-colors border border-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side: Evolutionary Comparison Dashboard (5 columns) */}
            <div className="lg:col-span-5 bg-slate-950/20 border border-slate-900 rounded-3xl p-6 text-left space-y-6">
              <div className="border-b border-slate-900 pb-3">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>Análisis de Evolución Temporal</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Compara el progreso de una jugadora entre dos fechas de control</p>
              </div>

              {/* Player Selector for Comparison */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Selecciona la Deportista a Comparar</label>
                <select
                  value={selectedComparePlayerId}
                  onChange={(e) => setSelectedComparePlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-extrabold uppercase"
                >
                  <option value="">-- Elige una Deportista --</option>
                  {Array.from(new Set(historyRecords.map(r => r.player_id))).map(pid => {
                    const rec = historyRecords.find(r => r.player_id === pid);
                    return (
                      <option key={pid} value={pid}>
                        {rec ? rec.player_name : `Jugadora ID ${pid}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {comparePlayer && (
                <>
                  {/* Select Dates for Comparison */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-950/40 border border-slate-900 p-3.5 rounded-2xl">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Fecha Inicial (A)</label>
                      <select
                        value={compareDateA}
                        onChange={(e) => setCompareDateA(e.target.value)}
                        className="bg-slate-900 border border-slate-850 text-xs text-white p-2 rounded-xl focus:outline-none font-mono"
                      >
                        <option value="">Elegir fecha...</option>
                        {historyRecords
                          .filter(r => r.player_id === selectedComparePlayerId)
                          .map(r => (
                            <option key={r.date} value={r.date}>{r.date}</option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Fecha Final (B)</label>
                      <select
                        value={compareDateB}
                        onChange={(e) => setCompareDateB(e.target.value)}
                        className="bg-slate-900 border border-slate-850 text-xs text-white p-2 rounded-xl focus:outline-none font-mono"
                      >
                        <option value="">Elegir fecha...</option>
                        {historyRecords
                          .filter(r => r.player_id === selectedComparePlayerId && r.date !== compareDateA)
                          .map(r => (
                            <option key={r.date} value={r.date}>{r.date}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* progression comparison cards */}
                  {progressSummary ? (
                    <div className="space-y-3">
                      <span className="text-[9px] text-amber-500 font-black uppercase tracking-wider block">
                        Diferencial Evolutivo (Control A vs Control B)
                      </span>

                      <div className="grid grid-cols-1 gap-2.5">
                        {/* YoYo Distance Progress */}
                        {progressSummary.yoyo && (
                          <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex justify-between items-center">
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Yo-Yo Test Distancia</span>
                              <div className="text-xs font-mono text-slate-350">
                                {progressSummary.yoyo.valA}m <span className="text-slate-650">➔</span> {progressSummary.yoyo.valB}m
                              </div>
                            </div>
                            <div className={cn(
                              "text-right font-black px-2.5 py-1.5 rounded-xl text-xs",
                              progressSummary.yoyo.isImprovement ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            )}>
                              {Number(progressSummary.yoyo.absDiff) > 0 ? '+' : ''}{progressSummary.yoyo.absDiff}m ({progressSummary.yoyo.pctDiff}%)
                            </div>
                          </div>
                        )}

                        {/* Illinois Progress */}
                        {progressSummary.illinois && (
                          <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex justify-between items-center">
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Circuito de Agilidad Illinois</span>
                              <div className="text-xs font-mono text-slate-350">
                                {progressSummary.illinois.valA}s <span className="text-slate-650">➔</span> {progressSummary.illinois.valB}s
                              </div>
                            </div>
                            <div className={cn(
                              "text-right font-black px-2.5 py-1.5 rounded-xl text-xs",
                              progressSummary.illinois.isImprovement ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            )}>
                              {Number(progressSummary.illinois.absDiff) > 0 ? '+' : ''}{progressSummary.illinois.absDiff}s ({progressSummary.illinois.pctDiff}%)
                            </div>
                          </div>
                        )}

                        {/* Vel30m Progress */}
                        {progressSummary.vel30m && (
                          <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex justify-between items-center">
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Sprint Lineal de Velocidad 30m</span>
                              <div className="text-xs font-mono text-slate-350">
                                {progressSummary.vel30m.valA}s <span className="text-slate-650">➔</span> {progressSummary.vel30m.valB}s
                              </div>
                            </div>
                            <div className={cn(
                              "text-right font-black px-2.5 py-1.5 rounded-xl text-xs",
                              progressSummary.vel30m.isImprovement ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            )}>
                              {Number(progressSummary.vel30m.absDiff) > 0 ? '+' : ''}{progressSummary.vel30m.absDiff}s ({progressSummary.vel30m.pctDiff}%)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-900/40 text-slate-500 text-xs text-center border border-dashed border-slate-850">
                      Elige dos fechas de control para ver el desglose analítico de progreso.
                    </div>
                  )}

                  {/* Timeline Chart */}
                  <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-900 pb-2">
                      <span className="text-[9px] text-slate-400 font-black uppercase">Evolución Histórica de {comparePlayer.nombre}</span>
                      
                      {/* Metric Toggle */}
                      <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-850 gap-0.5">
                        <button
                          onClick={() => setChartMetric('yoyo')}
                          className={cn(
                            "text-[8px] font-black uppercase px-2 py-1 rounded",
                            chartMetric === 'yoyo' ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                          )}
                        >
                          YoYo
                        </button>
                        <button
                          onClick={() => setChartMetric('illinois')}
                          className={cn(
                            "text-[8px] font-black uppercase px-2 py-1 rounded",
                            chartMetric === 'illinois' ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                          )}
                        >
                          Illinois
                        </button>
                        <button
                          onClick={() => setChartMetric('vel30')}
                          className={cn(
                            "text-[8px] font-black uppercase px-2 py-1 rounded",
                            chartMetric === 'vel30' ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                          )}
                        >
                          30m
                        </button>
                      </div>
                    </div>

                    {chartData.length > 0 ? (
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="fecha" stroke="#64748b" fontSize={9} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: 10 }} />
                            <Legend wrapperStyle={{ fontSize: 9 }} />
                            {chartMetric === 'yoyo' && (
                              <Line type="monotone" dataKey="Yo-Yo Test (m)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                            )}
                            {chartMetric === 'illinois' && (
                              <Line type="monotone" dataKey="Agilidad Illinois (s)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                            )}
                            {chartMetric === 'vel30' && (
                              <Line type="monotone" dataKey="Velocidad 30M (s)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-xs text-slate-600">No hay datos suficientes para trazar la gráfica.</div>
                    )}
                  </div>
                </>
              )}

              {!comparePlayer && (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-900 text-center text-xs text-slate-500 uppercase font-bold flex flex-col items-center justify-center gap-3">
                  <CalendarDays className="w-8 h-8 text-slate-600" />
                  <span>Elige un jugador en el desplegable superior para ver su comparativa y gráfica de progreso.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

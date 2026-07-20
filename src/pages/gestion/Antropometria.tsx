import React, { useState, useEffect } from 'react';
import { 
  Scale, 
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
  Heart,
  ChevronDown
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

interface AnthropometricRecord {
  id: string;            // Unique UUID or timestamp-based ID
  player_id: string;     // Player's unique ID
  player_name: string;   // Display name
  team: string;          // Team name (e.g. "Senior Femenino")
  date: string;          // Registration date "YYYY-MM-DD"
  weight: number;        // Peso (kg)
  height: number;        // Altura (cm)
  body_fat_pct: number;  // % Grasa Corporal
  muscle_pct: number;    // % Masa Muscular
  water_pct: number;     // % Agua Corporal
  waist_cm: number;      // Perímetro Cintura (cm)
  hip_cm: number;        // Perímetro Cadera (cm)
  wingspan_cm: number;   // Envergadura (cm)
  notes?: string;        // Optional remarks/comments
}

export default function Antropometria() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [allPlayers, setAllPlayers] = useState<(TeamPlayer & { team: string })[]>([]);
  
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // History state
  const [historyRecords, setHistoryRecords] = useState<AnthropometricRecord[]>([]);

  // Form states
  const [formPlayerId, setFormPlayerId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [bodyFatPct, setBodyFatPct] = useState<string>('');
  const [musclePct, setMusclePct] = useState<string>('');
  const [waterPct, setWaterPct] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipCm, setHipCm] = useState<string>('');
  const [wingspanCm, setWingspanCm] = useState<string>('');
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
  const [chartMetric, setChartMetric] = useState<'weight' | 'composition' | 'measurements'>('weight');

  // Load players and local records
  useEffect(() => {
    // 1. Gather all players from all teams in localStorage to form a unified pool
    const pool: (TeamPlayer & { team: string })[] = [];
    CLUB_TEAMS.forEach(team => {
      const rosterKey = `team_roster_${team}`;
      const savedRoster = localStorage.getItem(rosterKey);
      if (savedRoster) {
        try {
          const roster: TeamPlayer[] = JSON.parse(savedRoster);
          roster.forEach(p => {
            pool.push({ ...p, team });
          });
        } catch (e) {
          console.error(e);
        }
      }
    });
    setAllPlayers(pool);

    // 2. Load anthropometric history from localStorage
    const savedHistory = localStorage.getItem('ud_poveda_anthropometric_history');
    if (savedHistory) {
      try {
        setHistoryRecords(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Seed initial dummy controls with realistic data for demoing if empty
      const dummyHistory: AnthropometricRecord[] = [];
      setHistoryRecords(dummyHistory);
    }
  }, []);

  // Update players list when selected team changes in the form
  useEffect(() => {
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const roster: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];
    setPlayers(roster);
    
    if (roster.length > 0) {
      setFormPlayerId(roster[0].id);
    } else {
      setFormPlayerId('');
    }
  }, [selectedTeam]);

  // Synchronize from Supabase (Pull)
  const handleSyncFromCloud = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Descargando datos antropométricos desde la nube...');
    try {
      // Fetch all players to link names
      const { data: dbPlayers, error: dbPlayersError } = await supabase
        .from('players')
        .select('id, nombre, apellidos')
        .eq('estado', 'Fichado');
        
      if (dbPlayersError) throw dbPlayersError;

      // Fetch all attributes with prefix 'Antropo:'
      const { data: dbAttrs, error: dbAttrsError } = await supabase
        .from('player_attributes')
        .select('player_id, atributo, valor')
        .like('atributo', 'Antropo:%');
        
      if (dbAttrsError) throw dbAttrsError;

      if (!dbAttrs || dbAttrs.length === 0) {
        toast.info('No se encontraron registros de antropometría en la nube. Se usará el almacenamiento local.', { id: toastId });
        setIsSyncing(false);
        return;
      }

      // Group attributes by player_id and date
      const parsedRecords: Record<string, any> = {};
      
      dbAttrs.forEach(attr => {
        const parts = attr.atributo.split(':');
        if (parts.length >= 3) {
          const date = parts[1]; // YYYY-MM-DD
          const metric = parts[2]; // weight, height, body_fat_pct, etc.
          const playerId = attr.player_id;
          
          const playerObj = dbPlayers?.find(p => p.id === playerId) || 
                            allPlayers.find(p => p.id === playerId);
          const playerName = playerObj ? `${playerObj.nombre} ${playerObj.apellidos}` : 'Jugadora Desconocida';
          
          const localPlayer = allPlayers.find(p => p.id === playerId);
          const team = localPlayer ? localPlayer.team : CLUB_TEAMS[0];

          const recordKey = `${playerId}_${date}`;
          if (!parsedRecords[recordKey]) {
            parsedRecords[recordKey] = {
              id: recordKey,
              player_id: playerId,
              player_name: playerName,
              team: team,
              date: date,
              weight: 0,
              height: 0,
              body_fat_pct: 0,
              muscle_pct: 0,
              water_pct: 0,
              waist_cm: 0,
              hip_cm: 0,
              wingspan_cm: 0,
              notes: 'Sincronizado de la Nube'
            };
          }
          
          if (metric === 'weight') parsedRecords[recordKey].weight = attr.valor;
          if (metric === 'height') parsedRecords[recordKey].height = attr.valor;
          if (metric === 'body_fat_pct') parsedRecords[recordKey].body_fat_pct = attr.valor;
          if (metric === 'muscle_pct') parsedRecords[recordKey].muscle_pct = attr.valor;
          if (metric === 'water_pct') parsedRecords[recordKey].water_pct = attr.valor;
          if (metric === 'waist_cm') parsedRecords[recordKey].waist_cm = attr.valor;
          if (metric === 'hip_cm') parsedRecords[recordKey].hip_cm = attr.valor;
          if (metric === 'wingspan_cm') parsedRecords[recordKey].wingspan_cm = attr.valor;
        }
      });

      const list: AnthropometricRecord[] = Object.values(parsedRecords);
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistoryRecords(list);
      localStorage.setItem('ud_poveda_anthropometric_history', JSON.stringify(list));
      toast.success(`Descarga completada: ${list.length} registros cargados de la nube.`, { id: toastId });
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
    const toastId = toast.loading('Sincronizando registros antropométricos con la nube...');
    try {
      const { data: dbPlayers, error: dbPlayersError } = await supabase
        .from('players')
        .select('id, nombre, apellidos')
        .eq('estado', 'Fichado');

      if (dbPlayersError) throw dbPlayersError;

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

        // Map all fields
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
          if (m.val !== undefined && m.val > 0) {
            attributePayloads.push({
              player_id: targetId,
              atributo: `Antropo:${record.date}:${m.key}`,
              valor: Number(m.val)
            });
          }
        });
      });

      // Clear existing Antropo keys
      for (const pid of Array.from(playerIdsToClear)) {
        await supabase.from('player_attributes')
          .delete()
          .eq('player_id', pid)
          .like('atributo', 'Antropo:%');
      }

      // Bulk upsert
      if (attributePayloads.length > 0) {
        const { error: upsertErr } = await supabase
          .from('player_attributes')
          .upsert(attributePayloads);

        if (upsertErr) throw upsertErr;
      }

      toast.success(`Éxito: ${historyRecords.length} registros sincronizados con la nube.`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al sincronizar con la nube: ' + (err.message || err), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Form submission
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPlayerId) {
      toast.error('Por favor, selecciona una jugadora válida.');
      return;
    }

    if (!formDate) {
      toast.error('Por favor, introduce la fecha del registro.');
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

    const numWeight = parseVal(weight);
    const numHeight = parseVal(height);
    const numBodyFat = parseVal(bodyFatPct);
    const numMuscle = parseVal(musclePct);
    const numWater = parseVal(waterPct);
    const numWaist = parseVal(waistCm);
    const numHip = parseVal(hipCm);
    const numWingspan = parseVal(wingspanCm);

    if (numWeight === 0 && numHeight === 0) {
      toast.error('Por favor, introduce al menos Peso y Altura para guardar el control.');
      return;
    }

    const recordKey = `${formPlayerId}_${formDate}`;
    const existingIndex = historyRecords.findIndex(r => r.player_id === formPlayerId && r.date === formDate);

    const newRecord: AnthropometricRecord = {
      id: recordKey,
      player_id: formPlayerId,
      player_name: `${selectedPlayer.nombre} ${selectedPlayer.apellidos}`,
      team: selectedTeam,
      date: formDate,
      weight: numWeight,
      height: numHeight,
      body_fat_pct: numBodyFat,
      muscle_pct: numMuscle,
      water_pct: numWater,
      waist_cm: numWaist,
      hip_cm: numHip,
      wingspan_cm: numWingspan,
      notes: formNotes || 'Control de Composición Corporal'
    };

    let updatedHistory = [...historyRecords];
    if (existingIndex > -1) {
      updatedHistory[existingIndex] = newRecord;
      toast.success(`Registro actualizado para ${selectedPlayer.nombre} el día ${formDate}.`);
    } else {
      updatedHistory.unshift(newRecord);
      toast.success(`Control antropométrico de ${selectedPlayer.nombre} guardado correctamente.`);
    }

    updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setHistoryRecords(updatedHistory);
    localStorage.setItem('ud_poveda_anthropometric_history', JSON.stringify(updatedHistory));

    // Reset fields except player & team
    setWeight('');
    setHeight('');
    setBodyFatPct('');
    setMusclePct('');
    setWaterPct('');
    setWaistCm('');
    setHipCm('');
    setWingspanCm('');
    setFormNotes('');
  };

  // Delete control record
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de control antropométrico?')) {
      const updated = historyRecords.filter(r => r.id !== id);
      setHistoryRecords(updated);
      localStorage.setItem('ud_poveda_anthropometric_history', JSON.stringify(updated));
      toast.success('Registro eliminado.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredRecords.map((r, idx) => {
        const heightM = r.height / 100;
        const imc = r.weight && r.height ? (r.weight / (heightM * heightM)).toFixed(1) : '-';
        const icc = r.waist_cm && r.hip_cm ? (r.waist_cm / r.hip_cm).toFixed(2) : '-';
        const fatKg = r.weight && r.body_fat_pct ? ((r.weight * r.body_fat_pct) / 100).toFixed(1) : '-';
        const muscleKg = r.weight && r.muscle_pct ? ((r.weight * r.muscle_pct) / 100).toFixed(1) : '-';

        return {
          'Nº': idx + 1,
          'FECHA': r.date,
          'JUGADORA': r.player_name,
          'EQUIPO': r.team,
          'PESO (kg)': r.weight || '-',
          'ALTURA (cm)': r.height || '-',
          'IMC': imc,
          'GRASA (%)': r.body_fat_pct || '-',
          'MASA GRASA (kg)': fatKg,
          'MUSCULO (%)': r.muscle_pct || '-',
          'MASA MUSCULAR (kg)': muscleKg,
          'AGUA (%)': r.water_pct || '-',
          'CINTURA (cm)': r.waist_cm || '-',
          'CADERA (cm)': r.hip_cm || '-',
          'INDICE CINTURA-CADERA': icc,
          'ENVERGADURA (cm)': r.wingspan_cm || '-',
          'OBSERVACIONES': r.notes || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Composicion Corporal");
      
      XLSX.writeFile(workbook, `controles_antropometricos_poveda.xlsx`);
      toast.success('Historial exportado a Excel con éxito.');
    } catch (err) {
      toast.error('Error al exportar a Excel.');
    }
  };

  // Import from Excel
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

            const newRec: AnthropometricRecord = {
              id: recordKey,
              player_id: matchedPlayer.id,
              player_name: `${matchedPlayer.nombre} ${matchedPlayer.apellidos}`,
              team: matchedPlayer.team || rowTeam || CLUB_TEAMS[0],
              date: rowDate,
              weight: parseNum(row['PESO (kg)'] || row['weight'] || 0),
              height: parseNum(row['ALTURA (cm)'] || row['height'] || 0),
              body_fat_pct: parseNum(row['GRASA (%)'] || row['body_fat_pct'] || 0),
              muscle_pct: parseNum(row['MUSCULO (%)'] || row['muscle_pct'] || 0),
              water_pct: parseNum(row['AGUA (%)'] || row['water_pct'] || 0),
              waist_cm: parseNum(row['CINTURA (cm)'] || row['waist_cm'] || 0),
              hip_cm: parseNum(row['CADERA (cm)'] || row['hip_cm'] || 0),
              wingspan_cm: parseNum(row['ENVERGADURA (cm)'] || row['wingspan_cm'] || 0),
              notes: String(row['OBSERVACIONES'] || 'Importado de Excel')
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
          updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistoryRecords(updatedHistory);
          localStorage.setItem('ud_poveda_anthropometric_history', JSON.stringify(updatedHistory));
          toast.success(`Importados correctamente ${importCount} controles corporales.`);
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

  // Filtered logic
  const filteredRecords = historyRecords.filter(r => {
    if (filterTeam !== 'Todos' && r.team !== filterTeam) return false;
    if (filterPlayerId !== 'Todos' && r.player_id !== filterPlayerId) return false;
    if (filterDate && r.date !== filterDate) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.player_name.toLowerCase().includes(q);
      const matchTeam = r.team.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      if (!matchName && !matchTeam && !matchNotes) return false;
    }

    return true;
  });

  const uniqueDates = Array.from(new Set(historyRecords.map(r => r.date))).sort();
  const filterTeamPlayers = allPlayers.filter(p => filterTeam === 'Todos' || p.team === filterTeam);

  useEffect(() => {
    if (historyRecords.length > 0 && !selectedComparePlayerId) {
      setSelectedComparePlayerId(historyRecords[0].player_id);
    }
  }, [historyRecords]);

  useEffect(() => {
    if (selectedComparePlayerId) {
      const playerRecs = historyRecords
        .filter(r => r.player_id === selectedComparePlayerId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
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

  // Progression charts data
  const getSelectedPlayerChartData = () => {
    if (!selectedComparePlayerId) return [];
    return historyRecords
      .filter(r => r.player_id === selectedComparePlayerId)
      .map(r => {
        const heightM = r.height / 100;
        const imc = r.weight && r.height ? parseFloat((r.weight / (heightM * heightM)).toFixed(1)) : null;
        const icc = r.waist_cm && r.hip_cm ? parseFloat((r.waist_cm / r.hip_cm).toFixed(2)) : null;

        return {
          fecha: r.date,
          'Peso (kg)': r.weight || null,
          'Altura (cm)': r.height || null,
          'Grasa (%)': r.body_fat_pct || null,
          'Músculo (%)': r.muscle_pct || null,
          'Agua (%)': r.water_pct || null,
          'Cintura (cm)': r.waist_cm || null,
          'Cadera (cm)': r.hip_cm || null,
          'IMC (kg/m²)': imc,
          'ICC': icc
        };
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  };

  const chartData = getSelectedPlayerChartData();

  // Evolution comparisons between date A and B
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
      weight: calcDiff(recA.weight, recB.weight, false), // dynamic weight depends on target goals, standard is change tracking
      bodyFat: calcDiff(recA.body_fat_pct, recB.body_fat_pct, true), // less fat percentage is generally improvements
      muscle: calcDiff(recA.muscle_pct, recB.muscle_pct, false), // more muscle percentage is improvement
      waist: calcDiff(recA.waist_cm, recB.waist_cm, true), // less waist circumference is improvement
      wingspan: calcDiff(recA.wingspan_cm, recB.wingspan_cm, false)
    };
  };

  const progressSummary = getProgressSummary();
  const comparePlayer = allPlayers.find(p => p.id === selectedComparePlayerId);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Scale className="w-40 h-40 text-white" />
        </div>
        
        <div className="space-y-1 z-10 text-left">
          <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase block">MÓDULO DE SEGUIMIENTO</span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Antropometría y Composición Corporal</h2>
          <p className="text-xs text-slate-400 font-bold uppercase">U.D. LA POVEDA • EVOLUCIÓN FÍSICA Y BIOMÉTRICA DE INICIO Y TEMPORADA</p>
        </div>

        <div className="flex flex-wrap gap-2.5 z-10 w-full md:w-auto">
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
              <span>Nuevo Control</span>
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
              <span>Evolución y Gráficas</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: ANTHROPOMETRIC FORM */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form */}
          <div className="lg:col-span-2 bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-6 text-left">
            <div className="border-b border-slate-900 pb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-500" />
                <span>Formulario de Control Antropométrico</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 uppercase font-bold">Introduce los datos de composición corporal del jugador</p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* Selectors */}
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
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">2. Seleccionar Jugador</label>
                  <select
                    value={formPlayerId}
                    onChange={(e) => setFormPlayerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-bold uppercase"
                  >
                    {players.length === 0 ? (
                      <option value="">No hay jugadores de alta</option>
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
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">3. Fecha del Control</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 space-y-4">
                <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider block border-b border-slate-900 pb-2">
                  4. Composición Corporal y Mediciones
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Weight */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-sky-400" />
                      <span>Peso Corporal (kg)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 74.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Height */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <span>Altura (cm)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 178"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Body Fat % */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-red-500" />
                      <span>% Grasa Corporal</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 11.2"
                      value={bodyFatPct}
                      onChange={(e) => setBodyFatPct(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Muscle % */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>% Masa Muscular</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 44.8"
                      value={musclePct}
                      onChange={(e) => setMusclePct(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Water % */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-blue-400" />
                      <span>% Agua Corporal</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 61.5"
                      value={waterPct}
                      onChange={(e) => setWaterPct(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Wingspan */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-yellow-500" />
                      <span>Envergadura (cm)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 182"
                      value={wingspanCm}
                      onChange={(e) => setWingspanCm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Waist Circumference */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span>Perímetro Cintura (cm)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 76.5"
                      value={waistCm}
                      onChange={(e) => setWaistCm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  {/* Hip Circumference */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span>Perímetro Cadera (cm)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 92.0"
                      value={hipCm}
                      onChange={(e) => setHipCm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs font-mono font-bold text-white p-3 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">5. Observaciones, Nutrición o Incidencias</label>
                <textarea
                  placeholder="Detalles (Ej. 'Ayuno', 'Post-entrenamiento', 'Objetivo: Reducir grasa e incrementar masa limpia')"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-amber-500 text-xs text-white p-3 rounded-xl focus:outline-none min-h-[80px]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setWeight('');
                    setHeight('');
                    setBodyFatPct('');
                    setMusclePct('');
                    setWaterPct('');
                    setWaistCm('');
                    setHipCm('');
                    setWingspanCm('');
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
                  <span>Guardar Control</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 text-left">
            <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-3">
                <Info className="w-4 h-4 text-amber-500" />
                <span>¿Por qué estos controles?</span>
              </h4>

              <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
                <div>
                  <p className="font-bold text-slate-200 uppercase text-[10px]">⚖️ Evolución de Composición</p>
                  <p className="mt-1">El peso absoluto no lo es todo; vigilar la masa muscular y el % de grasa permite afinar el rendimiento, prevenir cargas lesivas y ajustar planes nutricionales.</p>
                </div>
                <div>
                  <p className="font-bold text-slate-200 uppercase text-[10px]">📏 Mediciones de Control</p>
                  <p className="mt-1">El Índice Cintura-Cadera es un predictor de salud y estabilidad de core. La envergadura es ideal para extremos, porteras y duelos aéreos.</p>
                </div>
                <div>
                  <p className="font-bold text-slate-200 uppercase text-[10px]">📊 IMC e Índices Automáticos</p>
                  <p className="mt-1">La aplicación calculará automáticamente el IMC y el índice cintura-cadera para agilizar el diagnóstico rápido del cuerpo técnico.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider border-b border-slate-900 pb-3">
                Resumen de Controles
              </h4>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-850/50">
                  <span className="text-[9px] text-slate-500 font-black uppercase">Fichas Registradas</span>
                  <div className="text-xl font-black text-white mt-1">{historyRecords.length}</div>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-850/50">
                  <span className="text-[9px] text-slate-500 font-black uppercase">Jugadores Controlados</span>
                  <div className="text-xl font-black text-amber-500 mt-1">
                    {Array.from(new Set(historyRecords.map(r => r.player_id))).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: HISTORY & CHARTS & COMPARISONS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* Filters */}
          <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>Buscador y Filtros de Composición Corporal</span>
              </h4>
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                  id="excel-import-antropo"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('excel-import-antropo')?.click()}
                  className="text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border border-slate-850 text-slate-400 hover:text-white transition-all"
                >
                  Importar Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 transition-all"
                >
                  Exportar Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Team */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtrar por Equipo</label>
                <select
                  value={filterTeam}
                  onChange={(e) => {
                    setFilterTeam(e.target.value);
                    setFilterPlayerId('Todos');
                  }}
                  className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Todos">TODOS LOS EQUIPOS</option>
                  {CLUB_TEAMS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Player */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Filtrar por Jugador</label>
                <select
                  value={filterPlayerId}
                  onChange={(e) => setFilterPlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="Todos">TODOS LOS JUGADORES</option>
                  {filterTeamPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.dorsal} • {p.nombre} {p.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
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

              {/* Quick Search */}
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

          {/* Grid Table & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            
            {/* Table */}
            <div className="lg:col-span-7 bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                  Listado de Registros Antropométricos ({filteredRecords.length})
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-900 rounded-2xl bg-slate-950/40">
                <table className="w-full border-collapse text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-900 font-black text-slate-400 uppercase text-[9px] border-b border-slate-850 tracking-wider">
                      <th className="p-3">FECHA</th>
                      <th className="p-3">JUGADOR</th>
                      <th className="p-3 text-center text-sky-400">PESO (kg)</th>
                      <th className="p-3 text-center text-amber-500">ALTURA (cm)</th>
                      <th className="p-3 text-center text-red-400">GRASA (%)</th>
                      <th className="p-3 text-center text-emerald-400">MÚSC. (%)</th>
                      <th className="p-3 text-center text-purple-400">IMC</th>
                      <th className="p-3 text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 font-semibold">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 uppercase font-bold">
                          No hay registros que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        const heightM = r.height / 100;
                        const imc = r.weight && r.height ? (r.weight / (heightM * heightM)).toFixed(1) : '-';

                        return (
                          <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{r.date}</td>
                            <td className="p-3">
                              <div className="font-bold text-white">{r.player_name}</div>
                              <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{r.team}</div>
                            </td>
                            <td className="p-3 text-center font-mono text-sky-400">{r.weight || '-'}</td>
                            <td className="p-3 text-center font-mono text-amber-400">{r.height || '-'}</td>
                            <td className="p-3 text-center font-mono text-red-400">{r.body_fat_pct ? `${r.body_fat_pct}%` : '-'}</td>
                            <td className="p-3 text-center font-mono text-emerald-400">{r.muscle_pct ? `${r.muscle_pct}%` : '-'}</td>
                            <td className="p-3 text-center font-mono text-purple-400">
                              <span className="px-1.5 py-0.5 rounded bg-purple-950/20 text-purple-400 border border-purple-500/10 text-[10px]">
                                {imc}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteRecord(r.id)}
                                className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts & Interactive Progression (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Progression chart block */}
              <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                      Gráfica de Evolución
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Visualiza progresos temporales</p>
                  </div>

                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as any)}
                    className="bg-slate-900 border border-slate-850 text-[10px] text-amber-500 font-bold uppercase px-2 py-1 rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="weight">PESO E IMC</option>
                    <option value="composition">COMPOSICIÓN (% GRASA/MÚSCULO)</option>
                    <option value="measurements">CINTURA Y CADERA</option>
                  </select>
                </div>

                {/* Target compare player selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Jugador Analizado</label>
                  <select
                    value={selectedComparePlayerId}
                    onChange={(e) => setSelectedComparePlayerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {Array.from(new Set(historyRecords.map(r => r.player_id))).map(pid => {
                      const recObj = historyRecords.find(r => r.player_id === pid);
                      return (
                        <option key={pid} value={pid}>
                          {recObj?.player_name || 'Desconocida'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-500 uppercase font-bold">
                    No hay suficientes datos de progresión.
                  </div>
                ) : (
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="fecha" stroke="#64748b" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        
                        {chartMetric === 'weight' && (
                          <>
                            <Line type="monotone" dataKey="Peso (kg)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="IMC (kg/m²)" stroke="#c084fc" strokeWidth={2} dot={{ r: 4 }} />
                          </>
                        )}

                        {chartMetric === 'composition' && (
                          <>
                            <Line type="monotone" dataKey="Grasa (%)" stroke="#f87171" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Músculo (%)" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} />
                          </>
                        )}

                        {chartMetric === 'measurements' && (
                          <>
                            <Line type="monotone" dataKey="Cintura (cm)" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="Cadera (cm)" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Comparative Module between dates */}
              <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-900 pb-3">
                  <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                    <span>Comparativa entre Fechas</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Estudia la evolución de un control a otro</p>
                </div>

                {selectedComparePlayerId ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase">Control Inicial (A)</label>
                        <select
                          value={compareDateA}
                          onChange={(e) => setCompareDateA(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 text-xs text-white p-2 rounded-xl focus:outline-none"
                        >
                          {historyRecords
                            .filter(r => r.player_id === selectedComparePlayerId)
                            .map(r => (
                              <option key={r.date} value={r.date}>{r.date}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase">Control Posterior (B)</label>
                        <select
                          value={compareDateB}
                          onChange={(e) => setCompareDateB(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 text-xs text-white p-2 rounded-xl focus:outline-none"
                        >
                          <option value="">Seleccionar...</option>
                          {historyRecords
                            .filter(r => r.player_id === selectedComparePlayerId)
                            .map(r => (
                              <option key={r.date} value={r.date}>{r.date}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    {progressSummary ? (
                      <div className="space-y-2.5 pt-2">
                        {/* Weight comparison */}
                        {progressSummary.weight && (
                          <div className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-xl border border-slate-850 text-xs">
                            <span className="font-bold text-slate-300">Peso Corporal</span>
                            <div className="text-right">
                              <span className="font-mono text-slate-400">{progressSummary.weight.valA}kg → {progressSummary.weight.valB}kg</span>
                              <span className={cn(
                                "ml-2 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]",
                                parseFloat(progressSummary.weight.absDiff) > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-400"
                              )}>
                                {parseFloat(progressSummary.weight.absDiff) > 0 ? '+' : ''}{progressSummary.weight.absDiff} kg ({progressSummary.weight.pctDiff}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Body Fat % comparison */}
                        {progressSummary.bodyFat && (
                          <div className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-xl border border-slate-850 text-xs">
                            <span className="font-bold text-slate-300">% Grasa Corporal</span>
                            <div className="text-right">
                              <span className="font-mono text-slate-400">{progressSummary.bodyFat.valA}% → {progressSummary.bodyFat.valB}%</span>
                              <span className={cn(
                                "ml-2 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]",
                                progressSummary.bodyFat.isImprovement ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {parseFloat(progressSummary.bodyFat.absDiff) > 0 ? '+' : ''}{progressSummary.bodyFat.absDiff}% ({progressSummary.bodyFat.pctDiff}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Muscle % comparison */}
                        {progressSummary.muscle && (
                          <div className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-xl border border-slate-850 text-xs">
                            <span className="font-bold text-slate-300">% Masa Muscular</span>
                            <div className="text-right">
                              <span className="font-mono text-slate-400">{progressSummary.muscle.valA}% → {progressSummary.muscle.valB}%</span>
                              <span className={cn(
                                "ml-2 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]",
                                progressSummary.muscle.isImprovement ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {parseFloat(progressSummary.muscle.absDiff) > 0 ? '+' : ''}{progressSummary.muscle.absDiff}% ({progressSummary.muscle.pctDiff}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Waist comparison */}
                        {progressSummary.waist && (
                          <div className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-xl border border-slate-850 text-xs">
                            <span className="font-bold text-slate-300">Cintura (cm)</span>
                            <div className="text-right">
                              <span className="font-mono text-slate-400">{progressSummary.waist.valA}cm → {progressSummary.waist.valB}cm</span>
                              <span className={cn(
                                "ml-2 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]",
                                progressSummary.waist.isImprovement ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {parseFloat(progressSummary.waist.absDiff) > 0 ? '+' : ''}{progressSummary.waist.absDiff} cm ({progressSummary.waist.pctDiff}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-900/30 rounded-xl text-center text-xs text-slate-500 uppercase font-bold border border-dashed border-slate-800">
                        Selecciona dos fechas válidas para calcular el progreso.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-500 uppercase font-bold py-4">
                    Selecciona un jugador arriba.
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}

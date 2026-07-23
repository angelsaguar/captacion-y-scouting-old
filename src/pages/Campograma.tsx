import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Settings, 
  Trash2, 
  Upload, 
  Shuffle, 
  Bookmark, 
  BookOpen, 
  Download, 
  Award, 
  ArrowRightLeft, 
  HelpCircle, 
  Plus, 
  Copy, 
  Check, 
  Undo,
  Clipboard,
  FileText,
  HelpCircle as QuestionIcon,
  Cloud,
  CloudLightning,
  CloudOff,
  Database,
  Pencil,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// Constants for teams as specified by the user
const TEAMS_F11 = [
  'SENIOR MASCULINO',
  'SENIOR FEMENINO',
  'JUVENIL A',
  'JUVENIL B',
  'CADETE A',
  'CADETE B',
  'INFANTIL A',
  'INFANTIL B',
  'INFANTIL C',
  'ALEVIN A F11'
];

const TEAMS_F7 = [
  'ALEVIN A F7',
  'ALEVIN B F7',
  'BENJAMIN A',
  'BENJAMIN B',
  'BENJAMIN C',
  'PRE BENJAMIN A',
  'PREBENJAMIN B'
];

// Combine all teams for general operations
const ALL_TEAMS = [...TEAMS_F11, ...TEAMS_F7];

export interface PlayerRoster {
  id: string;
  nombre: string;
  dorsal?: string | number;
  posicionOriginal?: string;
}

export interface TacticalPosition {
  id: string;
  label: string;
  shortLabel: string;
  x: number; // Percentage from left (0 to 100)
  y: number; // Percentage from top (0 to 100)
}

// Tactical systems definitions
const SYSTEMS_F11: Record<string, TacticalPosition[]> = {
  '1-4-3-3': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'LI', label: 'Lateral Izquierdo', shortLabel: 'LI', x: 15, y: 70 },
    { id: 'DFC1', label: 'Central Izquierdo', shortLabel: 'CTI', x: 38, y: 75 },
    { id: 'DFC2', label: 'Central Derecho', shortLabel: 'CTD', x: 62, y: 75 },
    { id: 'LD', label: 'Lateral Derecho', shortLabel: 'LD', x: 85, y: 70 },
    { id: 'MCD', label: 'Pivote Defensivo', shortLabel: 'MCD', x: 50, y: 56 },
    { id: 'MC1', label: 'Interior Izquierdo', shortLabel: 'MCI', x: 28, y: 44 },
    { id: 'MC2', label: 'Interior Derecho', shortLabel: 'MCD', x: 72, y: 44 },
    { id: 'EI', label: 'Extremo Izquierdo', shortLabel: 'EI', x: 18, y: 22 },
    { id: 'ED', label: 'Extremo Derecho', shortLabel: 'ED', x: 82, y: 22 },
    { id: 'DC', label: 'Delantero Centro', shortLabel: 'DC', x: 50, y: 15 }
  ],
  '1-4-4-2': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'LI', label: 'Lateral Izquierdo', shortLabel: 'LI', x: 15, y: 70 },
    { id: 'DFC1', label: 'Central Izquierdo', shortLabel: 'CTI', x: 38, y: 75 },
    { id: 'DFC2', label: 'Central Derecho', shortLabel: 'CTD', x: 62, y: 75 },
    { id: 'LD', label: 'Lateral Derecho', shortLabel: 'LD', x: 85, y: 70 },
    { id: 'MCI', label: 'Medio Izquierdo', shortLabel: 'MI', x: 18, y: 48 },
    { id: 'MC1', label: 'Medio Centro 1', shortLabel: 'MC1', x: 38, y: 52 },
    { id: 'MC2', label: 'Medio Centro 2', shortLabel: 'MC2', x: 62, y: 52 },
    { id: 'MCD', label: 'Medio Derecho', shortLabel: 'MD', x: 82, y: 48 },
    { id: 'DC1', label: 'Delantero Centro Izquierdo', shortLabel: 'DC1', x: 33, y: 20 },
    { id: 'DC2', label: 'Delantero Centro Derecho', shortLabel: 'DC2', x: 67, y: 20 }
  ],
  '1-3-5-2': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'DFC_I', label: 'Central Izquierdo', shortLabel: 'DFC I', x: 25, y: 74 },
    { id: 'DFC_C', label: 'Líbero / Central', shortLabel: 'LIB', x: 50, y: 78 },
    { id: 'DFC_D', label: 'Central Derecho', shortLabel: 'DFC D', x: 75, y: 74 },
    { id: 'CAR_I', label: 'Carrilero Izquierdo', shortLabel: 'CRI', x: 12, y: 50 },
    { id: 'MCD', label: 'Pivote', shortLabel: 'MCV', x: 50, y: 58 },
    { id: 'MC1', label: 'Interior Izquierdo', shortLabel: 'MCI', x: 33, y: 43 },
    { id: 'MC2', label: 'Interior Derecho', shortLabel: 'MCD', x: 67, y: 43 },
    { id: 'CAR_D', label: 'Carrilero Derecho', shortLabel: 'CRD', x: 88, y: 50 },
    { id: 'DC1', label: 'Delantero Izquierdo', shortLabel: 'DC1', x: 33, y: 20 },
    { id: 'DC2', label: 'Delantero Derecho', shortLabel: 'DC2', x: 67, y: 20 }
  ],
  '1-5-3-2': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'CAR_I', label: 'Lateral Carrilero Izquierdo', shortLabel: 'LCI', x: 12, y: 64 },
    { id: 'DFC_I', label: 'Central Izquierdo', shortLabel: 'CTI', x: 32, y: 74 },
    { id: 'DFC_C', label: 'Líbero / Central', shortLabel: 'LIB', x: 50, y: 78 },
    { id: 'DFC_D', label: 'Central Derecho', shortLabel: 'CTD', x: 68, y: 74 },
    { id: 'CAR_D', label: 'Lateral Carrilero Derecho', shortLabel: 'LCD', x: 88, y: 64 },
    { id: 'MC1', label: 'Interior Izquierdo', shortLabel: 'MCI', x: 28, y: 45 },
    { id: 'MCD', label: 'Pivote / MCD', shortLabel: 'MCD', x: 50, y: 52 },
    { id: 'MC2', label: 'Interior Derecho', shortLabel: 'MCD', x: 72, y: 45 },
    { id: 'DC1', label: 'Delantero Izquierdo', shortLabel: 'DC1', x: 35, y: 18 },
    { id: 'DC2', label: 'Delantero Derecho', shortLabel: 'DC2', x: 65, y: 18 }
  ]
};

const SYSTEMS_F7: Record<string, TacticalPosition[]> = {
  '1-3-2-1': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'LI', label: 'Lateral Izquierdo', shortLabel: 'LI', x: 22, y: 68 },
    { id: 'DFC', label: 'Cierre', shortLabel: 'CIE', x: 50, y: 72 },
    { id: 'LD', label: 'Lateral Derecho', shortLabel: 'LD', x: 78, y: 68 },
    { id: 'MC1', label: 'Medio Izquierdo', shortLabel: 'MCI', x: 32, y: 44 },
    { id: 'MC2', label: 'Medio Derecho', shortLabel: 'MCD', x: 68, y: 44 },
    { id: 'DC', label: 'Delantero', shortLabel: 'DEL', x: 50, y: 18 }
  ],
  '1-3-1-2': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'LI', label: 'Lateral Izquierdo', shortLabel: 'LI', x: 22, y: 68 },
    { id: 'DFC', label: 'Cierre', shortLabel: 'CIE', x: 50, y: 72 },
    { id: 'LD', label: 'Lateral Derecho', shortLabel: 'LD', x: 78, y: 68 },
    { id: 'MC', label: 'Medio Centro', shortLabel: 'MED', x: 50, y: 45 },
    { id: 'DC1', label: 'Delantero Izquierdo', shortLabel: 'DL1', x: 33, y: 20 },
    { id: 'DC2', label: 'Delantero Derecho', shortLabel: 'DL2', x: 67, y: 20 }
  ],
  '1-2-3-1': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'DFC1', label: 'Cierre Izquierdo', shortLabel: 'CI', x: 32, y: 70 },
    { id: 'DFC2', label: 'Cierre Derecho', shortLabel: 'CD', x: 68, y: 70 },
    { id: 'MI', label: 'Interior Izquierdo', shortLabel: 'II', x: 18, y: 44 },
    { id: 'MC', label: 'Medio Centro', shortLabel: 'MED', x: 50, y: 48 },
    { id: 'MD', label: 'Interior Derecho', shortLabel: 'ID', x: 82, y: 44 },
    { id: 'DC', label: 'Delantero', shortLabel: 'DEL', x: 50, y: 18 }
  ],
  '1-2-2-2': [
    { id: 'GK', label: 'Portero', shortLabel: 'POR', x: 50, y: 88 },
    { id: 'DFC1', label: 'Cierre Izquierdo', shortLabel: 'CI', x: 32, y: 70 },
    { id: 'DFC2', label: 'Cierre Derecho', shortLabel: 'CD', x: 68, y: 70 },
    { id: 'MC1', label: 'Medio Centro Izquierdo', shortLabel: 'MI', x: 32, y: 45 },
    { id: 'MC2', label: 'Medio Centro Derecho', shortLabel: 'MD', x: 68, y: 45 },
    { id: 'DC1', label: 'Delantero Izquierdo', shortLabel: 'DL1', x: 32, y: 20 },
    { id: 'DC2', label: 'Delantero Derecho', shortLabel: 'DL2', x: 68, y: 20 }
  ]
};

// Default backups and sample player names (UD La Poveda theme)
const SAMPLE_PLAYERS: Record<string, PlayerRoster[]> = {
  F11: [
    { id: 'p1', nombre: 'Gonzalo Robles', dorsal: 1, posicionOriginal: 'Portero' },
    { id: 'p2', nombre: 'Sergio Marcos', dorsal: 4, posicionOriginal: 'Central' },
    { id: 'p3', nombre: 'Diego López', dorsal: 3, posicionOriginal: 'Lateral Izquierdo' },
    { id: 'p4', nombre: 'Álvaro Martín', dorsal: 2, posicionOriginal: 'Lateral Derecho' },
    { id: 'p5', nombre: 'Carlos Sanz', dorsal: 5, posicionOriginal: 'Central' },
    { id: 'p6', nombre: 'Manuel Guerrero', dorsal: 6, posicionOriginal: 'Pivote' },
    { id: 'p7', nombre: 'Iván Gómez', dorsal: 8, posicionOriginal: 'Interior' },
    { id: 'p8', nombre: 'Jaime Ruiz', dorsal: 10, posicionOriginal: 'Interior' },
    { id: 'p9', nombre: 'Mateo Fernández', dorsal: 11, posicionOriginal: 'Extremo Izquierdo' },
    { id: 'p10', nombre: 'Hugo Ortega', dorsal: 7, posicionOriginal: 'Extremo Derecho' },
    { id: 'p11', nombre: 'Alejandro Ramos', dorsal: 9, posicionOriginal: 'Delantero' },
    { id: 'p12', nombre: 'Roberto Torres', dorsal: 13, posicionOriginal: 'Portero' },
    { id: 'p13', nombre: 'Sandro Poveda', dorsal: 14, posicionOriginal: 'Defensa' },
    { id: 'p14', nombre: 'Marcos Alonso', dorsal: 15, posicionOriginal: 'Centrocampista' },
    { id: 'p15', nombre: 'Víctor Soler', dorsal: 16, posicionOriginal: 'Delantero' }
  ],
  F7: [
    { id: 'f7-1', nombre: 'Lucas Garrido', dorsal: 1, posicionOriginal: 'Portero' },
    { id: 'f7-2', nombre: 'Eric Blanco', dorsal: 3, posicionOriginal: 'Cierre' },
    { id: 'f7-3', nombre: 'Gael Morán', dorsal: 2, posicionOriginal: 'Lateral' },
    { id: 'f7-4', nombre: 'Leo Pastor', dorsal: 4, posicionOriginal: 'Lateral' },
    { id: 'f7-5', nombre: 'Unai Crespo', dorsal: 6, posicionOriginal: 'Medio' },
    { id: 'f7-6', nombre: 'Nico Navarro', dorsal: 8, posicionOriginal: 'Medio' },
    { id: 'f7-7', nombre: 'Iker Salgado', dorsal: 9, posicionOriginal: 'Delantero' },
    { id: 'f7-8', nombre: 'Joel Méndez', dorsal: 13, posicionOriginal: 'Portero' },
    { id: 'f7-9', nombre: 'Álex Delgado', dorsal: 7, posicionOriginal: 'Extremo' }
  ]
};

export default function Campograma() {
  const { user } = useAuthStore();
  const isAdminOrScout = user?.role === 'admin' || user?.role === 'scout';

  // Helper to format/retrieve display dorsal safely (recovers from duplicate name columns in legacy or malformed imports)
  const getDisplayDorsal = (p?: PlayerRoster) => {
    if (!p || !p.dorsal) return '';
    const cleanD = String(p.dorsal).trim();
    if (!cleanD) return '';
    if (cleanD.toLowerCase() === p.nombre.toLowerCase() || cleanD.length > 5) {
      return '';
    }
    return cleanD;
  };

  // Helper to format/retrieve display name containing only first name and first last name, to keep it compact on the pitch
  const formatCompactName = (fullName: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');

    const first = parts[0];
    const second = parts[1];
    const third = parts[2] || '';
    const fourth = parts[3] || '';

    const particles = ['de', 'del', 'la', 'las', 'los', 'da', 'do', 'y'];
    const compoundSeconds = [
      'carlos', 'antonio', 'manuel', 'luis', 'jose', 'josé', 'maría', 'maria', 
      'miguel', 'angel', 'ángel', 'javier', 'david', 'alberto', 'francisco', 
      'ramon', 'ramón', 'jesus', 'jesús', 'ignacio', 'fernando', 'alejandro'
    ];

    // Case 1: First name is compound, e.g. "Juan Carlos García Pérez" (length >= 3)
    if (compoundSeconds.includes(second.toLowerCase()) && !particles.includes(second.toLowerCase())) {
      if (third && particles.includes(third.toLowerCase())) {
        if (fourth && particles.includes(fourth.toLowerCase()) && parts[4]) {
          return `${first} ${second} ${third} ${fourth} ${parts[4]}`;
        }
        if (fourth) {
          return `${first} ${second} ${third} ${fourth}`;
        }
      }
      return `${first} ${second} ${third}`;
    }

    // Case 2: Particles in the first surname, e.g. "Juan de la Rosa"
    if (particles.includes(second.toLowerCase())) {
      if (third && particles.includes(third.toLowerCase()) && fourth) {
        return `${first} ${second} ${third} ${fourth}`;
      }
      return `${first} ${second} ${third}`;
    }

    // Case 3: Standard 3+ words like "Alejandro Ramos Fernández" -> "Alejandro Ramos"
    return `${first} ${second}`;
  };

  // Selected state
  const [selectedSeason, setSelectedSeason] = useState<string>(() => {
    return localStorage.getItem('ud_lapoveda_tactics_selected_season_v1') || '25/26';
  });
  const [selectedTeam, setSelectedTeam] = useState<string>('SENIOR MASCULINO');
  const [selectedFormation, setSelectedFormation] = useState<string>('1-4-3-3');

  // Roster lists for each team (mapped by teamName)
  const [rosters, setRosters] = useState<Record<string, PlayerRoster[]>>({});

  // Tactical arrangements for each team (mapped by teamName)
  // Inside, it holds a record of: { [positionId]: playerRosterId[] }
  const [lineups, setLineups] = useState<Record<string, Record<string, string[]>>>({});

  // Active slot being customized (modal / select picker anchor)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  // Manual player form
  const [customName, setCustomName] = useState('');
  const [customDorsal, setCustomDorsal] = useState('');
  const [customPos, setCustomPos] = useState('');

  // Editing player states
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDorsal, setEditDorsal] = useState('');
  const [editPos, setEditPos] = useState('');

  // Bulk paste text state
  const [bulkText, setBulkText] = useState('');

  // Active tab state in the right side roster box
  const [activeRosterTab, setActiveRosterTab] = useState<'roster' | 'bulk' | 'manual'>('roster');

  const isF11Mode = TEAMS_F11.includes(selectedTeam);
  const currentSystems = isF11Mode ? SYSTEMS_F11 : SYSTEMS_F7;
  const currentPositions = currentSystems[selectedFormation] || [];

  // Load from local storage on mount or when season changes
  useEffect(() => {
    const savedRosters = localStorage.getItem(`ud_lapoveda_tactics_rosters_v1_${selectedSeason}`);
    const savedLineups = localStorage.getItem(`ud_lapoveda_tactics_lineups_v1_${selectedSeason}`);
    const savedFormations = localStorage.getItem(`ud_lapoveda_tactics_formations_v1_${selectedSeason}`);

    if (savedRosters) {
      try { 
        setRosters(JSON.parse(savedRosters)); 
      } catch (e) { 
        console.error(e); 
      }
    } else {
      // Setup initial empty lists with fallback
      const initial: Record<string, PlayerRoster[]> = {};
      ALL_TEAMS.forEach(team => {
        const isTeamF11 = TEAMS_F11.includes(team);
        initial[team] = isTeamF11 ? [...SAMPLE_PLAYERS.F11] : [...SAMPLE_PLAYERS.F7];
      });
      setRosters(initial);
      localStorage.setItem(`ud_lapoveda_tactics_rosters_v1_${selectedSeason}`, JSON.stringify(initial));
    }

    if (savedLineups) {
      try { 
        const parsed = JSON.parse(savedLineups);
        // Normalize legacy string values to arrays of player IDs for full backward compatibility
        const normalized: Record<string, Record<string, string[]>> = {};
        Object.keys(parsed).forEach(teamKey => {
          normalized[teamKey] = {};
          const teamLineup = parsed[teamKey];
          if (teamLineup && typeof teamLineup === 'object') {
            Object.keys(teamLineup).forEach(posKey => {
              const val = teamLineup[posKey];
              if (Array.isArray(val)) {
                normalized[teamKey][posKey] = val.filter(item => typeof item === 'string');
              } else if (typeof val === 'string' && val) {
                normalized[teamKey][posKey] = [val];
              } else {
                normalized[teamKey][posKey] = [];
              }
            });
          }
        });
        setLineups(normalized);
      } catch (e) { 
        setLineups({});
        console.error(e); 
      }
    } else {
      setLineups({});
    }

    if (savedFormations) {
      try {
        const parsed = JSON.parse(savedFormations);
        if (parsed[selectedTeam]) {
          setSelectedFormation(parsed[selectedTeam]);
        } else {
          const isF11 = TEAMS_F11.includes(selectedTeam);
          const availableFormations = Object.keys(isF11 ? SYSTEMS_F11 : SYSTEMS_F7);
          setSelectedFormation(availableFormations[0]);
        }
      } catch (e) { 
        console.error(e); 
      }
    } else {
      const isF11 = TEAMS_F11.includes(selectedTeam);
      const availableFormations = Object.keys(isF11 ? SYSTEMS_F11 : SYSTEMS_F7);
      setSelectedFormation(availableFormations[0]);
    }
  }, [selectedSeason]);

  // Supabase states for cloud persistence
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(true);
  const [isSavingSupabase, setIsSavingSupabase] = useState(false);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);

  // Load tactics from Supabase to local state
  const loadTacticsFromSupabase = async (silent = false) => {
    setIsLoadingSupabase(true);
    setSupabaseErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('tactics')
        .select('*')
        .eq('season', selectedSeason)
        .eq('team', selectedTeam)
        .maybeSingle();

      if (error) {
        console.error("Supabase load error:", error);
        setSupabaseErrorMsg(`Error de carga: ${error.message} (${error.code || ''})`);
        if (!silent) {
          toast.error('Error al conectar con Supabase. Revisa si has creado la tabla o si tu conexión es correcta.');
        }
        return;
      }

      if (data) {
        // Update local state with cloud data
        setRosters(prev => {
          const updated = { ...prev, [selectedTeam]: data.roster || [] };
          localStorage.setItem(`ud_lapoveda_tactics_rosters_v1_${selectedSeason}`, JSON.stringify(updated));
          return updated;
        });

        setLineups(prev => {
          const updated = { ...prev, [selectedTeam]: data.lineup || {} };
          localStorage.setItem(`ud_lapoveda_tactics_lineups_v1_${selectedSeason}`, JSON.stringify(updated));
          return updated;
        });

        setSelectedFormation(data.formation || '1-4-3-3');
        
        // Save formation in localstorage preferred formations
        const savedFormations = localStorage.getItem(`ud_lapoveda_tactics_formations_v1_${selectedSeason}`);
        let parsed: Record<string, string> = {};
        if (savedFormations) {
          try { parsed = JSON.parse(savedFormations); } catch {}
        }
        parsed[selectedTeam] = data.formation || '1-4-3-3';
        localStorage.setItem(`ud_lapoveda_tactics_formations_v1_${selectedSeason}`, JSON.stringify(parsed));

        setIsSupabaseSynced(true);
        setSupabaseErrorMsg(null);
        if (!silent) {
          toast.success('¡Alineación y plantilla cargadas con éxito desde Supabase!');
        }
      } else {
        if (!silent) {
          toast.info('No se encontraron alineaciones en la nube para este equipo, usando datos locales.');
        }
      }
    } catch (err: any) {
      console.error("Catch in loading:", err);
      setSupabaseErrorMsg(err?.message || 'Error de conexión');
      if (!silent) {
        toast.error('No se pudo establecer conexión con tu Supabase para cargar.');
      }
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  const saveTacticsToSupabase = async () => {
    setIsSavingSupabase(true);
    setSupabaseErrorMsg(null);
    try {
      const { error } = await supabase
        .from('tactics')
        .upsert(
          {
            season: selectedSeason,
            team: selectedTeam,
            roster: rosters[selectedTeam] || [],
            lineup: lineups[selectedTeam] || {},
            formation: selectedFormation,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null
          },
          { onConflict: 'season,team' }
        );

      let actualError = error;

      if (actualError && actualError.code === '23503') {
        console.warn("Detected foreign key violation for updated_by. Retrying upsert without updated_by field...");
        const { error: retryError } = await supabase
          .from('tactics')
          .upsert(
            {
              season: selectedSeason,
              team: selectedTeam,
              roster: rosters[selectedTeam] || [],
              lineup: lineups[selectedTeam] || {},
              formation: selectedFormation,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'season,team' }
          );
        actualError = retryError;
      }

      if (actualError) {
        console.error("Supabase upsert error:", actualError);
        let errorMsgTxt = actualError.message || 'Error desconocido';
        if (actualError.code === '42P01') {
          errorMsgTxt = 'La tabla "tactics" no existe en Supabase. Por favor ejecute la SQL.';
          toast.error(
            'La tabla "tactics" no existe en Supabase. Ejecuta el archivo "supabase_schema.sql" en tu consola.',
            { duration: 8000 }
          );
        } else if (actualError.code === '42501') {
          errorMsgTxt = 'RLS denegado. Revisa tus políticas de Supabase.';
          toast.error('Permiso denegado por políticas RLS. Asegúrate de estar autenticado o de configurar políticas públicas.');
        } else {
          toast.error(`Error al guardar en Supabase: ${actualError.message}`);
        }
        setSupabaseErrorMsg(errorMsgTxt);
        return;
      }

      setIsSupabaseSynced(true);
      setSupabaseErrorMsg(null);
      toast.success('¡Alineación y plantilla guardadas correctamente en Supabase!');
    } catch (err: any) {
      console.error("Catch in saving:", err);
      setSupabaseErrorMsg(err?.message || 'Error de conexión');
      toast.error('No se pudo establecer conexión con tu Supabase para guardar.');
    } finally {
      setIsSavingSupabase(false);
    }
  };

  // Synchronize on team or season change automatically
  useEffect(() => {
    loadTacticsFromSupabase(true);
  }, [selectedTeam, selectedSeason]);

  // Sync state changes to localStorage
  const saveRostersToStorage = (updated: Record<string, PlayerRoster[]>) => {
    setRosters(updated);
    setIsSupabaseSynced(false);
    localStorage.setItem(`ud_lapoveda_tactics_rosters_v1_${selectedSeason}`, JSON.stringify(updated));
  };

  const saveLineupsToStorage = (updated: Record<string, Record<string, string[]>>) => {
    setLineups(updated);
    setIsSupabaseSynced(false);
    localStorage.setItem(`ud_lapoveda_tactics_lineups_v1_${selectedSeason}`, JSON.stringify(updated));
  };

  // When team changes, adapt active formation to first available
  const handleTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
    const isF11 = TEAMS_F11.includes(teamName);
    const availableFormations = Object.keys(isF11 ? SYSTEMS_F11 : SYSTEMS_F7);
    
    // Check if team has a saved preferred formation
    const savedFormations = localStorage.getItem(`ud_lapoveda_tactics_formations_v1_${selectedSeason}`);
    let targetFormation = availableFormations[0];
    if (savedFormations) {
      try {
        const parsed = JSON.parse(savedFormations);
        if (parsed[teamName]) {
          targetFormation = parsed[teamName];
        }
      } catch (e) { console.error(e); }
    }
    
    setSelectedFormation(targetFormation);
    setActiveSlotId(null);
  };

  const handleFormationChange = (formation: string) => {
    setSelectedFormation(formation);
    setIsSupabaseSynced(false);
    setActiveSlotId(null);
    
    // Save preference
    const savedFormations = localStorage.getItem(`ud_lapoveda_tactics_formations_v1_${selectedSeason}`);
    let parsed: Record<string, string> = {};
    if (savedFormations) {
      try { parsed = JSON.parse(savedFormations); } catch (e) {}
    }
    parsed[selectedTeam] = formation;
    localStorage.setItem(`ud_lapoveda_tactics_formations_v1_${selectedSeason}`, JSON.stringify(parsed));
  };

  const currentRoster: PlayerRoster[] = rosters[selectedTeam] || [];
  const currentLineup: Record<string, string[]> = (lineups[selectedTeam] || {}) as Record<string, string[]>;

  // Assign player to a slot on the pitch (supports multi-selection!)
  const assignPlayerToPosition = (positionId: string, playerId: string) => {
    const updatedLineup = { ...currentLineup };

    if (playerId === 'CLEARED') {
      delete updatedLineup[positionId];
    } else {
      // Find and remove this player from any other slot in this team's lineup
      Object.keys(updatedLineup).forEach(posKey => {
        const val = updatedLineup[posKey];
        if (Array.isArray(val)) {
          updatedLineup[posKey] = val.filter(id => id !== playerId);
        } else if (typeof val === 'string' && val === playerId) {
          delete updatedLineup[posKey];
        }
      });

      // Get current list of players in this slot
      let currentVal = updatedLineup[positionId];
      if (!Array.isArray(currentVal)) {
        if (typeof currentVal === 'string' && currentVal) {
          currentVal = [currentVal];
        } else {
          currentVal = [];
        }
      }

      // Toggle selection list: if already in this slot, remove. Otherwise, add.
      if (currentVal.includes(playerId)) {
        updatedLineup[positionId] = currentVal.filter(id => id !== playerId);
      } else {
        updatedLineup[positionId] = [...currentVal, playerId];
      }
    }

    const nextLineups = {
      ...lineups,
      [selectedTeam]: updatedLineup
    };
    saveLineupsToStorage(nextLineups);
    
    // For cleaner multi-selection UX, we don't automatically close the custom picker popover when selecting a player,
    // only when the position is fully cleared
    if (playerId === 'CLEARED') {
      setActiveSlotId(null);
    }
    toast.success('Pizarra actualizada');
  };

  // Generate lists of available players (not in lineup yet)
  const isPlayerAssigned = (playerId: string) => {
    return Object.values(currentLineup).some(val => {
      if (Array.isArray(val)) {
        return val.includes(playerId);
      }
      return val === playerId;
    });
  };

  // Add individual manual player to roster
  const handleAddManualPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error('Indique el nombre del jugador');
      return;
    }

    const newPlayer: PlayerRoster = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      nombre: customName.trim(),
      dorsal: customDorsal.trim() || undefined,
      posicionOriginal: customPos || undefined
    };

    const updatedRoster = [...currentRoster, newPlayer];
    const nextRosters = {
      ...rosters,
      [selectedTeam]: updatedRoster
    };
    saveRostersToStorage(nextRosters);
    
    // Clear manual inputs
    setCustomName('');
    setCustomDorsal('');
    setCustomPos('');
    toast.success(`Se ha añadido a ${newPlayer.nombre} a la plantilla de ${selectedTeam}`);
  };

  // Edit individual player handlers
  const handleStartEditPlayer = (player: PlayerRoster) => {
    setEditingPlayerId(player.id);
    setEditName(player.nombre);
    setEditDorsal(player.dorsal ? String(player.dorsal) : '');
    setEditPos(player.posicionOriginal || '');
  };

  const handleSavePlayerEdit = (playerId: string) => {
    if (!editName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    const updatedRoster = currentRoster.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          nombre: editName.trim(),
          dorsal: editDorsal.trim() || undefined,
          posicionOriginal: editPos.trim() || undefined
        };
      }
      return p;
    });

    const nextRosters = {
      ...rosters,
      [selectedTeam]: updatedRoster
    };
    saveRostersToStorage(nextRosters);
    setEditingPlayerId(null);
    toast.success('Jugador actualizado');
  };

  // Delete individual player from roster
  const handleDeleteFromRoster = (playerId: string) => {
    // If assigned, remove first
    const updatedLineup = { ...currentLineup };
    let wasAssigned = false;
    Object.keys(updatedLineup).forEach(posKey => {
      const val = updatedLineup[posKey];
      if (Array.isArray(val)) {
        if (val.includes(playerId)) {
          updatedLineup[posKey] = val.filter(id => id !== playerId);
          wasAssigned = true;
        }
      } else if (typeof val === 'string' && val === playerId) {
        delete updatedLineup[posKey];
        wasAssigned = true;
      }
    });

    const updatedRoster = currentRoster.filter(p => p.id !== playerId);
    const nextRosters = {
      ...rosters,
      [selectedTeam]: updatedRoster
    };
    saveRostersToStorage(nextRosters);

    if (wasAssigned) {
      const nextLineups = {
        ...lineups,
        [selectedTeam]: updatedLineup
      };
      saveLineupsToStorage(nextLineups);
    }

    toast.success('Jugador eliminado de la plantilla');
  };

  // Clear team roster entirely after confirmation
  const handleClearRoster = () => {
    if (!confirm('¿Estás seguro de vaciar por completo la plantilla de este equipo? Se desasignarán de la pizarra tactica.')) return;
    
    const nextRosters = {
      ...rosters,
      [selectedTeam]: []
    };
    saveRostersToStorage(nextRosters);

    const nextLineups = {
      ...lineups,
      [selectedTeam]: {}
    };
    saveLineupsToStorage(nextLineups);

    toast.success('Plantilla vaciada');
  };

  // Standard Excel/CSV uploader integration
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const uint8Data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(uint8Data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(worksheet);
        
        if (!data || data.length === 0) {
          toast.error('El archivo no contiene filas o está vacío');
          return;
        }

        const imported: PlayerRoster[] = [];
        data.forEach((row: any, i: number) => {
          const keys = Object.keys(row);
          if (keys.length === 0) return;

          // Normalize strings: lowercase, strip accents, keep alphanumeric
          const normalizeStr = (s: string) => {
            return s.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // remove Spanish accents / tildes
              .trim();
          };

          // Robust key search by matching normalized typical names
          const nameKey = keys.find(k => {
            const nk = normalizeStr(k);
            const hasNombre = nk.includes('nombre') || 
                              nk.includes('name') || 
                              nk.includes('jugador') || 
                              nk.includes('player') || 
                              nk.includes('nick') || 
                              nk.includes('atleta') || 
                              nk === 'nom';
            const hasApellidoOnly = (nk.includes('apellido') || nk.includes('lastn') || nk.includes('lasts') || nk.includes('surname')) && !nk.includes('nombre') && !nk.includes('name');
            return hasNombre && !hasApellidoOnly;
          });

          const lastNameKey = keys.find(k => {
            const nk = normalizeStr(k);
            return nk.includes('apellido') || 
                   nk.includes('lastname') || 
                   nk.includes('last name') || 
                   nk.includes('cognom') || 
                   nk.includes('sur_name') || 
                   nk.includes('surname');
          });

          const dorsalKey = keys.find(k => {
            const nk = normalizeStr(k);
            if (nk === 'nombre' || nk.includes('nombre') || nk.includes('name') || nk.includes('apellido') || nk.includes('jugador') || nk.includes('player')) {
              return false;
            }
            return nk.includes('dorsal') || 
                   nk.includes('numero') || 
                   nk.includes('num') || 
                   nk === 'd' || 
                   nk.includes('nº') || 
                   nk === 'no' || 
                   nk === 'no.' || 
                   nk.includes('jersey') || 
                   nk.includes('shirt') || 
                   nk.includes('camiseta');
          });

          const positionKey = keys.find(k => {
            const nk = normalizeStr(k);
            return nk.includes('posicion') || 
                   nk.includes('position') || 
                   nk.includes('pos') || 
                   nk.includes('demarcacion') || 
                   nk.includes('puesto');
          });

          // Fallback: If no explicit Name key was found, guess the first column that isn't dorsal or position as the Name
          let resolvedNameKey = nameKey;
          if (!resolvedNameKey && keys.length > 0) {
            const likelyNameKey = keys.find(k => {
              const nk = normalizeStr(k);
              const isDorsal = nk.includes('dorsal') || nk.includes('numero') || nk.includes('num') || nk === 'd' || nk === 'no' || nk === 'no.' || nk.includes('jersey') || nk.includes('shirt') || nk.includes('camiseta');
              const isPosition = nk.includes('posicion') || nk.includes('position') || nk.includes('pos') || nk.includes('demarcacion') || nk.includes('puesto');
              const isLastName = nk.includes('apellido') || nk.includes('lastname') || nk.includes('last name') || nk.includes('cognom') || nk.includes('sur_name') || nk.includes('surname');
              return !isDorsal && !isPosition && !isLastName;
            });
            resolvedNameKey = likelyNameKey || keys[0];
          }

          const nombreVal = resolvedNameKey ? String(row[resolvedNameKey]).trim() : '';
          const apellidoVal = (lastNameKey && lastNameKey !== resolvedNameKey) ? String(row[lastNameKey]).trim() : '';
          const dorsalVal = dorsalKey ? String(row[dorsalKey]).trim() : '';
          const posVal = positionKey ? String(row[positionKey]).trim() : '';

          // Combine name and surname when separate
          let finalNombre = nombreVal;
          if (apellidoVal && apellidoVal.toLowerCase() !== 'null' && apellidoVal.toLowerCase() !== 'undefined') {
            if (nombreVal && nombreVal.toLowerCase() !== 'null' && nombreVal.toLowerCase() !== 'undefined') {
              if (nombreVal.toLowerCase() !== apellidoVal.toLowerCase()) {
                finalNombre = `${nombreVal} ${apellidoVal}`.trim();
              }
            } else {
              finalNombre = apellidoVal;
            }
          }

          // Only import if there's actually a non-empty name value
          if (finalNombre && finalNombre.toLowerCase() !== 'null' && finalNombre.toLowerCase() !== 'undefined') {
            imported.push({
              id: 'imp-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 5),
              nombre: finalNombre,
              dorsal: dorsalVal || undefined,
              posicionOriginal: posVal || undefined
            });
          }
        });

        if (imported.length > 0) {
          const nextRosters = {
            ...rosters,
            [selectedTeam]: [...currentRoster, ...imported]
          };
          saveRostersToStorage(nextRosters);
          toast.success(`Se han importado ${imported.length} jugadores con éxito desde el archivo`);
        } else {
          toast.error('No se pudo mapear ninguna columna de "Nombre" ni pudimos identificar una columna válida de textos en el archivo.');
        }
      } catch (err) {
        toast.error('Fallo al procesar archivo de hoja de cálculo');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input value
    e.target.value = '';
  };

  // WhatsApp Convocatoria / Matchday briefing output generator
  const getWhatsAppBreifing = () => {
    let text = `📋 *Alineación Oficial UD LA POVEDA* 📋\n`;
    text += `⚽ *Equipo:* ${selectedTeam} (${selectedSeason})\n`;
    text += `📐 *Sistema:* ${selectedFormation}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `*TITULARES:*\n`;

    // Map positions in strategic order (from GK to FW if possible, let's just go over currentPositions)
    currentPositions.forEach((pos) => {
      const pIdsRaw = currentLineup[pos.id] || [];
      const pIds = Array.isArray(pIdsRaw) ? pIdsRaw : (pIdsRaw ? [pIdsRaw] : []);
      const players = currentRoster.filter(p => pIds.includes(p.id));
      if (players.length > 0) {
        const playersText = players.map(p => {
          const displayD = getDisplayDorsal(p);
          const dorsalText = displayD ? `[${displayD}]` : '';
          return `${dorsalText} ${p.nombre}`;
        }).join(' / ');
        text += `• *${pos.shortLabel}:* ${playersText}\n`;
      } else {
        text += `• *${pos.shortLabel}:* _⚠️ (Captación / Vacío)_\n`;
      }
    });

    text += `\n*SUPLENTES O RESERVAS:*\n`;
    const unassigned = currentRoster.filter(p => !isPlayerAssigned(p.id));
    if (unassigned.length > 0) {
      unassigned.forEach((p) => {
        const displayD = getDisplayDorsal(p);
        const dorsalText = displayD ? `[${displayD}] ` : '';
        text += `- ${dorsalText}${p.nombre}\n`;
      });
    } else {
      text += `_No se hallaron reservas en la plantilla o todos juegan._\n`;
    }

    text += `\n📅 _Creado por el portal de scouting de la U.D. La Poveda._`;
    return text;
  };

  const copyWhatsAppToClipboard = () => {
    const briefing = getWhatsAppBreifing();
    navigator.clipboard.writeText(briefing);
    toast.success('🗒️ Convocatoria y alineación copiada para enviar por WhatsApp');
  };

  // Load bulk copy paste text
  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      toast.error('Introduce algún texto primero');
      return;
    }

    const lines = bulkText.split('\n');
    const imported: PlayerRoster[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check if line starts with a number (e.g. "10 - Messi", "7 Cristiano", "1. Casillas")
      const numMatch = trimmedLine.match(/^(\d+)\s*[\.\-\s:]+\s*(.+)$/) || trimmedLine.match(/^(\d+)\s+(.+)$/);
      
      let dorsal: string | undefined = undefined;
      let name = trimmedLine;

      if (numMatch) {
        dorsal = numMatch[1];
        name = numMatch[2].trim();
      }

      // Check for position in parenthesis, e.g. "Marcos (DFC)" or "Pepe - Central"
      const posMatch = name.match(/\(([^)]+)\)$/) || name.match(/-\s*([A-Za-z\s]+)$/);
      let pos: string | undefined = undefined;
      if (posMatch) {
        pos = posMatch[1].trim();
        name = name.replace(posMatch[0], '').trim();
      }

      if (name) {
        imported.push({
          id: 'bulk-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substring(2, 5),
          nombre: name,
          dorsal: dorsal,
          posicionOriginal: pos
        });
      }
    });

    if (imported.length > 0) {
      const nextRosters = {
        ...rosters,
        [selectedTeam]: [...currentRoster, ...imported]
      };
      saveRostersToStorage(nextRosters);
      setBulkText('');
      toast.success(`Se han procesado ${imported.length} jugadores y añadido a la plantilla.`);
    } else {
      toast.error('No se pudo identificar ningún jugador. Introduce uno por línea.');
    }
  };

  // Populate list with demo backup players for easy instant visualization
  const handleLoadSampleRoster = () => {
    const isTeamF11 = TEAMS_F11.includes(selectedTeam);
    const defaults = isTeamF11 ? [...SAMPLE_PLAYERS.F11] : [...SAMPLE_PLAYERS.F7];
    
    const nextRosters = {
      ...rosters,
      [selectedTeam]: defaults
    };
    saveRostersToStorage(nextRosters);
    toast.success('Se ha cargado la plantilla predeterminada e inicial para pruebas');
  };

  // Auto assign players based on position/order (attempts to position ALL roster players in their positions)
  const handleAutoAssign = () => {
    const nextLineup: Record<string, string[]> = {};
    
    currentPositions.forEach(pos => {
      nextLineup[pos.id] = [];
    });

    // Map each current roster player into their best tactical position list
    currentRoster.forEach(player => {
      // Find a position that matches their original position
      let matchedPos = currentPositions.find(pos => 
        player.posicionOriginal?.toLowerCase() === pos.label.toLowerCase() || 
        player.posicionOriginal?.toLowerCase() === pos.shortLabel.toLowerCase()
      );

      // If no perfect match, match by generic terms
      if (!matchedPos) {
        if (player.posicionOriginal?.toLowerCase().includes('portero') || player.posicionOriginal?.toLowerCase() === 'por') {
          matchedPos = currentPositions.find(pos => pos.id === 'GK');
        } else if (player.posicionOriginal?.toLowerCase().includes('defensa') || player.posicionOriginal?.toLowerCase().includes('central') || player.posicionOriginal?.toLowerCase().includes('lateral')) {
          matchedPos = currentPositions.find(pos => pos.id.startsWith('DF') || pos.id === 'LI' || pos.id === 'LD' || pos.id === 'DFC1' || pos.id === 'DFC2');
        } else if (player.posicionOriginal?.toLowerCase().includes('medio') || player.posicionOriginal?.toLowerCase().includes('pivote') || player.posicionOriginal?.toLowerCase().includes('centro') || player.posicionOriginal?.toLowerCase().includes('interior')) {
          matchedPos = currentPositions.find(pos => pos.id.startsWith('MC') || pos.id === 'MCD');
        } else if (player.posicionOriginal?.toLowerCase().includes('delantero') || player.posicionOriginal?.toLowerCase().includes('extremo') || player.posicionOriginal?.toLowerCase().includes('punta')) {
          matchedPos = currentPositions.find(pos => pos.id === 'DC' || pos.id === 'EI' || pos.id === 'ED' || pos.id.startsWith('DC'));
        }
      }

      // If still no match, find a position with least players
      if (!matchedPos) {
        let minCount = Infinity;
        let selectedPos = currentPositions[0];
        currentPositions.forEach(pos => {
          const count = nextLineup[pos.id]?.length || 0;
          if (count < minCount) {
            minCount = count;
            selectedPos = pos;
          }
        });
        matchedPos = selectedPos;
      }

      const pId = matchedPos.id;
      if (!nextLineup[pId]) {
        nextLineup[pId] = [];
      }
      nextLineup[pId].push(player.id);
    });

    const nextLineups = {
      ...lineups,
      [selectedTeam]: nextLineup
    };
    saveLineupsToStorage(nextLineups);
    toast.success('Pizarra autocompletada: Todos los jugadores han sido colocados según sus posiciones');
  };

  const handleClearLineup = () => {
    const nextLineups = {
      ...lineups,
      [selectedTeam]: {}
    };
    saveLineupsToStorage(nextLineups);
    toast.success('Pizarra despejada. Todos los jugadores han sido devueltos al banquillo.');
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto px-4 md:px-0">
      {/* Page Title & Information */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-2">
            <Award className="w-8 h-8 text-blue-500" />
            Campograma de Equipos
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-sans">
            Planifica sistemas tácticos de Fútbol 11 y Fútbol 7. Gestiona las plantillas de los equipos del club y colócalas en la pizarra táctica.
          </p>
        </div>
        
        {/* Quick share actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleAutoAssign}
            disabled={currentRoster.length === 0}
            variant="outline"
            className="border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-900 cursor-pointer"
          >
            <Shuffle className="w-4 h-4 mr-1.5 text-blue-500" />
            Auto-Alinear
          </Button>
        </div>
      </div>

      {/* Selectors Panel (Team and formation) */}
      <Card className="glass-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Season Button Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400">Temporada</label>
            <div className="grid grid-cols-3 gap-1">
              {['25/26', '26/27', '27/28'].map((season) => (
                <Button
                  key={season}
                  onClick={() => {
                    setSelectedSeason(season);
                    localStorage.setItem('ud_lapoveda_tactics_selected_season_v1', season);
                  }}
                  variant={selectedSeason === season ? 'default' : 'outline'}
                  size="sm"
                  className={`font-black h-10 text-xs border uppercase cursor-pointer ${
                    selectedSeason === season 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {season}
                </Button>
              ))}
            </div>
          </div>

          {/* Team Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400">Equipo a Programar</label>
            <select
              value={selectedTeam}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 h-10 px-3 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer"
            >
              <optgroup label="Fútbol 11 (11 Jugadores)">
                {TEAMS_F11.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </optgroup>
              <optgroup label="Fútbol 7 (7 Jugadores)">
                {TEAMS_F7.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Tactical Formation Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400">Sistema Tactico (Formación)</label>
            <div className="flex gap-2">
              <select
                value={selectedFormation}
                onChange={(e) => handleFormationChange(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 h-10 px-3 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold cursor-pointer"
              >
                {Object.keys(currentSystems).map(sys => (
                  <option key={sys} value={sys}>{sys}</option>
                ))}
              </select>
              <Badge className="bg-blue-600/10 text-blue-400 border border-blue-500/25 justify-center items-center h-10 px-3 flex font-black uppercase text-xs rounded-lg">
                ⚽ F{isF11Mode ? '11' : '7'}
              </Badge>
            </div>
          </div>

          {/* Statistics summary */}
          <div className="flex flex-col justify-end">
            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between text-xs text-slate-400 font-medium font-mono h-10">
              <div>
                <span>Plantilla:</span>{' '}
                <strong className="text-white font-bold">{currentRoster.length}</strong>{' '}
                <span>jugadores</span>
              </div>
              <div className="text-right">
                <span>En campo:</span>{' '}
                <strong className="text-blue-400 font-bold">
                  {Object.values(currentLineup).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : (val ? 1 : 0)), 0)} / {isF11Mode ? 11 : 7}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Cloud Sync Actions */}
        <div className="border-t border-slate-900/60 pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              {isLoadingSupabase ? (
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Database className="w-3.5 h-3.5 animate-pulse" />
                  Conectando a Supabase...
                </span>
              ) : isSupabaseSynced ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Cloud className="w-3.5 h-3.5" />
                  Supabase: Guardado en la nube
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold animate-pulse">
                  <CloudOff className="w-3.5 h-3.5" />
                  Supabase: Tienes cambios locales pendientes de guardar
                </span>
              )}
            </div>
            {supabaseErrorMsg && (
              <span className="text-[11px] text-red-400 font-sans font-medium">
                ⚠️ {supabaseErrorMsg}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadTacticsFromSupabase(false)}
              disabled={isLoadingSupabase || isSavingSupabase}
              className="border-slate-850 bg-slate-900/50 text-slate-300 text-xs font-bold hover:bg-slate-850 hover:text-white cursor-pointer px-3.5 h-9 rounded-lg uppercase transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              Cargar de Nube
            </Button>
            <Button
              size="sm"
              disabled={isLoadingSupabase || isSavingSupabase}
              onClick={saveTacticsToSupabase}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 h-9 rounded-lg uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-blue-900/20"
            >
              <Upload className="w-3.5 h-3.5 mr-0.5 text-white" />
              {isSavingSupabase ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid: Campograma + Roster controls */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Visual Football Field */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white text-base font-black uppercase tracking-tight">
                  Pizarra de Juego ({selectedFormation})
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Haz clic en un círculo para adjudicar un jugador de la plantilla.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearLineup}
                className="h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer font-bold uppercase rounded-lg"
              >
                Limpiar Pizarra
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 flex justify-center">
              
              {/* THE PITCH CONTAINER */}
              <div className="w-full max-w-[430px] aspect-[1/1.38] bg-emerald-950 border-4 border-slate-900 rounded-2xl relative shadow-2xl select-none overflow-hidden" style={{ minHeight: '440px' }}>
                
                {/* Visual grass pattern (horizontal stripes) */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.05) 50%, rgba(5,  150, 105, 0.04) 50%)',
                  backgroundSize: '100% 12.5%'
                }} />

                {/* Tactical chalkboard grid markings */}
                <div className="absolute inset-2 border border-emerald-400/25 pointer-events-none" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1/2 h-[12%] border-b border-l border-r border-emerald-400/25 pointer-events-none" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1/4 h-[4%] border-b border-l border-r border-emerald-400/25 pointer-events-none" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-[12%] border-t border-l border-r border-emerald-400/25 pointer-events-none" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/4 h-[4%] border-t border-l border-r border-emerald-400/25 pointer-events-none" />
                
                {/* Center circle and line */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-emerald-400/25 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 w-[24%] aspect-square rounded-full border border-emerald-400/25 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-emerald-400/40 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                
                {/* Goals */}
                <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[20%] h-[4px] bg-slate-100 rounded-sm pointer-events-none" />
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[20%] h-[4px] bg-slate-100 rounded-sm pointer-events-none" />

                {/* PLACED PLAYER DOTS */}
                {currentPositions.map((pos) => {
                  const assignedIdsRaw = currentLineup[pos.id] || [];
                  const assignedIds = Array.isArray(assignedIdsRaw) 
                    ? assignedIdsRaw 
                    : (typeof assignedIdsRaw === 'string' && assignedIdsRaw ? [assignedIdsRaw] : []);
                  
                  const players = currentRoster.filter(p => assignedIds.includes(p.id));
                  const isSlotActive = activeSlotId === pos.id;

                  // Dynamic alignment classes to prevent the selector box from getting clipped near the pitch edges
                  let alignmentHClass = "left-1/2 -translate-x-1/2";
                  if (pos.x < 30) {
                    alignmentHClass = "left-0 translate-x-2"; // align left and move slightly right to stay on pitch
                  } else if (pos.x > 70) {
                    alignmentHClass = "right-0 -translate-x-2"; // align right and move slightly left to stay on pitch
                  }

                  let alignmentVClass = "bottom-12 animate-in slide-in-from-bottom-2";
                  if (pos.y < 25) {
                    alignmentVClass = "top-12 animate-in slide-in-from-top-2"; // show below the circle if too close to the top of pitch
                  }

                  return (
                    <div
                      key={pos.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-300 ${isSlotActive ? 'z-50' : 'z-10 hover:z-20'}`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      onClick={() => setActiveSlotId(isSlotActive ? null : pos.id)}
                    >
                      {/* Player Circle/Jersey */}
                      <div 
                        className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-bold text-xs shadow-lg relative border-2 ${
                          players.length > 0
                            ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white border-white scale-105 group-hover:scale-110' 
                            : 'bg-red-950/20 text-red-400/80 border-dashed border-red-500/40 hover:border-red-400 hover:text-red-350 hover:bg-red-900/10'
                        } ${isSlotActive ? ' ring-4 ring-yellow-400 border-yellow-400 scale-110' : ''}`}
                      >
                        {players.length > 0 ? (
                          <span className="text-[11px] font-black leading-none">
                            {players.length === 1 ? (getDisplayDorsal(players[0]) || '•') : `x${players.length}`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-red-400/60 leading-none">{pos.shortLabel}</span>
                        )}

                        {/* Position badge overlay */}
                        {players.length > 0 && (
                          <Badge className="absolute -top-2.5 -right-2 px-1 py-0 h-4 bg-yellow-400 text-slate-950 font-black text-[8px] border border-slate-900 rounded min-w-[16px] flex justify-center uppercase">
                            {pos.shortLabel}
                          </Badge>
                        )}
                      </div>

                      {/* Display Label below circle */}
                      <div className="mt-1 flex flex-col items-center gap-0.5 z-10">
                        {players.length > 0 ? (
                          players.map((p) => {
                            const dText = getDisplayDorsal(p);
                            return (
                              <span 
                                key={p.id} 
                                className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide border bg-slate-950 text-white border-blue-500/30 align-middle flex items-center justify-center gap-1 shadow-md whitespace-nowrap"
                              >
                                {dText ? `[${dText}] ` : ''}{formatCompactName(p.nombre)}
                              </span>
                            );
                          })
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-black tracking-wide border bg-red-950/80 text-red-400 border-red-500/20 align-middle flex items-center justify-center gap-1 shadow-md whitespace-nowrap leading-tight">
                            ⚠️ CAPTACIÓN
                          </span>
                        )}
                      </div>

                      {/* Selector Bubble Overlay triggered on click */}
                      {isSlotActive && (
                        <div 
                          className={`absolute ${alignmentVClass} ${alignmentHClass} bg-slate-900 border-2 border-slate-700 rounded-xl p-2.5 shadow-2xl w-[210px] z-50 fade-in duration-200`}
                          onClick={(e) => e.stopPropagation()} // stop parent click
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                            <span className="text-[10px] uppercase font-black text-slate-400">Escoger: {pos.label}</span>
                            <button onClick={() => setActiveSlotId(null)} className="text-slate-500 hover:text-white text-xs font-black p-1 hover:bg-slate-800 rounded">×</button>
                          </div>
                          
                          <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                            {players.length > 0 && (
                              <button
                                onClick={() => assignPlayerToPosition(pos.id, 'CLEARED')}
                                className="w-full text-left text-[10px] font-black text-red-400 hover:bg-red-950/20 p-1.5 rounded uppercase block border border-red-900/10 mb-1"
                              >
                                ❌ Vaciar posición
                              </button>
                            )}

                            {currentRoster.length === 0 ? (
                              <div className="text-[10px] text-slate-500 italic p-1">Plantilla vacía</div>
                            ) : (
                              currentRoster.map((rosterPlayer) => {
                                const isAssignedToThis = assignedIds.includes(rosterPlayer.id);
                                const isAssignedElsewhere = isPlayerAssigned(rosterPlayer.id) && !isAssignedToThis;
                                const dText = getDisplayDorsal(rosterPlayer);
                                return (
                                  <button
                                    key={rosterPlayer.id}
                                    onClick={() => assignPlayerToPosition(pos.id, rosterPlayer.id)}
                                    className={`w-full text-left font-semibold text-xs py-1.5 px-2 rounded flex items-center justify-between hover:bg-slate-800 text-white transition-all ${
                                      isAssignedToThis ? 'bg-blue-600/25 border border-blue-500/30 text-blue-200 font-bold' : 'border border-transparent'
                                    }`}
                                  >
                                    <span className="truncate pr-1 flex items-center gap-1">
                                      {isAssignedToThis && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
                                      {dText ? `[${dText}] ` : ''}{rosterPlayer.nombre}
                                    </span>
                                    {isAssignedToThis ? (
                                      <span className="text-[8px] bg-blue-500 text-white font-bold px-1 rounded uppercase">Puesto</span>
                                    ) : isAssignedElsewhere ? (
                                      <span className="text-[8px] bg-slate-900 text-slate-500 border border-slate-800 px-1 rounded uppercase">Otro</span>
                                    ) : (
                                      <span className="text-[8px] bg-slate-950 text-slate-400 border border-slate-850 px-1 rounded uppercase">Libre</span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}

              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Squad/Roster and loading operations */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="glass-card flex-1 flex flex-col min-h-[480px]">
            <CardHeader className="pb-2 border-b border-slate-900">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base font-black uppercase tracking-tight flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-500" />
                  Rúbrica de Plantilla
                </CardTitle>
                {currentRoster.length > 0 && isAdminOrScout && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleClearRoster}
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer"
                    title="Vaciar plantilla de este equipo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardDescription className="text-slate-400 text-xs">
                Administra los integrantes del equipo {selectedTeam}.
              </CardDescription>

              {/* Sub tabs in sidebar */}
              <div className="flex border-b border-slate-800 mt-4 gap-1">
                <button
                  onClick={() => setActiveRosterTab('roster')}
                  className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                    activeRosterTab === 'roster' 
                      ? 'border-blue-500 text-white font-extrabold' 
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Rúbrica ({currentRoster.length})
                </button>
                <button
                  onClick={() => setActiveRosterTab('bulk')}
                  className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                    activeRosterTab === 'bulk' 
                      ? 'border-blue-500 text-white font-extrabold' 
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Importar
                </button>
                <button
                  onClick={() => setActiveRosterTab('manual')}
                  className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                    activeRosterTab === 'manual' 
                      ? 'border-blue-500 text-white font-extrabold' 
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  + Manual
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col bg-slate-950/20">
              
              {/* TAB 1: PLUGGED PLAYERS LIST */}
              {activeRosterTab === 'roster' && (() => {
                return (
                  <div className="flex-1 flex flex-col space-y-3.5">
                    {currentRoster.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/10 h-64">
                        <HelpCircle className="w-8 h-8 text-slate-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-300">No hay jugadores cargados en {selectedTeam}</p>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto">
                            Importa una plantilla en bloque o introduce jugadores manuales para empezar.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleLoadSampleRoster}
                          className="bg-blue-600/15 border border-blue-500/25 text-blue-400 text-xs font-bold hover:bg-blue-600/20 cursor-pointer rounded-lg"
                        >
                          Cargar plantilla de prueba
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {currentRoster.map((player) => {
                          const assigned = isPlayerAssigned(player.id);
                          const isEditing = editingPlayerId === player.id;

                          if (isEditing) {
                            return (
                              <div 
                                key={player.id} 
                                className="bg-slate-900 border-2 border-blue-500/50 p-3 rounded-xl flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150"
                              >
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre</label>
                                  <Input 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-xs h-8 text-white focus:ring-1 focus:ring-blue-500"
                                    placeholder="Nombre del jugador"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dorsal</label>
                                    <Input 
                                      value={editDorsal}
                                      onChange={(e) => setEditDorsal(e.target.value)}
                                      className="bg-slate-950 border-slate-800 text-xs h-8 text-white font-mono focus:ring-1 focus:ring-blue-500"
                                      placeholder="Nº"
                                      type="number"
                                      min="1"
                                      max="99"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demarcación</label>
                                    <Input 
                                      value={editPos}
                                      onChange={(e) => setEditPos(e.target.value)}
                                      className="bg-slate-950 border-slate-800 text-xs h-8 text-white focus:ring-1 focus:ring-blue-500"
                                      placeholder="Puesto"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-800">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setEditingPlayerId(null)}
                                    className="h-7 px-2.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white hover:bg-slate-850"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleSavePlayerEdit(player.id)}
                                    className="h-7 px-3 text-[10px] font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white"
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={player.id} 
                              className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between group hover:border-slate-800 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {/* Jersey/Dorsal icon */}
                                <div className="w-7 h-7 rounded bg-slate-900 text-slate-400 border border-slate-800 flex justify-center items-center text-xs font-bold font-mono shrink-0">
                                  {getDisplayDorsal(player) || '—'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-extrabold text-white truncate">{player.nombre}</p>
                                    {assigned ? (
                                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1 rounded uppercase font-bold tracking-wider shrink-0">
                                        En Campo
                                      </span>
                                    ) : (
                                      <span className="text-[8px] bg-slate-900 text-slate-400 border border-slate-800 px-1 rounded uppercase font-bold tracking-wider shrink-0">
                                        Banquillo
                                      </span>
                                    )}
                                  </div>
                                  {player.posicionOriginal && (
                                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{player.posicionOriginal}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {isAdminOrScout && (
                                  <>
                                    <button
                                      onClick={() => handleStartEditPlayer(player)}
                                      className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-900 transition-colors"
                                      title="Editar jugador"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFromRoster(player.id)}
                                      className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition-colors"
                                      title="Quitar jugador de la plantilla"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  
                  {/* Backup utility banner / tips */}
                  {currentRoster.length > 0 && (
                    <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg flex items-start gap-2.5 mt-auto">
                      <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-slate-400 leading-normal">
                        <strong className="text-white block font-bold mb-0.5">💡 ¿Cómo funciona la alineación?</strong>
                        Haz clic en los círculos tácticos en el campo para asignar a estos jugadores. Los no asignados quedarán rotulados como suplentes.
                      </div>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* TAB 2: BULK EXCEL/CSV/TXT IMPORT AREA */}
              {activeRosterTab === 'bulk' && (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Excel file uploader */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Opción A: Importar archivo Excel o CSV</label>
                    <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-6 text-center bg-slate-950/30 flex flex-col items-center justify-center gap-3 relative">
                      <Upload className="w-8 h-8 text-blue-500" />
                      <div>
                        <span className="text-xs text-slate-300 font-bold block">Pincha aquí o arrastra un archivo</span>
                        <span className="text-[10px] text-slate-500 mt-1 block">Soporta hojas de cálculo .xlsx, .xls y .csv</span>
                      </div>
                      <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        onChange={handleExcelImport}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                  </div>

                  <div className="relative text-center py-1">
                    <hr className="border-slate-850" />
                    <span className="bg-slate-950 text-slate-500 text-[10px] uppercase font-bold tracking-widest px-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">Ó</span>
                  </div>

                  {/* Manual Paste list */}
                  <div className="flex-1 flex flex-col space-y-2 min-h-[160px]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-400">Opción B: Pegar lista de texto</label>
                      <QuestionIcon className="w-3.5 h-3.5 text-slate-500 cursor-help" title="Ejemplos válidos:\n1 - Gonzalo (GK)\n2 - Sergio Central\n10 - Messi (DEL)" />
                    </div>
                    
                    <Textarea
                      placeholder="Pega listados de nombres en líneas separadas.&#10;Ejemplos:&#10;1 - Gonzalo Robles&#10;4 - Sergio Marcos (Central)&#10;9 - Iker Salgado (Delantero)"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-xs text-white placeholder-slate-600 flex-1 min-h-[110px]"
                    />

                    <Button
                      onClick={handleBulkImport}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase cursor-pointer"
                    >
                      Procesar y Añadir Lista
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: SINGLE MANUAL JUGADOR FORM */}
              {activeRosterTab === 'manual' && (
                <form onSubmit={handleAddManualPlayer} className="flex-1 flex flex-col space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-400">Nombre del Jugador</label>
                    <Input
                      placeholder="Ej. Martín García"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-slate-400">Dorsal (Número)</label>
                      <Input
                        placeholder="Ej. 10"
                        type="number"
                        min="1"
                        max="99"
                        value={customDorsal}
                        onChange={(e) => setCustomDorsal(e.target.value)}
                        className="bg-slate-900 border-slate-800 text-white text-sm font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-slate-400">Demarcación / Posición</label>
                      <Input
                        placeholder="Ej. Delantero"
                        value={customPos}
                        onChange={(e) => setCustomPos(e.target.value)}
                        className="bg-slate-900 border-slate-800 text-white text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase cursor-pointer mt-2"
                  >
                    Añadir Jugador Individual
                  </Button>

                  <div className="border border-indigo-500/10 rounded-xl p-3.5 bg-indigo-950/10 text-[10px] text-slate-400 leading-normal mt-auto">
                    <strong className="text-indigo-400 block font-bold mb-0.5">ℹ️ Acerca del Campograma:</strong>
                    Tanto las plantillas como las alineaciones se guardan localmente en tu terminal de manera automática. Puedes vaciar perfiles o reestablecerlos en cualquier momento.
                  </div>
                </form>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

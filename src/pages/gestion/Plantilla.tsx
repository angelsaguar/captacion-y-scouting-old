import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { Player, CLUB_TEAMS, POSITION_STRUCTURED_ATTRIBUTES, COMMON_ATTRIBUTES } from '@/types';
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
  FileText,
  Award,
  Clock,
  Shield,
  Edit,
  Save,
  Cloud,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

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
  // Extra stats
  partidos_jugados?: number;
  minutos_jugados?: number;
  goles?: number;
  asistencias?: number;
  tarjetas_amarillas?: number;
  tarjetas_rojas?: number;
  asistencia_entrenamientos?: number;
  // FIFA attributes (0-99)
  ritmo?: number;
  tiro?: number;
  pase?: number;
  regate?: number;
  defensa?: number;
  fisico?: number;
  rating_general?: number;
}

function DetailedPerformanceDossier({ player, stats, allPlayers = [] }: { player: TeamPlayer; stats: any; allPlayers?: TeamPlayer[] }) {
  const [attributes, setAttributes] = useState<{ atributo: string; valor: number }[]>([]);
  const [physicalTests, setPhysicalTests] = useState<any[]>([]);
  const [antropometria, setAntropometria] = useState<any[]>([]);
  const [compareMetric, setCompareMetric] = useState<'yoyo_m' | 'yoyo_kmh' | 'illinois' | 'vel30m'>('yoyo_m');

  useEffect(() => {
    if (!player) return;

    // Load Physical Tests
    const savedPhys = localStorage.getItem('ud_poveda_physical_test_history');
    if (savedPhys) {
      try {
        const parsedPhys = JSON.parse(savedPhys);
        const playerPhys = parsedPhys.filter((r: any) => 
          r.player_id === player.id || 
          (r.player_name && r.player_name.toLowerCase().trim() === `${player.nombre} ${player.apellidos}`.toLowerCase().trim())
        );
        setPhysicalTests(playerPhys.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      } catch (e) {
        console.error(e);
      }
    }

    // Load Anthropometrics
    const savedAntropo = localStorage.getItem('ud_poveda_anthropometric_history');
    if (savedAntropo) {
      try {
        const parsedAntropo = JSON.parse(savedAntropo);
        const playerAntropo = parsedAntropo.filter((r: any) => 
          r.player_id === player.id || 
          (r.player_name && r.player_name.toLowerCase().trim() === `${player.nombre} ${player.apellidos}`.toLowerCase().trim())
        );
        setAntropometria(playerAntropo.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      } catch (e) {
        console.error(e);
      }
    }
  }, [player]);

  const getPlayerEvaluations = () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('team_evaluations_')) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data[player.id]) {
          return data[player.id];
        }
      }
    }
    return null;
  };

  const dossierEvals = getPlayerEvaluations();
  const baseStatsForDossier = stats;

  const getTeamComparisonData = () => {
    if (!allPlayers || allPlayers.length === 0) return [];

    let allPhysHistory: any[] = [];
    const savedPhys = localStorage.getItem('ud_poveda_physical_test_history');
    if (savedPhys) {
      try {
        allPhysHistory = JSON.parse(savedPhys);
      } catch (e) {
        console.error("Error parsing physical test history", e);
      }
    }

    return allPlayers.map(p => {
      const pTests = allPhysHistory.filter((r: any) => 
        r.player_id === p.id || 
        (r.player_name && r.player_name.toLowerCase().trim() === `${p.nombre} ${p.apellidos}`.toLowerCase().trim())
      );

      let latestVal = 0;
      let isEstimated = false;

      if (pTests.length > 0) {
        const sorted = [...pTests].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const latestRecord = sorted[sorted.length - 1];
        
        if (compareMetric === 'yoyo_m') latestVal = latestRecord.yoyo_m || 0;
        else if (compareMetric === 'yoyo_kmh') latestVal = latestRecord.yoyo_kmh || 0;
        else if (compareMetric === 'illinois') latestVal = latestRecord.illinois || 0;
        else if (compareMetric === 'vel30m') latestVal = latestRecord.vel30m || 0;
      } else {
        isEstimated = true;
        if (compareMetric === 'yoyo_m') latestVal = Math.round((p.fisico || 70) * 16);
        else if (compareMetric === 'yoyo_kmh') latestVal = Number((12 + ((p.fisico || 70) * 0.05)).toFixed(1));
        else if (compareMetric === 'illinois') latestVal = Number((19.5 - ((p.regate || 70) * 0.05)).toFixed(2));
        else if (compareMetric === 'vel30m') latestVal = Number((5.1 - ((p.ritmo || 70) * 0.015)).toFixed(2));
      }

      return {
        id: p.id,
        fullName: `${p.nombre} ${p.apellidos}`,
        displayName: `${p.nombre} ${p.apellidos.charAt(0)}.`,
        value: Number(latestVal),
        isCurrentPlayer: p.id === player.id,
        isEstimated
      };
    });
  };

  const rawCompareData = getTeamComparisonData();
  const isLowerBetter = compareMetric === 'illinois' || compareMetric === 'vel30m';
  const sortedCompareData = [...rawCompareData].sort((a, b) => {
    if (isLowerBetter) {
      return a.value - b.value;
    } else {
      return b.value - a.value;
    }
  });

  const currentPlayerIndex = sortedCompareData.findIndex(item => item.isCurrentPlayer);
  const currentRank = currentPlayerIndex !== -1 ? currentPlayerIndex + 1 : 1;
  const currentVal = rawCompareData.find(item => item.isCurrentPlayer)?.value || 0;

  const validValues = rawCompareData.map(item => item.value).filter(val => val > 0);
  const teamAverage = validValues.length > 0 
    ? Number((validValues.reduce((sum, v) => sum + v, 0) / validValues.length).toFixed(1))
    : 0;
  
  const bestValue = sortedCompareData[0]?.value || 0;
  const bestPlayerName = sortedCompareData[0]?.fullName || 'N/A';

  const deviation = Number((currentVal - teamAverage).toFixed(1));
  const deviationText = deviation >= 0 
    ? `+${deviation} (Por encima de la media)` 
    : `${deviation} (Por debajo de la media)`;

  const getMetricUnit = () => {
    if (compareMetric === 'yoyo_m') return ' m';
    if (compareMetric === 'yoyo_kmh') return ' km/h';
    if (compareMetric === 'illinois') return ' s';
    if (compareMetric === 'vel30m') return ' s';
    return '';
  };
  
  const getMetricName = () => {
    if (compareMetric === 'yoyo_m') return 'Distancia Yo-Yo';
    if (compareMetric === 'yoyo_kmh') return 'Velocidad Yo-Yo';
    if (compareMetric === 'illinois') return 'Agilidad Illinois';
    if (compareMetric === 'vel30m') return 'Sprint 30m';
    return '';
  };

  const comparisonData = ['Septiembre', 'Diciembre', 'Mayo'].map(p => {
    const evalData = dossierEvals?.[p];
    if (evalData && evalData.stats) {
      return {
        name: p,
        'Rating General': evalData.stats.rating_general !== undefined ? evalData.stats.rating_general : baseStatsForDossier.rating_general,
        'Ritmo': evalData.stats.ritmo !== undefined ? evalData.stats.ritmo : baseStatsForDossier.ritmo,
        'Tiro': evalData.stats.tiro !== undefined ? evalData.stats.tiro : baseStatsForDossier.tiro,
        'Pase': evalData.stats.pase !== undefined ? evalData.stats.pase : baseStatsForDossier.pase,
        'Regate': evalData.stats.regate !== undefined ? evalData.stats.regate : baseStatsForDossier.regate,
        'Defensa': evalData.stats.defensa !== undefined ? evalData.stats.defensa : baseStatsForDossier.defensa,
        'Físico': evalData.stats.fisico !== undefined ? evalData.stats.fisico : baseStatsForDossier.fisico,
      };
    }
    return {
      name: p,
      'Rating General': baseStatsForDossier.rating_general || 75,
      'Ritmo': baseStatsForDossier.ritmo || 70,
      'Tiro': baseStatsForDossier.tiro || 65,
      'Pase': baseStatsForDossier.pase || 70,
      'Regate': baseStatsForDossier.regate || 70,
      'Defensa': baseStatsForDossier.defensa || 60,
      'Físico': baseStatsForDossier.fisico || 70,
    };
  });

  const attributeProgressData = [
    {
      name: 'OVR (General)',
      'Septiembre': comparisonData[0]?.['Rating General'] || 0,
      'Diciembre': comparisonData[1]?.['Rating General'] || 0,
      'Mayo': comparisonData[2]?.['Rating General'] || 0,
    },
    {
      name: 'RIT (Ritmo)',
      'Septiembre': comparisonData[0]?.['Ritmo'] || 0,
      'Diciembre': comparisonData[1]?.['Ritmo'] || 0,
      'Mayo': comparisonData[2]?.['Ritmo'] || 0,
    },
    {
      name: 'TIR (Tiro)',
      'Septiembre': comparisonData[0]?.['Tiro'] || 0,
      'Diciembre': comparisonData[1]?.['Tiro'] || 0,
      'Mayo': comparisonData[2]?.['Tiro'] || 0,
    },
    {
      name: 'PAS (Pase)',
      'Septiembre': comparisonData[0]?.['Pase'] || 0,
      'Diciembre': comparisonData[1]?.['Pase'] || 0,
      'Mayo': comparisonData[2]?.['Pase'] || 0,
    },
    {
      name: 'REG (Regate)',
      'Septiembre': comparisonData[0]?.['Regate'] || 0,
      'Diciembre': comparisonData[1]?.['Regate'] || 0,
      'Mayo': comparisonData[2]?.['Regate'] || 0,
    },
    {
      name: 'DEF (Defensa)',
      'Septiembre': comparisonData[0]?.['Defensa'] || 0,
      'Diciembre': comparisonData[1]?.['Defensa'] || 0,
      'Mayo': comparisonData[2]?.['Defensa'] || 0,
    },
    {
      name: 'FIS (Físico)',
      'Septiembre': comparisonData[0]?.['Físico'] || 0,
      'Diciembre': comparisonData[1]?.['Físico'] || 0,
      'Mayo': comparisonData[2]?.['Físico'] || 0,
    },
  ];

  useEffect(() => {
    const loadAttrs = async () => {
      try {
        const { data, error } = await supabase
          .from('player_attributes')
          .select('atributo, valor')
          .eq('player_id', player.id);
        if (!error && data && data.length > 0) {
          setAttributes(data);
        } else {
          // Fallback: query players table by first name & last name to get UUID
          const { data: pData } = await supabase
            .from('players')
            .select('id')
            .ilike('nombre', player.nombre)
            .ilike('apellidos', player.apellidos)
            .limit(1);
          if (pData && pData.length > 0) {
            const { data: attrData } = await supabase
              .from('player_attributes')
              .select('atributo, valor')
              .eq('player_id', pData[0].id);
            if (attrData) {
              setAttributes(attrData);
            }
          }
        }
      } catch (err) {
        console.error("Error loading attributes for dossier", err);
      }
    };
    loadAttrs();
  }, [player.id, player.nombre, player.apellidos]);

  const age = player.anio_nacimiento ? (2026 - player.anio_nacimiento) : 18;
  const preferredFoot = player.lateralidad || 'Derecho';
  
  // Heatmap configuration based on position
  const pos = (player.posicion || 'DELANTERO').toUpperCase();
  let heatMapConfig = { left: '72%', top: '45%', area: 'Área Rival' };
  if (pos.includes('PORTERO') || pos.includes('GK')) {
    heatMapConfig = { left: '12%', top: '50%', area: 'Área Propia' };
  } else if (pos.includes('CENTRAL') || pos.includes('DEFENSA')) {
    heatMapConfig = { left: '25%', top: '50%', area: 'Tercio Defensivo' };
  } else if (pos.includes('LATERAL')) {
    heatMapConfig = { left: '35%', top: '25%', area: 'Banda Lateral' };
  } else if (pos.includes('MEDIO CENTRO') || pos.includes('INTERIOR')) {
    heatMapConfig = { left: '50%', top: '50%', area: 'Medio Campo' };
  } else if (pos.includes('EXTREMO')) {
    heatMapConfig = { left: '75%', top: '20%', area: 'Extremo / Banda' };
  } else if (pos.includes('PUNTA')) {
    heatMapConfig = { left: '68%', top: '45%', area: 'Tres Cuartos / Mediapunta' };
  }

  // Core metrics from App records
  const matches = stats.partidos_jugados || 0;
  const minutes = stats.minutos_jugados || 0;
  const goals = stats.goles || 0;
  const assists = stats.asistencias || 0;
  const yellowCards = stats.tarjetas_amarillas || 0;
  const redCards = stats.tarjetas_rojas || 0;
  const attendance = stats.asistencia_entrenamientos || 0;

  // Position-specific registered attributes for Page 2
  const specificGroups = POSITION_STRUCTURED_ATTRIBUTES[player.posicion] || [];
  const specificAttrNames = specificGroups.flatMap(group => group.items);
  const positionRatedAttrs = specificAttrNames.map(name => {
    const found = attributes.find(a => a.atributo === name);
    return {
      name,
      value: found ? found.valor : 0,
      rated: !!found
    };
  });
  const ratedOnly = positionRatedAttrs.filter(a => a.rated);
  const finalAttrsToDisplay = [...ratedOnly, ...positionRatedAttrs.filter(a => !a.rated)].slice(0, 6);

  // Split specific groups for Column 1 & Column 2 in Page 4 (Valoración técnica)
  const halfSpecific = Math.ceil(specificGroups.length / 2);
  const col1Groups = specificGroups.slice(0, halfSpecific);
  const col2Groups = specificGroups.slice(halfSpecific);
  const col3Groups = COMMON_ATTRIBUTES;

  // Data for Chart 1: Items valorados por su demarcación (individual attributes from scouting, scale 1-5)
  const chart1Data = positionRatedAttrs
    .filter(a => a.rated)
    .map(a => ({
      name: a.name,
      'Puntuación': a.value
    }));

  const finalChart1Data = chart1Data.length > 0
    ? chart1Data
    : specificAttrNames.map(name => ({
        name,
        'Puntuación': 3 // promedio por defecto
      }));

  // Data for Chart 2: Rendimiento medio por categoría de su demarcación (average of category attributes, scale 1-5)
  const chart2DataRaw = specificGroups.map(group => {
    const groupAttrs = attributes.filter(a => group.items.includes(a.atributo));
    const avg = groupAttrs.length > 0
      ? Number((groupAttrs.reduce((sum, a) => sum + a.valor, 0) / groupAttrs.length).toFixed(1))
      : 0;
    return {
      category: group.category,
      'Media Jugadora': avg,
      'Objetivo Club': 5.0
    };
  }).filter(item => item['Media Jugadora'] > 0);

  const finalChart2Data = chart2DataRaw.length > 0
    ? chart2DataRaw
    : specificGroups.map((group, idx) => ({
        category: group.category,
        'Media Jugadora': [3.8, 4.2, 3.5, 3.9, 4.0][idx % 5],
        'Objetivo Club': 5.0
      }));

  // Observations report based on the scouting attributes
  const generateObservations = () => {
    if (attributes.length === 0) {
      return `Se requiere registrar valoraciones específicas de captación y scouting para el jugador/a a fin de realizar un análisis individualizado. En base a los registros de rendimiento y estadísticas generales de la temporada, destaca su aportación al grupo con una valoración general de ${stats.rating_general || 50}/100 y una asistencia excelente del ${attendance}% a los entrenamientos. Demuestra un gran espíritu deportivo, seriedad táctica y una progresión regular dentro de la estructura de la U.D. La Poveda.`;
    }

    const strongAttrs = attributes
      .filter(a => a.valor >= 4)
      .map(a => a.atributo.toLowerCase());

    const weakAttrs = attributes
      .filter(a => a.valor <= 2)
      .map(a => a.atributo.toLowerCase());

    const totalVal = attributes.reduce((sum, a) => sum + a.valor, 0);
    const avgVal = (totalVal / attributes.length).toFixed(1);

    let text = `Tras un análisis detallado del perfil deportivo de **${player.nombre} ${player.apellidos}** y la consolidación de todas sus valoraciones técnicas registradas por el equipo de scouting (promedio de **${avgVal}/5**), la coordinación de metodología ha redactado el siguiente informe individualizado de rendimiento: \n\n`;

    if (strongAttrs.length > 0) {
      const formattedStr = strongAttrs.length > 1 
        ? `${strongAttrs.slice(0, -1).join(', ')} y ${strongAttrs[strongAttrs.length - 1]}`
        : strongAttrs[0];
      text += `• **Fortalezas Principales:** En su posición de **${player.posicion}**, destaca notablemente por su desempeño en **${formattedStr}**. Demuestra poseer unas condiciones diferenciales en estas facetas, permitiendo generar ventajas técnico-tácticas determinantes en la circulación y resolución del juego. \n\n`;
    } else {
      text += `• **Perfil de Rendimiento:** Muestra un perfil técnico equilibrado en las variables evaluadas para su demarcación, sirviendo de base sólida para los requisitos del modelo táctico del club. \n\n`;
    }

    if (weakAttrs.length > 0) {
      const formattedWeak = weakAttrs.length > 1
        ? `${weakAttrs.slice(0, -1).join(', ')} y ${weakAttrs[weakAttrs.length - 1]}`
        : weakAttrs[0];
      text += `• **Áreas de Mejora y Desarrollo:** Se han detectado oportunidades de optimización en **${formattedWeak}**. Se aconseja incidir en estas variables durante las sesiones de entrenamiento específico para dotar al jugador/a de mayor polivalencia y recursos bajo presión. \n\n`;
    } else {
      text += `• **Consistencia General:** No se registran debilidades críticas en su informe de scouting. Muestra un perfil táctico homogéneo de alta fiabilidad, clave para sostener la competitividad regular del equipo. \n\n`;
    }

    text += `• **Conclusión Metodológica:** Con una valoración general de **${stats.rating_general || 50}** y un ratio de compromiso del **${attendance}%** en entrenamientos, se concluye que **${player.nombre}** representa un perfil alineado con la filosofía de juego de la **U.D. La Poveda**. Su regularidad diaria y madurez deportiva avalan la confianza depositada por el staff técnico.`;

    return text;
  };

  return (
    <div className="space-y-16 text-white font-sans selection:bg-blue-600 selection:text-white">
      
      {/* PAGE 1: PORTADA */}
      <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between aspect-[1.41/1] w-full min-h-[600px] shadow-2xl page-break">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.12),transparent_70%)] pointer-events-none" />
        <div className="flex justify-between items-center border-b border-blue-950 pb-6">
          <span className="text-blue-500 font-black tracking-[0.2em] text-[10px] uppercase">UD LA POVEDA • ÁREA DE RENDIMIENTO</span>
          <span className="text-xs font-mono text-slate-500">REF: DOSSIER-{player.id.substring(0,6).toUpperCase()}</span>
        </div>
        
        <div className="my-auto text-center space-y-6">
          <span className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px]">ANÁLISIS METODOLÓGICO DE JUGADOR</span>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-white uppercase leading-none">
            DOSSIER DE<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-400">RENDIMIENTO</span>
          </h1>
          
          <div className="flex justify-center my-6">
            <div className="relative">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-blue-500 p-1 bg-slate-900 shadow-xl overflow-hidden flex items-center justify-center">
                {player.foto_url ? (
                  <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <Users className="w-16 h-16 text-slate-700" />
                )}
              </div>
              
              {/* Flag Badge */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-4 w-9 h-6 rounded border border-white/20 shadow-md overflow-hidden flex flex-col">
                <div className="bg-red-600 h-2" />
                <div className="bg-yellow-400 h-2" />
                <div className="bg-red-600 h-2" />
              </div>
              
              {/* Shield Badge */}
              <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-10 h-10 bg-slate-900 border-2 border-blue-500 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-[9px] font-black text-blue-400">UDLP</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white leading-none">
            {player.nombre} <span className="text-blue-400">{player.apellidos}</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {player.posicion} • DORSAL {player.dorsal}
          </p>
        </div>

        <div className="border-t border-blue-950 pt-6 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA METODOLOGÍA</span>
          <span>SOPORTE DE DATOS ANALÍTICOS</span>
          <span>TEMPORADA 2025 / 2026</span>
        </div>
      </div>

      {/* PAGE 2: PERFIL Y EVOLUCIÓN */}
      <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between aspect-[1.41/1] w-full min-h-[600px] shadow-2xl page-break">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.05),transparent_60%)] pointer-events-none" />
        <div className="flex justify-between items-center border-b border-blue-950 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
              02
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">PERFIL Y FICHA DE LA JUGADORA</h4>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">DATOS PERSONALES Y VALORACIÓN DE ATRIBUTOS</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">UDLP METODOLOGÍA</span>
        </div>

        <div className="my-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left: Metadata list */}
          <div className="md:col-span-5 space-y-4 text-left">
            <div className="flex items-center gap-4 pb-3 border-b border-blue-950">
              <div className="w-12 h-12 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                {player.foto_url ? (
                  <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Users className="w-6 h-6 text-slate-700" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black uppercase leading-none">{player.nombre} {player.apellidos}</h3>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{player.posicion}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Dorsal Oficial:</span>
                <span className="text-white font-bold uppercase">#{player.dorsal}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Posición Principal:</span>
                <span className="text-white font-bold uppercase">{player.posicion}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Año Nacimiento / Edad:</span>
                <span className="text-white font-bold">{player.anio_nacimiento || 'N/A'} ({age} años)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Pie Dominante:</span>
                <span className="text-white font-bold">{preferredFoot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Estado Físico actual:</span>
                <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] uppercase ${
                  player.estado_fisico === 'Disponible' ? 'bg-blue-500/10 text-sky-400' :
                  player.estado_fisico === 'Lesionado' ? 'bg-red-500/10 text-red-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {player.estado_fisico}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Teléfono de Contacto:</span>
                <span className="text-white font-bold font-mono">{player.telefono || 'No registrado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400 font-semibold">Correo Electrónico:</span>
                <span className="text-white font-bold truncate max-w-[180px] block">{player.email || 'No registrado'}</span>
              </div>
            </div>
          </div>

          {/* Right: Actual Attributes and KPI Badges */}
          <div className="md:col-span-7 space-y-5 text-left">
            
            {/* Actual Stats Badges */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-blue-950/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-sky-400 text-lg font-black font-mono">
                  {stats.rating_general || 50}
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-2">MEDIA</span>
              </div>
              <div className="bg-slate-900 border border-blue-950/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg font-black font-mono">
                  {goals}
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-2">GOLES</span>
              </div>
              <div className="bg-slate-900 border border-blue-950/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg font-black font-mono">
                  {assists}
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-2">ASIST.</span>
              </div>
              <div className="bg-slate-900 border border-blue-950/80 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-300 text-sm font-black font-mono">
                  {attendance}%
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-2">ASIST. ENT</span>
              </div>
            </div>

            {/* Visual presentation of specific attributes for player's demarcation */}
            <div className="bg-slate-900/60 border border-blue-950 p-4 rounded-2xl space-y-3.5">
              <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-wider pb-1 border-b border-blue-950 flex justify-between">
                <span>ATRIBUTOS TÉCNICOS REGISTRADOS DE SU DEMARCACIÓN</span>
                <span className="text-[9px] text-slate-500 uppercase">ESCALA 1-5</span>
              </h5>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[11px]">
                {finalAttrsToDisplay.map((attr) => (
                  <div key={attr.name} className="space-y-1">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span className="text-slate-300 truncate max-w-[130px] uppercase">{attr.name}</span>
                      <span className="text-sky-400 font-mono font-black">
                        {attr.value > 0 ? `${attr.value}/5` : 'S/V'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                        style={{ width: `${attr.value > 0 ? (attr.value / 5) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA © 2026</span>
          <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
        </div>
      </div>

      {/* PAGE 3: RENDIMIENTO TOTAL Y MAPA DE CALOR */}
      <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between aspect-[1.41/1] w-full min-h-[600px] shadow-2xl page-break">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.05),transparent_60%)] pointer-events-none" />
        <div className="flex justify-between items-center border-b border-blue-950 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
              03
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">RENDIMIENTO Y COMPARTIMENTOS</h4>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">REGISTROS ACUMULADOS EN COMPETICIÓN Y ÁREA DE INFLUENCIA</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">UDLP METODOLOGÍA</span>
        </div>

        <div className="my-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left: Real metrics list from App */}
          <div className="md:col-span-7 space-y-4 text-left">
            <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-wider border-b border-blue-950 pb-1.5 flex justify-between">
              <span>REGISTROS HISTÓRICOS DE LA COMPETICIÓN</span>
              <span className="text-slate-500 font-bold uppercase">TEMPORADA ACTUAL</span>
            </h5>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-blue-950 p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Partidos Jugados</span>
                <div className="text-2xl font-black text-white">{matches}</div>
              </div>

              <div className="bg-slate-900/50 border border-blue-950 p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Minutos Disputados</span>
                <div className="text-2xl font-black text-blue-400">{minutes} <span className="text-xs font-semibold text-slate-400">min</span></div>
              </div>

              <div className="bg-slate-900/50 border border-blue-950 p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Goles Marcados</span>
                <div className="text-2xl font-black text-indigo-400">{goals} <span className="text-xs font-semibold text-slate-400">goles</span></div>
              </div>

              <div className="bg-slate-900/50 border border-blue-950 p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Asistencias de Gol</span>
                <div className="text-2xl font-black text-sky-400">{assists} <span className="text-xs font-semibold text-slate-400">asist.</span></div>
              </div>

              <div className="bg-slate-900/50 border border-blue-950 p-3.5 rounded-xl space-y-1 col-span-2 flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Tarjetas y Disciplina</span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400 font-bold">
                      <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" />
                      {yellowCards} Amarillas
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-red-500 font-bold">
                      <span className="w-2.5 h-3.5 bg-red-500 rounded-sm" />
                      {redCards} Rojas
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Asistencia Entrenamientos</span>
                  <div className="text-lg font-black text-sky-300">{attendance}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Pitch Heatmap */}
          <div className="md:col-span-5 space-y-4 text-center">
            <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-wider text-left border-b border-blue-950 pb-1">
              ÁREA DE INFLUENCIA ({heatMapConfig.area})
            </h5>
            
            {/* Soccer Pitch Container */}
            <div className="bg-slate-950 border border-blue-900/30 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden h-44">
              
              {/* Pitch Canvas lines */}
              <div className="absolute inset-4 border border-blue-900/10 flex items-center justify-center pointer-events-none">
                {/* Midfield line */}
                <div className="absolute inset-y-0 left-1/2 border-l border-blue-900/10" />
                {/* Center circle */}
                <div className="absolute w-12 h-12 rounded-full border border-blue-900/10" />
                {/* Center point */}
                <div className="absolute w-1 h-1 bg-blue-900/10 rounded-full" />
                
                {/* Goal area Left */}
                <div className="absolute inset-y-8 left-0 w-6 border-r border-y border-blue-900/10" />
                {/* Goal area Right */}
                <div className="absolute inset-y-8 right-0 w-6 border-l border-y border-blue-900/10" />
              </div>

              {/* Heat Map Hotspots! Position-aware radial glowing circles */}
              <div 
                className="absolute w-20 h-20 bg-blue-500/30 rounded-full filter blur-xl animate-pulse"
                style={{ left: heatMapConfig.left, top: heatMapConfig.top, transform: 'translate(-50%, -50%)' }}
              />
              <div 
                className="absolute w-12 h-12 bg-sky-500/30 rounded-full filter blur-lg animate-pulse"
                style={{ left: heatMapConfig.left, top: heatMapConfig.top, transform: 'translate(-50%, -50%)' }}
              />
              <div 
                className="absolute w-6 h-6 bg-indigo-400/40 rounded-full filter blur-md animate-pulse"
                style={{ left: heatMapConfig.left, top: heatMapConfig.top, transform: 'translate(-50%, -50%)' }}
              />

              {/* Core metrics overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[7px] font-black uppercase tracking-widest text-slate-500">
                <span>UDLP METODOLOGÍA</span>
                <span>ZONA DE ACCIÓN RECOMENDADA</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed text-left italic">
              * El mapa muestra las zonas de mayor interacción. Mediciones ajustadas a la posición de <strong>{player.posicion}</strong>.
            </p>
          </div>

        </div>

        <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA © 2026</span>
          <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
        </div>
      </div>

      {/* PAGE 4: VALORACIONES DE CAPTACIÓN Y SCOUTING COMPLETA (SIN SCROLL / FULL-PAGE) */}
      {attributes.length > 0 && (
        <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between aspect-[1.41/1] w-full min-h-[600px] shadow-2xl page-break">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.05),transparent_60%)] pointer-events-none" />
          <div className="flex justify-between items-center border-b border-blue-950 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
                04
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-white leading-none">VALORACIÓN TÉCNICA DETALLADA ({player.posicion})</h4>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">DESGLOSE COMPLETO DE ATRIBUTOS ESPECÍFICOS Y COMUNES</span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">UDLP METODOLOGÍA</span>
          </div>

          {/* High density 3-column layout without scrollbars */}
          <div className="my-auto grid grid-cols-1 md:grid-cols-3 gap-3 items-start text-left text-[10px]">
            {/* Column 1: Specific groups (First Half) */}
            <div className="space-y-2">
              <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider pb-0.5 border-b border-slate-800/60 block">
                Específicos - Parte I
              </span>
              {col1Groups.map(group => {
                const groupAttrs = attributes.filter(a => group.items.includes(a.atributo));
                if (groupAttrs.length === 0) return null;
                return (
                  <div key={group.category} className="space-y-1 bg-slate-900/40 p-2 rounded-xl border border-slate-850/60">
                    <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest block pb-0.5">{group.category}</span>
                    <div className="space-y-0.5">
                      {groupAttrs.map(attr => (
                        <div key={attr.atributo} className="flex justify-between items-center text-[9px] py-0.5 border-b border-slate-950">
                          <span className="text-slate-300 font-medium truncate max-w-[120px]">{attr.atributo}</span>
                          <span className={cn(
                            "font-black px-1 py-0.2 rounded text-[9px] min-w-[26px] text-center font-mono",
                            attr.valor === 0 && "text-red-500 bg-red-500/10",
                            attr.valor === 1 && "text-red-400 bg-red-400/10",
                            attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                            attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                            attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                            attr.valor === 5 && "text-sky-400 bg-sky-400/10"
                          )}>{attr.valor}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Column 2: Specific groups (Second Half) */}
            <div className="space-y-2">
              <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider pb-0.5 border-b border-slate-800/60 block">
                Específicos - Parte II
              </span>
              {col2Groups.map(group => {
                const groupAttrs = attributes.filter(a => group.items.includes(a.atributo));
                if (groupAttrs.length === 0) return null;
                return (
                  <div key={group.category} className="space-y-1 bg-slate-900/40 p-2 rounded-xl border border-slate-850/60">
                    <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest block pb-0.5">{group.category}</span>
                    <div className="space-y-0.5">
                      {groupAttrs.map(attr => (
                        <div key={attr.atributo} className="flex justify-between items-center text-[9px] py-0.5 border-b border-slate-950">
                          <span className="text-slate-300 font-medium truncate max-w-[120px]">{attr.atributo}</span>
                          <span className={cn(
                            "font-black px-1 py-0.2 rounded text-[9px] min-w-[26px] text-center font-mono",
                            attr.valor === 0 && "text-red-500 bg-red-500/10",
                            attr.valor === 1 && "text-red-400 bg-red-400/10",
                            attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                            attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                            attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                            attr.valor === 5 && "text-sky-400 bg-sky-400/10"
                          )}>{attr.valor}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Column 3: Common attributes */}
            <div className="space-y-2">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider pb-0.5 border-b border-slate-800/60 block">
                Comunes Metodológicos
              </span>
              {col3Groups.map(group => {
                const groupAttrs = attributes.filter(a => group.items.includes(a.atributo));
                if (groupAttrs.length === 0) return null;
                return (
                  <div key={group.category} className="space-y-1 bg-slate-900/40 p-2 rounded-xl border border-slate-850/60">
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block pb-0.5">{group.category}</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {groupAttrs.map(attr => (
                        <div key={attr.atributo} className="flex justify-between items-center text-[8.5px] py-0.5 border-b border-slate-950/60">
                          <span className="text-slate-300 font-medium truncate max-w-[85px]" title={attr.atributo}>{attr.atributo}</span>
                          <span className={cn(
                            "font-black px-1 py-0.2 rounded text-[8.5px] min-w-[22px] text-center font-mono",
                            attr.valor === 0 && "text-red-500 bg-red-500/10",
                            attr.valor === 1 && "text-red-400 bg-red-400/10",
                            attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                            attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                            attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                            attr.valor === 5 && "text-sky-400 bg-sky-400/10"
                          )}>{attr.valor}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
            <span>U.D. LA POVEDA © 2026</span>
            <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
          </div>
        </div>
      )}

      {/* PAGE 5: CONCLUSIONES Y OBSERVACIONES METODOLÓGICAS (DRAFTED FROM ATTRIBUTES) */}
      {attributes.length > 0 && (
        <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between aspect-[1.41/1] w-full min-h-[600px] shadow-2xl page-break">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none" />
          <div className="flex justify-between items-center border-b border-blue-950 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
                05
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-white leading-none">INFORME DE OBSERVACIONES Y CONCLUSIONES</h4>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">SÍNTESIS DIVERGENTE BASADA EN VALORACIONES INDIVIDUALIZADAS</span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">UDLP METODOLOGÍA</span>
          </div>

          <div className="my-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch text-left">
            <div className="md:col-span-8 bg-slate-900/40 border border-blue-950/60 p-5 rounded-2xl flex flex-col justify-between text-[11px] leading-relaxed text-slate-300 space-y-3 whitespace-pre-line">
              {generateObservations()}
            </div>

            <div className="md:col-span-4 flex flex-col justify-between space-y-4">
              <div className="bg-slate-900/30 border border-blue-950 p-4 rounded-2xl flex-1 flex flex-col justify-center text-center space-y-2">
                <div className="text-xs font-black text-blue-400 uppercase tracking-wider">PLAN DE TRABAJO</div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Se sugiere mantener un seguimiento bimestral con tests de campo específicos y entrenamientos de alta intensidad para consolidar la madurez táctica y corregir deficiencias.
                </p>
              </div>

              {/* Stamp and Signatures */}
              <div className="bg-slate-900/60 border border-blue-950 p-4 rounded-2xl space-y-4">
                <div className="space-y-1 text-center">
                  <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest block">VALIDADO POR EL CLUB</span>
                  <div className="mx-auto w-12 h-12 rounded-full border border-blue-500/40 flex items-center justify-center bg-blue-950/40 text-blue-400 font-mono text-[10px] font-black">
                    UDLP
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 text-center">
                  <div className="h-6 flex items-end justify-center">
                    <span className="font-serif italic text-blue-300/60 text-xs tracking-widest font-bold">M. Saguar</span>
                  </div>
                  <span className="text-[8px] text-slate-500 uppercase block font-bold tracking-wider mt-1">Dir. Metodología</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
            <span>U.D. LA POVEDA © 2026</span>
            <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
          </div>
        </div>
      )}

      {/* PAGE 6: GRÁFICOS Y ANÁLISIS DE RENDIMIENTO */}
      <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between w-full min-h-[850px] shadow-2xl page-break">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)] pointer-events-none" />
        <div className="flex justify-between items-center border-b border-blue-950 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
              {attributes.length > 0 ? '06' : '04'}
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">ANALÍTICA GRÁFICA DE RENDIMIENTO</h4>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">PERFIL INDIVIDUAL SEGÚN DEMARCACIÓN METODOLÓGICA</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">UDLP METODOLOGÍA</span>
        </div>

        {/* Charts Container */}
        <div className="my-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Chart 1: Atributos individuales de su posición (Escala 1-5) */}
          <div className="md:col-span-6 bg-slate-900/60 border border-blue-900/20 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="mb-4">
              <h5 className="text-[13px] font-black text-white uppercase tracking-wider">MÉTRICAS ESPECÍFICAS DE SCOUTING</h5>
              <p className="text-[10px] text-sky-400 font-medium">Atributos clave valorados para la posición de {player.posicion}</p>
            </div>
            <div className="h-[560px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={finalChart1Data}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 5]} 
                    ticks={[0, 1, 2, 3, 4, 5]} 
                    stroke="#ffffff" 
                    fontSize={11} 
                    fontWeight="black"
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#ffffff" 
                    fontSize={8.5} 
                    fontWeight="black" 
                    width={115} 
                    interval={0}
                    tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 16)}..` : value}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#3b82f6', borderRadius: '8px' }}
                    labelStyle={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                    formatter={(value) => <span className="text-white font-black">{value} (Escala 1-5)</span>}
                  />
                  <Bar dataKey="Puntuación" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10}>
                    {finalChart1Data.map((entry, index) => {
                      // Custom color gradient per attribute value
                      const val = entry['Puntuación'];
                      let barColor = '#3b82f6'; // Blue
                      if (val >= 4.5) barColor = '#38bdf8'; // Sky Blue
                      else if (val >= 4.0) barColor = '#10b981'; // Green
                      else if (val <= 2.0) barColor = '#f97316'; // Orange
                      return <Cell key={`cell-${index}`} fill={barColor} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Medias por Categoría de la Demarcación */}
          <div className="md:col-span-6 bg-slate-900/60 border border-blue-900/20 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="mb-4">
              <h5 className="text-[13px] font-black text-white uppercase tracking-wider">PROMEDIO POR ÁREAS DE JUEGO</h5>
              <p className="text-[10px] text-sky-400 font-medium">Rendimiento agrupado por categorías específicas vs Objetivo Club</p>
            </div>
            <div className="h-[560px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={finalChart2Data}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="category" 
                    stroke="#ffffff" 
                    fontSize={10.5} 
                    fontWeight="black"
                    tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}.` : value}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    ticks={[0, 1, 2, 3, 4, 5]} 
                    stroke="#ffffff" 
                    fontSize={11} 
                    fontWeight="black"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#3b82f6', borderRadius: '8px' }}
                    labelStyle={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(value) => <span className="text-white font-black px-1">{value}</span>}
                  />
                  <Bar dataKey="Media Jugadora" fill="#3b82f6" name="Media Jugadora" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="Objetivo Club" fill="#1e293b" name="Objetivo Club" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,3" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA © 2026</span>
          <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
        </div>
      </div>

      {/* PAGE 7: HISTORIAL DE VALORACIONES (SEPTIEMBRE, DICIEMBRE, MAYO) */}
      <div className="min-h-[1100px] bg-slate-950 p-10 flex flex-col justify-between border-4 border-double border-slate-900 rounded-[2.5rem] relative shadow-2xl overflow-hidden mt-10 print:mt-0 print:border-0 print:shadow-none break-before-page" style={{ breakBefore: 'page' }}>
        {/* Subtle decorative stadium grid in background */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
        
        <div className="space-y-8 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase block">INFORME DE RENDIMIENTO</span>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">07. COMPARATIVA TRIMESTRAL</h2>
              <p className="text-xs text-slate-400 font-bold uppercase">U.D. LA POVEDA • HISTORIAL DE VALORACIONES ANUALES</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-slate-600 block uppercase">PÁGINA 7 DE 8</span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-1.5 inline-block">Sincronizado</span>
            </div>
          </div>

          {/* Subtitle / Context */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl">
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Esta sección presenta la evolución detallada de la jugadora a lo largo de los tres periodos de valoración de la temporada: <strong className="text-amber-500">Septiembre</strong>, <strong className="text-amber-500">Diciembre</strong> y <strong className="text-amber-500">Mayo</strong>. Permite analizar de forma objetiva las tendencias de progreso, la asimilación táctica y el desarrollo físico continuado.
            </p>
          </div>

          {/* Graphic Section */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl text-left">
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>EVOLUCIÓN GRÁFICA DE ATRIBUTOS CLAVE</span>
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attributeProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} fontWeight="black" />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} fontWeight="black" />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(v) => <span className="text-white font-black px-1">{v}</span>} />
                  <Bar dataKey="Septiembre" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Diciembre" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Mayo" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl text-left">
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>TABLA DE DATOS COMPARATIVA</span>
            </h4>
            <div className="overflow-hidden border border-slate-900 rounded-xl bg-slate-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-900">
                    <th className="py-2.5 px-4">PERIODO</th>
                    <th className="py-2.5 px-3 text-center text-red-400">OVR</th>
                    <th className="py-2.5 px-3 text-center text-blue-400">RIT</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">TIR</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">PAS</th>
                    <th className="py-2.5 px-3 text-center text-pink-400">REG</th>
                    <th className="py-2.5 px-3 text-center text-purple-400">DEF</th>
                    <th className="py-2.5 px-3 text-center text-teal-400">FIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-medium">
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/20">
                      <td className="py-2.5 px-4 font-black text-white uppercase text-[11px]">{row.name}</td>
                      <td className="py-2.5 px-3 text-center font-black text-red-400 text-sm">{row['Rating General']}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-white">{row['Ritmo']}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-white">{row['Tiro']}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-white">{row['Pase']}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-white">{row['Regate']}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-white">{row['Defensa']}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-white">{row['Físico']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA © 2026</span>
          <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
        </div>
      </div>

      {/* PAGE 8: CONTROL BIOMÉTRICO Y RENDIMIENTO */}
      <div className="min-h-[1100px] bg-slate-950 p-10 flex flex-col justify-between border-4 border-double border-slate-900 rounded-[2.5rem] relative shadow-2xl overflow-hidden mt-10 print:mt-0 print:border-0 print:shadow-none break-before-page" style={{ breakBefore: 'page' }}>
        {/* Subtle decorative stadium grid in background */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
        
        <div className="space-y-8 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase block">ÁREA DE RENDIMIENTO</span>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">08. CONTROL BIOMÉTRICO Y PRUEBAS FÍSICAS</h2>
              <p className="text-xs text-slate-400 font-bold uppercase">U.D. LA POVEDA • HISTORIAL DE COMPOSICIÓN Y RENDIMIENTO FÍSICO</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-slate-600 block uppercase">PÁGINA 8 DE 8</span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-1.5 inline-block">Sincronizado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Seccion Antropometria */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>COMPOSICIÓN CORPORAL (ANTROPOMETRÍA)</span>
                </div>
              </h3>

              {antropometria.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 uppercase font-black border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                  No se registran datos de antropometría esta temporada.
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  {/* Ultimo registro resumido */}
                  {(() => {
                    const latest = antropometria[antropometria.length - 1];
                    const heightM = latest.height / 100;
                    const imc = latest.weight && latest.height ? (latest.weight / (heightM * heightM)).toFixed(1) : '-';
                    const fatKg = latest.weight && latest.body_fat_pct ? ((latest.weight * latest.body_fat_pct) / 100).toFixed(1) : '-';
                    const muscleKg = latest.weight && latest.muscle_pct ? ((latest.weight * latest.muscle_pct) / 100).toFixed(1) : '-';
                    
                    return (
                      <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl grid grid-cols-3 gap-2">
                        <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                          <span className="text-[9px] text-slate-500 font-black uppercase block">Peso</span>
                          <span className="text-sm font-black text-white mt-1 block">{latest.weight || '-'} kg</span>
                        </div>
                        <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                          <span className="text-[9px] text-slate-500 font-black uppercase block">Altura</span>
                          <span className="text-sm font-black text-white mt-1 block">{latest.height || '-'} cm</span>
                        </div>
                        <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                          <span className="text-[9px] text-slate-500 font-black uppercase block">IMC</span>
                          <span className="text-sm font-black text-blue-400 mt-1 block">{imc}</span>
                        </div>
                        <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                          <span className="text-[9px] text-slate-500 font-black uppercase block">% Grasa</span>
                          <span className="text-sm font-black text-red-400 mt-1 block">{latest.body_fat_pct ? `${latest.body_fat_pct}%` : '-'}</span>
                          {fatKg !== '-' && <span className="text-[8px] text-slate-500 block mt-0.5">{fatKg} kg</span>}
                        </div>
                        <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                          <span className="text-[9px] text-slate-500 font-black uppercase block">% Músculo</span>
                          <span className="text-sm font-black text-emerald-400 mt-1 block">{latest.muscle_pct ? `${latest.muscle_pct}%` : '-'}</span>
                          {muscleKg !== '-' && <span className="text-[8px] text-slate-500 block mt-0.5">{muscleKg} kg</span>}
                        </div>
                        <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                          <span className="text-[9px] text-slate-500 font-black uppercase block">Cintura</span>
                          <span className="text-sm font-black text-amber-500 mt-1 block">{latest.waist_cm ? `${latest.waist_cm} cm` : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabla reducida */}
                  <div className="overflow-hidden border border-slate-900 rounded-xl bg-slate-950 text-[10px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-black uppercase text-[8px] tracking-wider border-b border-slate-900">
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-2 text-center">Peso</th>
                          <th className="py-2 px-2 text-center">IMC</th>
                          <th className="py-2 px-2 text-center">Grasa</th>
                          <th className="py-2 px-2 text-center">Músculo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 font-medium">
                        {antropometria.slice(-5).map((row, idx) => {
                          const heightM = row.height / 100;
                          const imc = row.weight && row.height ? (row.weight / (heightM * heightM)).toFixed(1) : '-';
                          return (
                            <tr key={idx} className="hover:bg-slate-900/20">
                              <td className="py-2 px-3 font-bold text-white">{row.date}</td>
                              <td className="py-2 px-2 text-center text-slate-300">{row.weight ? `${row.weight} kg` : '-'}</td>
                              <td className="py-2 px-2 text-center text-blue-400 font-bold">{imc}</td>
                              <td className="py-2 px-2 text-center text-red-400 font-bold">{row.body_fat_pct ? `${row.body_fat_pct}%` : '-'}</td>
                              <td className="py-2 px-2 text-center text-emerald-400 font-bold">{row.muscle_pct ? `${row.muscle_pct}%` : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Gráfico de Análisis vs Referencia */}
                  {antropometria.length > 0 && (() => {
                    const latest = antropometria[antropometria.length - 1];
                    const heightM = latest.height / 100;
                    const imc = latest.weight && latest.height ? Number((latest.weight / (heightM * heightM)).toFixed(1)) : 0;
                    const compChartData = [
                      { name: '% Músculo', 'Jugador': latest.muscle_pct || 0, 'Ref. Óptimo': 45.0 },
                      { name: '% Grasa', 'Jugador': latest.body_fat_pct || 0, 'Ref. Óptimo': 12.0 },
                      { name: 'IMC (Índice)', 'Jugador': imc, 'Ref. Óptimo': 21.5 }
                    ];
                    return (
                      <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">Composición Corporal vs Referencia Óptima</span>
                        <div className="h-32 w-full font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={8} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={8} domain={[0, 60]} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '9px' }} />
                              <Legend wrapperStyle={{ fontSize: '8px' }} formatter={(v) => <span className="text-white font-semibold px-1">{v}</span>} />
                              <Bar dataKey="Jugador" fill="#10b981" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="Ref. Óptimo" fill="#475569" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Grafico de Evolución Temporal (solo si hay más de un registro) */}
                  {antropometria.length >= 2 && (
                    <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">Evolución Temporal de Composición</span>
                      <div className="h-32 w-full font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={antropometria} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={8} />
                            <YAxis stroke="#64748b" fontSize={8} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '9px' }} />
                            <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="body_fat_pct" name="Grasa (%)" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="muscle_pct" name="Músculo (%)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seccion Pruebas Fisicas */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>PRUEBAS FÍSICAS (TESTS DE RENDIMIENTO)</span>
                </div>
                {physicalTests.length === 0 && (
                  <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded uppercase font-black">
                    Perfil Estimado
                  </span>
                )}
              </h3>

              {(() => {
                const latestPhys = physicalTests.length > 0 ? physicalTests[physicalTests.length - 1] : {
                  date: 'Ficha Técnica',
                  yoyo_m: Math.round((stats.fisico || 70) * 16),
                  yoyo_kmh: Number((12 + ((stats.fisico || 70) * 0.05)).toFixed(1)),
                  illinois: Number((19.5 - ((stats.regate || 70) * 0.05)).toFixed(2)),
                  vel30m: Number((5.1 - ((stats.ritmo || 70) * 0.015)).toFixed(2)),
                  isEstimated: true
                };

                const rows = physicalTests.length > 0 ? physicalTests : [latestPhys];

                const yoyoIndex = latestPhys.yoyo_m ? Math.round((latestPhys.yoyo_m / 1400) * 100) : 0;
                const speedIndex = latestPhys.yoyo_kmh ? Math.round((latestPhys.yoyo_kmh / 14.5) * 100) : 0;
                const agilIndex = latestPhys.illinois ? Math.round((17.5 / latestPhys.illinois) * 100) : 0;
                const sprintIndex = latestPhys.vel30m ? Math.round((4.4 / latestPhys.vel30m) * 100) : 0;

                const physicalProgressData = [
                  { name: 'Resistencia (Endurance)', 'Jugador': yoyoIndex, 'Media Equipo': 100 },
                  { name: 'Agilidad (Illinois)', 'Jugador': agilIndex, 'Media Equipo': 100 },
                  { name: 'Velocidad (Sprint)', 'Jugador': sprintIndex, 'Media Equipo': 100 }
                ];

                return (
                  <div className="space-y-4 text-left">
                    {/* Ultimo registro resumido */}
                    <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl grid grid-cols-2 gap-2">
                      <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                        <span className="text-[9px] text-slate-500 font-black uppercase block">Yo-Yo Test</span>
                        <span className="text-sm font-black text-emerald-400 mt-1 block">{latestPhys.yoyo_m || '-'} m</span>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                        <span className="text-[9px] text-slate-500 font-black uppercase block">Velocidad Yo-Yo</span>
                        <span className="text-sm font-black text-white mt-1 block">{latestPhys.yoyo_kmh ? `${latestPhys.yoyo_kmh} km/h` : '-'}</span>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                        <span className="text-[9px] text-slate-500 font-black uppercase block">Agilidad Illinois</span>
                        <span className="text-sm font-black text-red-400 mt-1 block">{latestPhys.illinois ? `${latestPhys.illinois} s` : '-'}</span>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded border border-slate-900 text-center">
                        <span className="text-[9px] text-slate-500 font-black uppercase block">Sprint 30m</span>
                        <span className="text-sm font-black text-amber-500 mt-1 block">{latestPhys.vel30m ? `${latestPhys.vel30m} s` : '-'}</span>
                      </div>
                    </div>

                    {/* Tabla reducida */}
                    <div className="overflow-hidden border border-slate-900 rounded-xl bg-slate-950 text-[10px]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 font-black uppercase text-[8px] tracking-wider border-b border-slate-900">
                            <th className="py-2 px-3">Fecha</th>
                            <th className="py-2 px-2 text-center">Yo-Yo (m)</th>
                            <th className="py-2 px-2 text-center">Vel. (km/h)</th>
                            <th className="py-2 px-2 text-center">Illinois (s)</th>
                            <th className="py-2 px-2 text-center">Sprint 30m</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60 font-medium">
                          {rows.slice(-5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/20">
                              <td className="py-2 px-3 font-bold text-white">
                                {row.date}
                                {row.isEstimated && <span className="text-[7px] text-amber-500 block font-normal">Base Estimada</span>}
                              </td>
                              <td className="py-2 px-2 text-center text-emerald-400 font-bold">{row.yoyo_m ? `${row.yoyo_m} m` : '-'}</td>
                              <td className="py-2 px-2 text-center text-slate-300">{row.yoyo_kmh ? `${row.yoyo_kmh} km/h` : '-'}</td>
                              <td className="py-2 px-2 text-center text-red-400 font-bold">{row.illinois ? `${row.illinois} s` : '-'}</td>
                              <td className="py-2 px-2 text-center text-amber-500 font-bold">{row.vel30m ? `${row.vel30m} s` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Gráfico de Capacidad Física vs Media */}
                    <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">
                        Índice de Capacidad Física vs Media del Equipo (100%)
                      </span>
                      <div className="h-32 w-full font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={physicalProgressData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={8} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={8} domain={[0, 120]} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '9px' }} />
                            <Legend wrapperStyle={{ fontSize: '8px' }} formatter={(v) => <span className="text-white font-semibold px-1">{v}</span>} />
                            <Bar dataKey="Jugador" fill="#ef4444" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Media Equipo" fill="#475569" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Evolución Temporal (si hay más de 1 registro real) */}
                    {physicalTests.length >= 2 && (
                      <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">Evolución de Rendimiento</span>
                        <div className="h-32 w-full font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={physicalTests} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={8} />
                              <YAxis stroke="#64748b" fontSize={8} />
                              <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '9px' }} />
                              <Line type="monotone" dataKey="yoyo_m" name="Yo-Yo (m)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="vel30m" name="Sprint 30m (s)" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA © 2026</span>
          <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
        </div>
      </div>

      {/* PAGE 9: COMPARATIVA INTERNA DE RENDIMIENTO */}
      <div className="bg-[#020617] rounded-[2.5rem] border border-blue-900/40 p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between w-full min-h-[850px] shadow-2xl page-break mt-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)] pointer-events-none" />
        
        <div className="flex justify-between items-center border-b border-blue-950 pb-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-black text-xs">
              09
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white leading-none">COMPARATIVA INTERNA DE RENDIMIENTO</h4>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">RANGO Y PERCENTILES COMPARATIVOS CON EL GRUPO DE COMPAÑERAS</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">UDLP METODOLOGÍA</span>
        </div>

        <div className="my-auto space-y-8 text-left">
          {/* Header metric selection tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl">
            <div>
              <h5 className="text-xs font-black text-amber-500 uppercase tracking-wider">Métrica de Comparativa</h5>
              <p className="text-[10px] text-slate-400">Selecciona el test para evaluar el rango del jugador frente a la plantilla</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'yoyo_m', label: 'Yo-Yo Test (m)' },
                { id: 'yoyo_kmh', label: 'Velocidad (km/h)' },
                { id: 'illinois', label: 'Illinois (s)' },
                { id: 'vel30m', label: 'Sprint 30m (s)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCompareMetric(opt.id as any)}
                  className={`text-[10px] font-black uppercase py-2 px-3 rounded-xl transition-all ${
                    compareMetric === opt.id 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15' 
                      : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Visuals layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Chart Area - 8 columns */}
            <div className="lg:col-span-8 bg-slate-900/20 border border-slate-900 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                Clasificación de Plantilla • {getMetricName()}
              </span>
              <div className="h-64 w-full font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedCompareData} margin={{ top: 15, right: 10, left: -25, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="displayName" 
                      stroke="#64748b" 
                      fontSize={8} 
                      tickLine={false} 
                      angle={-35} 
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={8} 
                      tickLine={false} 
                      domain={[0, 'auto']} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '9px' }} 
                      formatter={(v) => [`${v}${getMetricUnit()}`, getMetricName()]}
                    />
                    <Bar dataKey="value" fill="#475569" radius={[4, 4, 0, 0]}>
                      {sortedCompareData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isCurrentPlayer ? '#f59e0b' : '#3b82f6'} 
                          opacity={entry.isCurrentPlayer ? 1 : 0.4}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500 px-2">
                <span>← MEJOR RENDIMIENTO</span>
                <span>PEOR RENDIMIENTO →</span>
              </div>
            </div>

            {/* Stats Insights - 4 columns */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/60 border border-slate-900 p-5 rounded-2xl space-y-4 text-left">
                <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                  MÉTRICAS DE RENDIMIENTO GRUPAL
                </h5>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block uppercase">Puesto en el Equipo</span>
                    <strong className="text-lg text-white font-extrabold block mt-0.5">
                      Puesto #{currentRank} <span className="text-xs text-slate-500 font-normal">de {sortedCompareData.length}</span>
                    </strong>
                  </div>
                  <div className="h-px bg-slate-800/60" />
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block uppercase">Registro de {player.nombre}</span>
                    <strong className="text-lg text-amber-500 font-extrabold block mt-0.5">
                      {currentVal}{getMetricUnit()}
                    </strong>
                  </div>
                  <div className="h-px bg-slate-800/60" />
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block uppercase">Media de la Plantilla</span>
                    <strong className="text-sm text-slate-300 font-bold block mt-0.5">
                      {teamAverage}{getMetricUnit()}
                    </strong>
                  </div>
                  <div className="h-px bg-slate-800/60" />
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block uppercase">Desviación sobre la Media</span>
                    <strong className={`text-xs font-bold block mt-0.5 ${deviation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {deviationText}
                    </strong>
                  </div>
                  <div className="h-px bg-slate-800/60" />
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] block uppercase">Mejor Registro del Equipo</span>
                    <strong className="text-xs text-sky-400 font-bold block mt-0.5" title={bestPlayerName}>
                      {bestValue}{getMetricUnit()} <span className="text-[10px] text-slate-500 font-normal">by {bestPlayerName.split(' ')[0]}</span>
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-1 text-[10px] text-amber-400/90 leading-relaxed text-left">
                <span className="font-bold uppercase block text-[9px] text-amber-500 mb-1">💡 Análisis de Rango:</span>
                <p>
                  El jugador se encuentra en el <strong>{Math.round((1 - (currentRank / sortedCompareData.length)) * 100)}º percentil</strong> del equipo para este test.
                  {currentRank === 1 ? ' ¡Es la mejor marca registrada en la plantilla actual!' : 
                   currentRank <= 3 ? ' Está en el top 3 de rendimiento del grupo.' : 
                   deviation >= 0 ? ' Su rendimiento se mantiene por encima de la media colectiva.' : 
                   ' Se recomienda entrenamiento compensatorio para acercarse al promedio de la plantilla.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider">
          <span>U.D. LA POVEDA © 2026</span>
          <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
        </div>
      </div>

    </div>
  );
}


function FUTPlayerCard({ player, stats }: { player: TeamPlayer; stats: any }) {
  const angles = [-90, -30, 30, 90, 150, 210].map(deg => deg * Math.PI / 180);
  const cx = 95;
  const cy = 105;
  const r = 50;

  const valPoints = [
    stats.ritmo ?? 50,
    stats.regate ?? 50,
    stats.fisico ?? 50,
    stats.defensa ?? 50,
    stats.pase ?? 50,
    stats.tiro ?? 50
  ].map((val: number, idx: number) => {
    const radius = (val / 100) * r;
    const angle = angles[idx];
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const gridPoints = (factor: number) => {
    return angles.map((angle) => {
      const x = cx + r * factor * Math.cos(angle);
      const y = cy + r * factor * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const renderVertexLabel = (val: number, label: string, x: number, y: number, textAnchor: 'start' | 'end' | 'middle') => {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Glowing glass pill behind the vertex score */}
        <rect 
          x={textAnchor === 'start' ? -2 : textAnchor === 'end' ? -30 : -16} 
          y={-10} 
          width={32} 
          height={16} 
          rx={4} 
          fill="#050716" 
          stroke="rgba(245, 158, 11, 0.4)" 
          strokeWidth="1" 
        />
        <text 
          x={textAnchor === 'start' ? 2 : textAnchor === 'end' ? -26 : -11} 
          y={1} 
          fill="rgba(255,255,255,0.5)" 
          fontSize="6" 
          fontWeight="black" 
          textAnchor="start"
        >
          {label}
        </text>
        <text 
          x={textAnchor === 'start' ? 18 : textAnchor === 'end' ? -10 : 7} 
          y={1} 
          fill="#ffffff" 
          fontSize="8" 
          fontWeight="extrabold" 
          textAnchor="start"
        >
          {val}
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-[340px] h-[520px] rounded-[2.5rem] bg-gradient-to-b from-amber-200 via-yellow-100 to-amber-300 p-1 shadow-[0_0_35px_rgba(245,158,11,0.25)] flex flex-col justify-between overflow-hidden text-white font-sans select-none border border-amber-400">
      {/* Dark Outer Shield Border Trim */}
      <div className="absolute inset-[3px] rounded-[2.35rem] bg-[#020514] overflow-hidden flex flex-col justify-between p-3.5">
        
        {/* Starry / Cosmic Background Layer */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.25)_0%,transparent_50%)] pointer-events-none" />
        {/* Subtle diagonal speed lines */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.03)_75%,transparent_75%,transparent)] bg-[length:20px_20px] pointer-events-none" />

        {/* Top Area: Rating, Flags, Photo, Shield Emblem */}
        <div className="relative h-40 flex justify-between items-start z-10">
          
          {/* Top Left: Overall Rating and Spain Flag */}
          <div className="flex flex-col items-center pl-1 mt-1">
            <span className="text-4xl font-extrabold font-mono tracking-tighter text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {stats.rating_general}
            </span>
            <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase mt-0.5">
              {player.posicion.substring(0, 3)}
            </span>
            
            {/* Beautiful CSS Spanish Flag */}
            <div className="w-8 h-5 flex flex-col rounded overflow-hidden border border-white/10 mt-2 shadow-sm">
              <div className="bg-red-600 h-1.5 w-full" />
              <div className="bg-yellow-400 h-2 w-full flex items-center justify-center relative">
                <div className="w-1 h-1 bg-red-700 rounded-full" />
              </div>
              <div className="bg-red-600 h-1.5 w-full" />
            </div>

            {/* Ball Icon */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 mt-2 text-slate-500 fill-slate-500/10" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 8 4l-4 3-4-2-4 2-4-3a10 10 0 0 1 8-4z" />
              <path d="M4 6l4 3v5l-4 3" />
              <path d="M20 6l-4 3v5l4 3" />
              <path d="M8 14l4 2 4-2v4l-4 2-4-2v-4z" />
            </svg>
          </div>

          {/* Center: Cutout Player Photo */}
          <div className="absolute left-1/2 -translate-x-1/2 top-4 w-28 h-28 rounded-full border-2 border-amber-400/40 overflow-hidden flex items-center justify-center shadow-xl bg-slate-950 z-20">
            {player.foto_url ? (
              <img src={player.foto_url} alt={player.nombre} referrerPolicy="no-referrer" className="w-full h-full object-cover object-center" />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                <Users className="w-10 h-10 text-slate-700" />
              </div>
            )}
          </div>

          {/* Top Right: Custom Club Crest Shield */}
          <div className="mt-1 pr-1">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-xs p-1 rounded-xl flex items-center justify-center shadow-lg border border-amber-500/30">
              <UDLaPovedaLogo className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Player Name Banner */}
        <div className="text-center z-10 -mt-1 selection:bg-amber-400 selection:text-slate-950">
          <h3 className="text-2xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
            {player.apellidos || player.nombre}
          </h3>
          {player.apellidos && (
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">
              {player.nombre}
            </h4>
          )}
        </div>

        {/* Mid Horizontal Ribbon */}
        <div className="mx-2 mt-2 bg-gradient-to-r from-red-600/30 via-slate-950/90 to-blue-600/30 border-y border-amber-500/20 py-1 flex items-center justify-center gap-2 z-10 rounded-md">
          <div className="w-4 h-2.5 flex flex-col rounded-xs overflow-hidden border border-white/20">
            <div className="bg-red-600 h-0.5 w-full" />
            <div className="bg-yellow-400 h-1.5 w-full" />
            <div className="bg-red-600 h-0.5 w-full" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-amber-400">CD LA POVEDA</span>
          <span className="text-white/30 text-[8px]">•</span>
          <span className="text-[8px] font-extrabold uppercase text-white tracking-wider">
            {player.anio_nacimiento ? `${2026 - parseInt(player.anio_nacimiento as any)} AÑOS` : '15 AÑOS'}
          </span>
        </div>

        {/* Middle Split Area (Left panel, Right chart) */}
        <div className="grid grid-cols-12 gap-1 px-1 mt-2.5 flex-1 items-stretch z-10">
          
          {/* Left panel: Season Statistics */}
          <div className="col-span-5 flex flex-col justify-between gap-1 pr-1 border-r border-slate-900/80">
            {/* Matches */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-1 flex items-center gap-1.5 text-left">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-blue-400" stroke="currentColor" fill="none" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 1 8 4l-4 3-4-2-4 2-4-3a10 10 0 0 1 8-4z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-white leading-none">{stats.partidos_jugados}</div>
                <div className="text-[6px] font-bold uppercase text-slate-500 tracking-wider">Partidos</div>
              </div>
            </div>

            {/* Goals */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-1 flex items-center gap-1.5 text-left">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-emerald-400 leading-none">{stats.goles}</div>
                <div className="text-[6px] font-bold uppercase text-slate-500 tracking-wider">Goles</div>
              </div>
            </div>

            {/* Yellow / Red Cards */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-1 flex items-center gap-1.5 text-left">
              <div className="flex gap-1 shrink-0">
                <div className="w-1.5 h-2.5 bg-yellow-400 rounded-xs" />
                <div className="w-1.5 h-2.5 bg-red-500 rounded-xs" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-white leading-none">
                  {stats.tarjetas_amarillas}<span className="text-slate-600 text-[9px] font-semibold">/</span>{stats.tarjetas_rojas}
                </div>
                <div className="text-[6px] font-bold uppercase text-slate-500 tracking-wider">Tarjetas</div>
              </div>
            </div>

            {/* Minutes */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-1 flex items-center gap-1.5 text-left">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-2.5 h-2.5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-amber-400 leading-none">{stats.minutos_jugados}</div>
                <div className="text-[6px] font-bold uppercase text-slate-500 tracking-wider">Minutos</div>
              </div>
            </div>
          </div>

          {/* Right panel: SVG Radar Spider-Web */}
          <div className="col-span-7 flex flex-col items-center justify-center relative pl-1 overflow-visible">
            <svg viewBox="0 0 200 210" className="w-full h-full drop-shadow-[0_2px_8px_rgba(245,158,11,0.15)] overflow-visible">
              <circle cx={cx} cy={cy} r={r} fill="url(#spiderGlow)" opacity="0.2" />
              
              <defs>
                <radialGradient id="spiderGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Hexagon Rings */}
              <polygon points={gridPoints(1.0)} fill="none" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="1.2" />
              <polygon points={gridPoints(0.7)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" strokeDasharray="1,1" />
              <polygon points={gridPoints(0.4)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" strokeDasharray="1,1" />

              {/* Connecting Spokes */}
              {angles.map((angle, idx) => {
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                return (
                  <line 
                    key={idx} 
                    x1={cx} 
                    y1={cy} 
                    x2={x} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.12)" 
                    strokeWidth="0.8" 
                    strokeDasharray="2,2" />
                );
              })}

              {/* Filled Attributes Area */}
              <polygon 
                points={valPoints} 
                fill="rgba(245, 158, 11, 0.22)" 
                stroke="#f59e0b" 
                strokeWidth="2.5" 
                strokeLinejoin="round"
                className="drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
              />

              {/* Vertices Score badges */}
              {renderVertexLabel(stats.ritmo ?? 50, 'RIT', cx, cy - r - 12, 'middle')}
              {renderVertexLabel(stats.regate ?? 50, 'REG', cx + r * Math.cos(angles[1]) + 18, cy + r * Math.sin(angles[1]) - 3, 'start')}
              {renderVertexLabel(stats.fisico ?? 50, 'FIS', cx + r * Math.cos(angles[2]) + 18, cy + r * Math.sin(angles[2]) + 10, 'start')}
              {renderVertexLabel(stats.defensa ?? 50, 'DEF', cx, cy + r + 18, 'middle')}
              {renderVertexLabel(stats.pase ?? 50, 'PAS', cx + r * Math.cos(angles[4]) - 18, cy + r * Math.sin(angles[4]) + 10, 'end')}
              {renderVertexLabel(stats.tiro ?? 50, 'TIR', cx + r * Math.cos(angles[5]) - 18, cy + r * Math.sin(angles[5]) - 3, 'end')}
            </svg>
          </div>
        </div>

        {/* Card Footer: Position Banner */}
        <div className="mt-3 border-t border-slate-900/60 pt-2 pb-0.5 text-center z-10">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-400 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent px-6 py-1 rounded-full border-x border-amber-500/10">
            {player.posicion}
          </span>
        </div>

      </div>
    </div>
  );
}

function getRatingLabel(val: number): string {
  switch (val) {
    case 0: return 'Muy deficiente';
    case 1: return 'Deficiente';
    case 2: return 'Mejorable';
    case 3: return 'Correcto';
    case 4: return 'Bueno';
    case 5: return 'Excelente';
    default: return 'Sin valorar';
  }
}

const calculateFifaStatsFromScouting = (position: string, scoutAttrs: Record<string, number>) => {
  const getAverageOfAttrs = (keys: string[]): number => {
    let sum = 0;
    let count = 0;
    keys.forEach(k => {
      if (typeof scoutAttrs[k] === 'number') {
        sum += scoutAttrs[k];
        count++;
      }
    });
    return count > 0 ? sum / count : 3; // default to 3/5 if no attributes
  };

  const ritmoKeys = ['Velocidad', 'Aceleración', 'Explosividad', 'Cambios de ritmo', 'Agilidad'];
  const tiroKeys = ['Definición', 'Disparo', 'Tiro', 'Remate', 'Finalización', 'Paradas de media/larga distancia', 'Uno contra uno con el portero'];
  const paseKeys = ['Pase', 'Pase corto', 'Pase largo', 'Calidad del pase', 'Pase medio', 'Centros', 'Cambio de orientación', 'Asociación', 'Último pase', 'Saque con mano', 'Saque con pie'];
  const regateKeys = ['Regate', 'Control orientado', 'Conducción', '1 vs 1', 'Desequilibrio', 'Uno contra uno', 'Juego con los pies', 'Visión', 'Creatividad', 'Primer toque'];
  const defensaKeys = ['Marcaje', 'Anticipación', 'Entradas', 'Interceptaciones', 'Coberturas', 'Defensa del área', 'Colocación', 'Lectura del juego', 'Blocaje', 'Desvíos'];
  const fisicoKeys = ['Resistencia', 'Fuerza', 'Potencia', 'Salto', 'Coordinación', 'Equilibrio', 'Agilidad'];

  const rAvg = getAverageOfAttrs(ritmoKeys);
  const tAvg = getAverageOfAttrs(tiroKeys);
  const pAvg = getAverageOfAttrs(paseKeys);
  const dAvg = getAverageOfAttrs(defensaKeys);
  const drAvg = getAverageOfAttrs(regateKeys);
  const fAvg = getAverageOfAttrs(fisicoKeys);

  const ritmo = Math.round(50 + rAvg * 9);
  const tiro = Math.round(50 + tAvg * 9);
  const pase = Math.round(50 + pAvg * 9);
  const regate = Math.round(50 + drAvg * 9);
  const defensa = Math.round(50 + dAvg * 9);
  const fisico = Math.round(50 + fAvg * 9);

  const rating_general = Math.round((ritmo + tiro + pase + regate + defensa + fisico) / 6);

  return {
    ritmo: Math.min(Math.max(ritmo, 1), 99),
    tiro: Math.min(Math.max(tiro, 1), 99),
    pase: Math.min(Math.max(pase, 1), 99),
    regate: Math.min(Math.max(regate, 1), 99),
    defensa: Math.min(Math.max(defensa, 1), 99),
    fisico: Math.min(Math.max(fisico, 1), 99),
    rating_general: Math.min(Math.max(rating_general, 1), 99)
  };
};

export default function Plantilla() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [scoutingSignedPlayers, setScoutingSignedPlayers] = useState<Player[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<TeamPlayer | null>(null);
  const [profileAttributes, setProfileAttributes] = useState<{ atributo: string; valor: number }[]>([]);
  const [playerToDelete, setPlayerToDelete] = useState<TeamPlayer | null>(null);
  
  // WhatsApp composer state
  const [whatsappModalPlayer, setWhatsappModalPlayer] = useState<TeamPlayer | null>(null);
  const [whatsappMessageText, setWhatsappMessageText] = useState('');
  
  // Print preview state
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printReportType, setPrintReportType] = useState<'FUT' | 'DOSSIER' | 'BOTH'>('FUT');
  
  // 3-evaluations state and period selector
  const [evaluations, setEvaluations] = useState<Record<string, Record<string, any>>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<'Septiembre' | 'Diciembre' | 'Mayo'>('Septiembre');
  const [comparePeriods, setComparePeriods] = useState<('Septiembre' | 'Diciembre' | 'Mayo')[]>(['Septiembre', 'Diciembre', 'Mayo']);

  const toggleComparePeriod = (period: 'Septiembre' | 'Diciembre' | 'Mayo') => {
    if (comparePeriods.includes(period)) {
      if (comparePeriods.length > 1) {
        setComparePeriods(comparePeriods.filter(p => p !== period));
      } else {
        toast.error('Debes tener al menos un período seleccionado para comparar.');
      }
    } else {
      setComparePeriods([...comparePeriods, period]);
    }
  };

  const getAttributeValueForPeriod = (playerId: string, period: 'Septiembre' | 'Diciembre' | 'Mayo', attrName: string) => {
    const periodEvalAttr = evaluations[playerId]?.[period]?.attributes?.[attrName];
    if (typeof periodEvalAttr === 'number') {
      return periodEvalAttr;
    }
    const baseAttr = profileAttributes.find(a => a.atributo === attrName);
    if (baseAttr) {
      return baseAttr.valor;
    }
    return 0;
  };

  const getPlayerComparisonData = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return [];

    const baseStats = getPlayerStats(player);
    const periods: ('Septiembre' | 'Diciembre' | 'Mayo')[] = ['Septiembre', 'Diciembre', 'Mayo'];

    return periods.map(p => {
      const evalData = evaluations[playerId]?.[p];
      if (evalData && evalData.stats) {
        return {
          name: p,
          'Rating General': evalData.stats.rating_general !== undefined ? evalData.stats.rating_general : baseStats.rating_general,
          'Ritmo': evalData.stats.ritmo !== undefined ? evalData.stats.ritmo : baseStats.ritmo,
          'Tiro': evalData.stats.tiro !== undefined ? evalData.stats.tiro : baseStats.tiro,
          'Pase': evalData.stats.pase !== undefined ? evalData.stats.pase : baseStats.pase,
          'Regate': evalData.stats.regate !== undefined ? evalData.stats.regate : baseStats.regate,
          'Defensa': evalData.stats.defensa !== undefined ? evalData.stats.defensa : baseStats.defensa,
          'Físico': evalData.stats.fisico !== undefined ? evalData.stats.fisico : baseStats.fisico,
        };
      }
      return {
        name: p,
        'Rating General': baseStats.rating_general,
        'Ritmo': baseStats.ritmo,
        'Tiro': baseStats.tiro,
        'Pase': baseStats.pase,
        'Regate': baseStats.regate,
        'Defensa': baseStats.defensa,
        'Físico': baseStats.fisico,
      };
    });
  };
  
  // Stats and FIFA attributes editing state
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [editableAttributes, setEditableAttributes] = useState<Record<string, number>>({});
  const [statsForm, setStatsForm] = useState({
    partidos_jugados: 14,
    minutos_jugados: 1120,
    goles: 9,
    asistencias: 5,
    tarjetas_amarillas: 2,
    tarjetas_rojas: 0,
    asistencia_entrenamientos: 93,
    ritmo: 85,
    tiro: 82,
    pase: 73,
    regate: 80,
    defensa: 34,
    fisico: 72,
    rating_general: 85
  });

  // Helper function to get player stats with realistic defaults based on position
  const getPlayerStats = (player: TeamPlayer) => {
    const pos = (player.posicion || 'DELANTERO').toUpperCase();
    const isGk = pos.includes('PORTERO') || pos.includes('GK') || pos.includes('GOALKEEPER');
    const isDf = pos.includes('DEFENSA') || pos.includes('CENTRAL') || pos.includes('LATERAL') || pos.includes('DFC') || pos.includes('DF');
    const isMf = pos.includes('MEDIO') || pos.includes('INTERIOR') || pos.includes('PUNTA') || pos.includes('MCO') || pos.includes('MC');
    
    // Retrieve real match and attendance session records for dynamic statistics aggregation
    const matchesKey = `team_matches_${selectedTeam}`;
    const sessionsKey = `team_sessions_${selectedTeam}`;
    const savedMatches = localStorage.getItem(matchesKey);
    const savedSessions = localStorage.getItem(sessionsKey);

    const teamMatches = savedMatches ? JSON.parse(savedMatches) : [];
    const teamSessions = savedSessions ? JSON.parse(savedSessions) : [];

    // 1. Calculate training attendance dynamically from real training sessions
    const trainingSessions = teamSessions.filter((s: any) => s.tipo === 'Entrenamiento');
    let dynamicAttendance = player.asistencia_entrenamientos ?? 93;

    if (trainingSessions.length > 0) {
      let sessionsWithPlayer = 0;
      let presentCount = 0;

      trainingSessions.forEach((s: any) => {
        const record = s.records?.find((r: any) => r.playerId === player.id);
        if (record) {
          sessionsWithPlayer += 1;
          if (
            record.status === 'Presente' || 
            record.status === 'Retraso' || 
            record.status === 'Justificado' || 
            record.status === 'Lesionado'
          ) {
            presentCount += 1;
          }
        }
      });

      if (sessionsWithPlayer > 0) {
        dynamicAttendance = Math.round((presentCount / sessionsWithPlayer) * 100);
      }
    }

    // 2. Calculate match statistics (matches played, minutes, goals, yellow cards, red cards)
    const finishedMatches = teamMatches.filter((m: any) => m.estado === 'Finalizado');
    const hasFinishedMatches = finishedMatches.some((m: any) => 
      m.estadisticas?.jugadoras_stats?.some((s: any) => s.playerId === player.id)
    );

    let partidos_jugados = player.partidos_jugados ?? 14;
    let minutos_jugados = player.minutos_jugados ?? (player.partidos_jugados ?? 14) * 82;
    let goles = player.goles ?? (isGk ? 0 : isDf ? 1 : isMf ? 3 : 9);
    let asistencias = player.asistencias ?? (isGk ? 0 : isDf ? 2 : isMf ? 6 : 4);
    let tarjetas_amarillas = player.tarjetas_amarillas ?? 2;
    let tarjetas_rojas = player.tarjetas_rojas ?? 0;

    if (hasFinishedMatches) {
      let playedCount = 0;
      let totalMin = 0;
      let totalGoles = 0;
      let totalAssists = 0;
      let totalYellows = 0;
      let totalReds = 0;

      finishedMatches.forEach((m: any) => {
        const pStat = m.estadisticas?.jugadoras_stats?.find((s: any) => s.playerId === player.id);
        if (pStat) {
          if (pStat.minutos > 0 || pStat.titular || pStat.suplente) {
            playedCount += 1;
            totalMin += pStat.minutos || 0;
            totalGoles += pStat.goles_metidos || 0;
            totalAssists += pStat.asistencias || 0;
            totalYellows += pStat.tarjetas_amarillas || 0;
            totalReds += pStat.tarjetas_rojas || 0;
          }
        }
      });

      partidos_jugados = playedCount;
      minutos_jugados = totalMin;
      goles = totalGoles;
      asistencias = totalAssists;
      tarjetas_amarillas = totalYellows;
      tarjetas_rojas = totalReds;
    }

    return {
      partidos_jugados,
      minutos_jugados,
      goles,
      asistencias,
      tarjetas_amarillas,
      tarjetas_rojas,
      asistencia_entrenamientos: dynamicAttendance,
      ritmo: player.ritmo ?? (isGk ? 68 : isDf ? 72 : isMf ? 78 : 86),
      tiro: player.tiro ?? (isGk ? 15 : isDf ? 45 : isMf ? 73 : 82),
      pase: player.pase ?? (isGk ? 62 : isDf ? 65 : isMf ? 82 : 74),
      regate: player.regate ?? (isGk ? 55 : isDf ? 64 : isMf ? 80 : 83),
      defensa: player.defensa ?? (isGk ? 84 : isDf ? 83 : isMf ? 68 : 34),
      fisico: player.fisico ?? (isGk ? 76 : isDf ? 82 : isMf ? 74 : 72),
      rating_general: player.rating_general ?? (isGk ? 78 : isDf ? 77 : isMf ? 80 : 82),
    };
  };

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

    const evaluationsKey = `team_evaluations_${selectedTeam}`;
    const savedEvaluations = localStorage.getItem(evaluationsKey);
    if (savedEvaluations) {
      setEvaluations(JSON.parse(savedEvaluations));
    } else {
      setEvaluations({});
    }
    
    // Load signed players from scouting database
    fetchSignedScoutingPlayers();

    // Background pre-fetch matches and sessions from Supabase to sync the player stats
    const syncData = async () => {
      try {
        const { data: matchesData } = await supabase
          .from('team_matches')
          .select('*')
          .eq('team', selectedTeam);
        if (matchesData) {
          const formatted = matchesData.map(item => ({
            id: item.id,
            rival: item.rival,
            fecha: item.fecha,
            hora: item.hora,
            tipo: item.tipo,
            competicion: item.competicion,
            estado: item.estado,
            goles_favor: item.goles_favor !== null ? item.goles_favor : undefined,
            goles_contra: item.goles_contra !== null ? item.goles_contra : undefined,
            acta: item.acta || undefined,
            estadisticas: item.estadisticas || undefined
          }));
          localStorage.setItem(`team_matches_${selectedTeam}`, JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn("Failed background matches sync in Plantilla:", err);
      }

      try {
        const { data: sessionsData } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('team', selectedTeam);
        if (sessionsData) {
          const formatted = sessionsData.map(item => ({
            id: item.id,
            fecha: item.fecha,
            tipo: item.tipo,
            descripcion: item.descripcion || '',
            records: item.records || [],
            tareas: item.tareas || [],
            archivos: item.archivos || []
          }));
          localStorage.setItem(`team_sessions_${selectedTeam}`, JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn("Failed background sessions sync in Plantilla:", err);
      }
    };
    syncData();
  }, [selectedTeam]);

  // Synchronize statistics form and scouting attributes when player profile is selected
  useEffect(() => {
    if (selectedPlayerProfile) {
      setStatsForm(getPlayerStats(selectedPlayerProfile));
      setIsEditingStats(false);

      // Fetch scouting attributes from the database for the selected player
      const fetchProfileAttributes = async () => {
        try {
          // Find the player in scoutingSignedPlayers by ID or name to get the correct player_id in scouting database
          let dbPlayerId = selectedPlayerProfile.id;
          const match = scoutingSignedPlayers.find(p => 
            p.id === selectedPlayerProfile.id || 
            `${p.nombre.trim()} ${p.apellidos.trim()}`.toLowerCase() === `${selectedPlayerProfile.nombre.trim()} ${selectedPlayerProfile.apellidos.trim()}`.toLowerCase()
          );
          if (match) {
            dbPlayerId = match.id;
          }

          const { data, error } = await supabase
            .from('player_attributes')
            .select('atributo, valor')
            .eq('player_id', dbPlayerId);

          if (!error && data) {
            setProfileAttributes(data);
            
            // Reconstruct evaluations from prefixed attributes in Supabase
            const baseAttrMap: Record<string, number> = {};
            const cloudEvals: Record<string, Record<string, any>> = { ...evaluations };
            if (!cloudEvals[selectedPlayerProfile.id]) {
              cloudEvals[selectedPlayerProfile.id] = {
                Septiembre: { stats: {}, attributes: {} },
                Diciembre: { stats: {}, attributes: {} },
                Mayo: { stats: {}, attributes: {} }
              };
            }

            data.forEach(item => {
              const name = item.atributo;
              const val = item.valor;

              if (name.includes(':')) {
                const parts = name.split(':');
                const period = parts[0];
                const attrName = parts[1];

                if (period === 'Septiembre' || period === 'Diciembre' || period === 'Mayo') {
                  if (!cloudEvals[selectedPlayerProfile.id][period]) {
                    cloudEvals[selectedPlayerProfile.id][period] = { stats: {}, attributes: {} };
                  }
                  
                  const isStatField = ['partidos_jugados', 'minutos_jugados', 'goles', 'asistencias', 'tarjetas_amarillas', 'tarjetas_rojas', 'asistencia_entrenamientos', 'ritmo', 'tiro', 'pase', 'regate', 'defensa', 'fisico', 'rating_general'].includes(attrName);
                  if (isStatField) {
                    cloudEvals[selectedPlayerProfile.id][period].stats[attrName] = val;
                  } else {
                    cloudEvals[selectedPlayerProfile.id][period].attributes[attrName] = val;
                  }
                }
              } else {
                baseAttrMap[name] = val;
              }
            });

            // Update local storage and state with synced evaluations
            setEvaluations(cloudEvals);
            localStorage.setItem(`team_evaluations_${selectedTeam}`, JSON.stringify(cloudEvals));

            // Load active period data
            const activeBaseStats = getPlayerStats(selectedPlayerProfile);
            const periodEval = cloudEvals[selectedPlayerProfile.id]?.[selectedPeriod];
            
            if (periodEval && (Object.keys(periodEval.stats).length > 0 || Object.keys(periodEval.attributes).length > 0)) {
              setStatsForm({
                ...activeBaseStats,
                ...periodEval.stats
              });
              setEditableAttributes({
                ...baseAttrMap,
                ...periodEval.attributes
              });
            } else {
              setStatsForm(activeBaseStats);
              setEditableAttributes(baseAttrMap);
            }
          } else {
            setProfileAttributes([]);
            setEditableAttributes({});
          }
        } catch (err) {
          console.error("Error fetching player profile attributes", err);
          setProfileAttributes([]);
          setEditableAttributes({});
        }
      };

      fetchProfileAttributes();
    } else {
      setProfileAttributes([]);
    }
  }, [selectedPlayerProfile, scoutingSignedPlayers]);

  // Handle period change and load relevant stats and attributes
  useEffect(() => {
    if (selectedPlayerProfile) {
      const activeBaseStats = getPlayerStats(selectedPlayerProfile);
      const baseAttrMap: Record<string, number> = {};
      profileAttributes.forEach(item => {
        if (!item.atributo.includes(':')) {
          baseAttrMap[item.atributo] = item.valor;
        }
      });

      const periodEval = evaluations[selectedPlayerProfile.id]?.[selectedPeriod];
      if (periodEval && (Object.keys(periodEval.stats).length > 0 || Object.keys(periodEval.attributes).length > 0)) {
        setStatsForm({
          ...activeBaseStats,
          ...periodEval.stats
        });
        setEditableAttributes({
          ...baseAttrMap,
          ...periodEval.attributes
        });
      } else {
        setStatsForm(activeBaseStats);
        setEditableAttributes(baseAttrMap);
      }
    }
  }, [selectedPeriod]);

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

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Sincronizando plantilla, partidos y asistencia con Supabase...');
    try {
      // 1. Sync Players
      const updatedPlayers = [...players];
      let playerChanges = false;
      let playerSuccess = 0;
      let playerError = 0;

      for (let i = 0; i < updatedPlayers.length; i++) {
        const player = updatedPlayers[i];
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(player.id);
        
        let targetId = player.id;
        if (!isUuid) {
          targetId = crypto.randomUUID();
          updatedPlayers[i] = { ...player, id: targetId };
          playerChanges = true;
        }

        const playerPayload = {
          id: targetId,
          nombre: player.nombre,
          apellidos: player.apellidos,
          posicion: player.posicion,
          dorsal: player.dorsal || null,
          lateralidad: player.lateralidad || 'Derecho',
          anio_nacimiento: player.anio_nacimiento ? parseInt(player.anio_nacimiento as any) : null,
          telefono: player.telefono || null,
          email: player.email || null,
          foto_url: player.foto_url || null,
          estado: 'Fichado',
          equipo_asignado: selectedTeam
        };

        const { error } = await supabase
          .from('players')
          .upsert(playerPayload);

        if (error) {
          console.error(`Error syncing player ${player.nombre}:`, error);
          playerError++;
        } else {
          playerSuccess++;
        }
      }

      if (playerChanges) {
        saveRoster(updatedPlayers);
      }

      // 2. Sync Matches
      const matchesKey = `team_matches_${selectedTeam}`;
      const savedMatches = localStorage.getItem(matchesKey);
      let matchesSuccess = 0;
      let matchesError = 0;
      let matchesChanges = false;

      if (savedMatches) {
        const localMatches = JSON.parse(savedMatches);
        const updatedMatches = [...localMatches];

        for (let i = 0; i < updatedMatches.length; i++) {
          const match = updatedMatches[i];
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match.id);
          
          let targetId = match.id;
          if (!isUuid) {
            targetId = crypto.randomUUID();
            updatedMatches[i] = { ...match, id: targetId };
            matchesChanges = true;
          }

          const matchPayload = {
            id: targetId,
            team: selectedTeam,
            rival: match.rival,
            fecha: match.fecha,
            hora: match.hora,
            tipo: match.tipo,
            competicion: match.competicion,
            estado: match.estado,
            goles_favor: match.goles_favor !== undefined ? match.goles_favor : null,
            goles_contra: match.goles_contra !== undefined ? match.goles_contra : null,
            acta: match.acta || null,
            estadisticas: match.estadisticas || {}
          };

          const { error } = await supabase
            .from('team_matches')
            .upsert(matchPayload);

          if (error) {
            console.error(`Error syncing match with ${match.rival}:`, error);
            matchesError++;
          } else {
            matchesSuccess++;
          }
        }

        if (matchesChanges) {
          localStorage.setItem(matchesKey, JSON.stringify(updatedMatches));
        }
      }

      // 3. Sync Attendance Sessions
      const sessionsKey = `team_sessions_${selectedTeam}`;
      const savedSessions = localStorage.getItem(sessionsKey);
      let sessionsSuccess = 0;
      let sessionsError = 0;
      let sessionsChanges = false;

      if (savedSessions) {
        const localSessions = JSON.parse(savedSessions);
        const updatedSessions = [...localSessions];

        for (let i = 0; i < updatedSessions.length; i++) {
          const session = updatedSessions[i];
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.id);
          
          let targetId = session.id;
          if (!isUuid) {
            targetId = crypto.randomUUID();
            updatedSessions[i] = { ...session, id: targetId };
            sessionsChanges = true;
          }

          const sessionPayload = {
            id: targetId,
            team: selectedTeam,
            fecha: session.fecha,
            tipo: session.tipo,
            descripcion: session.descripcion || null,
            records: session.records || [],
            tareas: session.tareas || [],
            archivos: session.archivos || []
          };

          const { error } = await supabase
            .from('attendance_sessions')
            .upsert(sessionPayload);

          if (error) {
            console.error(`Error syncing session from ${session.fecha}:`, error);
            sessionsError++;
          } else {
            sessionsSuccess++;
          }
        }

        if (sessionsChanges) {
          localStorage.setItem(sessionsKey, JSON.stringify(updatedSessions));
        }
      }

      // Final Feedback
      if (playerError === 0 && matchesError === 0 && sessionsError === 0) {
        toast.success(`Sincronización completa: ${playerSuccess} jugadoras, ${matchesSuccess} partidos y ${sessionsSuccess} sesiones subidos a Supabase.`, { id: toastId });
      } else {
        toast.warning(`Sincronización parcial: ${playerSuccess} jugadoras (${playerError} errores), ${matchesSuccess} partidos (${matchesError} errores), ${sessionsSuccess} sesiones (${sessionsError} errores) subidos.`, { id: toastId });
      }

      // Refresh DB data
      fetchSignedScoutingPlayers();
    } catch (err: any) {
      console.error("Critical error during sync", err);
      toast.error("Error crítico durante la sincronización: " + (err.message || err), { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const saveRoster = (updated: TeamPlayer[]) => {
    setPlayers(updated);
    localStorage.setItem(`team_roster_${selectedTeam}`, JSON.stringify(updated));
  };

  const handleSavePlayerStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerProfile) return;

    try {
      // 1. Calculate FIFA attributes from the 0-5 scouting ratings in editableAttributes
      const fifaStats = calculateFifaStatsFromScouting(selectedPlayerProfile.posicion, editableAttributes);

      // 2. Update the evaluations local state for the selected player and selected period
      const updatedEvals = {
        ...evaluations,
        [selectedPlayerProfile.id]: {
          ...(evaluations[selectedPlayerProfile.id] || {}),
          [selectedPeriod]: {
            stats: {
              partidos_jugados: statsForm.partidos_jugados,
              minutos_jugados: statsForm.minutos_jugados,
              goles: statsForm.goles,
              asistencias: statsForm.asistencias,
              tarjetas_amarillas: statsForm.tarjetas_amarillas,
              tarjetas_rojas: statsForm.tarjetas_rojas,
              asistencia_entrenamientos: statsForm.asistencia_entrenamientos,
              ...fifaStats // ritmo, tiro, pase, regate, defensa, fisico, rating_general
            },
            attributes: editableAttributes
          }
        }
      };
      setEvaluations(updatedEvals);
      localStorage.setItem(`team_evaluations_${selectedTeam}`, JSON.stringify(updatedEvals));

      // 3. Prepare the player object with season stats and calculated FIFA attributes
      const updatedPlayers = players.map(p => {
        if (p.id === selectedPlayerProfile.id) {
          const updated = {
            ...p,
            partidos_jugados: statsForm.partidos_jugados,
            minutos_jugados: statsForm.minutos_jugados,
            goles: statsForm.goles,
            asistencias: statsForm.asistencias,
            tarjetas_amarillas: statsForm.tarjetas_amarillas,
            tarjetas_rojas: statsForm.tarjetas_rojas,
            asistencia_entrenamientos: statsForm.asistencia_entrenamientos,
            ...fifaStats // ritmo, tiro, pase, regate, defensa, fisico, rating_general
          };
          // Update selectedPlayerProfile state so the UI reflects the saved values
          setSelectedPlayerProfile(updated);
          return updated;
        }
        return p;
      });

      // 4. Save roster to local storage
      saveRoster(updatedPlayers);

      // 5. Save 0-5 scouting attributes and evaluations to Supabase
      let dbPlayerId = selectedPlayerProfile.id;
      const match = scoutingSignedPlayers.find(p => 
        p.id === selectedPlayerProfile.id || 
        `${p.nombre.trim()} ${p.apellidos.trim()}`.toLowerCase() === `${selectedPlayerProfile.nombre.trim()} ${selectedPlayerProfile.apellidos.trim()}`.toLowerCase()
      );
      if (match) {
        dbPlayerId = match.id;
      } else {
        // Create the player in Supabase so we have a valid record to attach attributes to
        try {
          const { data: insertedPlayer, error: insertError } = await supabase
            .from('players')
            .insert({
              id: selectedPlayerProfile.id,
              nombre: selectedPlayerProfile.nombre,
              apellidos: selectedPlayerProfile.apellidos,
              posicion: selectedPlayerProfile.posicion,
              dorsal: selectedPlayerProfile.dorsal || null,
              lateralidad: selectedPlayerProfile.lateralidad || 'Derecho',
              anio_nacimiento: selectedPlayerProfile.anio_nacimiento ? parseInt(selectedPlayerProfile.anio_nacimiento as any) : null,
              telefono: selectedPlayerProfile.telefono || null,
              email: selectedPlayerProfile.email || null,
              foto_url: selectedPlayerProfile.foto_url || null,
              estado: 'Fichado',
              equipo_asignado: selectedTeam
            })
            .select()
            .single();

          if (!insertError && insertedPlayer) {
            dbPlayerId = insertedPlayer.id;
          }
        } catch (err) {
          console.warn("Could not auto-provision player in scouting DB:", err);
        }
      }

      // Prepare attributes payload
      const position = selectedPlayerProfile.posicion;
      // Get all specific and common attributes for this position
      const specific = (POSITION_STRUCTURED_ATTRIBUTES[position] || []).flatMap(g => g.items);
      const common = COMMON_ATTRIBUTES.flatMap(g => g.items);
      const allAttrs = Array.from(new Set([...specific, ...common]));

      // Standard base attributes payload
      const basePayloads = allAttrs.map(attr => ({
        player_id: dbPlayerId,
        atributo: attr,
        valor: typeof editableAttributes[attr] === 'number' ? editableAttributes[attr] : 0
      }));

      // Gather all evaluation period payloads (attributes & stats)
      const playerEvals = updatedEvals[selectedPlayerProfile.id] || {};
      const evalPayloads: any[] = [];
      const statFields = ['partidos_jugados', 'minutos_jugados', 'goles', 'asistencias', 'tarjetas_amarillas', 'tarjetas_rojas', 'asistencia_entrenamientos', 'ritmo', 'tiro', 'pase', 'regate', 'defensa', 'fisico', 'rating_general'];

      (['Septiembre', 'Diciembre', 'Mayo'] as const).forEach(p => {
        const pData = playerEvals[p];
        if (pData) {
          allAttrs.forEach(attr => {
            const val = pData.attributes?.[attr];
            if (val !== undefined) {
              evalPayloads.push({
                player_id: dbPlayerId,
                atributo: `${p}:${attr}`,
                valor: val
              });
            }
          });
          statFields.forEach(field => {
            const val = pData.stats?.[field];
            if (val !== undefined) {
              evalPayloads.push({
                player_id: dbPlayerId,
                atributo: `${p}:${field}`,
                valor: val
              });
            }
          });
        }
      });

      const combinedPayloads = [...basePayloads, ...evalPayloads];

      // Delete existing attributes for clean write
      await supabase.from('player_attributes').delete().eq('player_id', dbPlayerId);

      // Save to Supabase
      const { error: attrError } = await supabase
        .from('player_attributes')
        .upsert(combinedPayloads);

      if (attrError) {
        console.error("Error upserting player attributes in Plantilla:", attrError);
        toast.warning("Estadísticas guardadas en local, pero hubo un problema al sincronizar con Supabase.");
      } else {
        toast.success(`Métricas de ${selectedPlayerProfile.nombre} del periodo ${selectedPeriod} guardadas con éxito.`);
        // Refresh local profile attributes state
        setProfileAttributes(combinedPayloads);
      }

      setIsEditingStats(false);
      // Refresh database records
      fetchSignedScoutingPlayers();
    } catch (err: any) {
      console.error("Error saving player stats", err);
      toast.error("Error al guardar las estadísticas: " + (err.message || err));
    }
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

        <div className="w-full sm:w-auto flex flex-wrap gap-2">
          <Button 
            onClick={handleSyncToSupabase}
            disabled={isSyncing}
            variant="outline"
            className="flex-1 sm:flex-none text-xs font-bold uppercase tracking-wider border-blue-500/30 hover:bg-blue-950/20 text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <Cloud className={cn("w-4 h-4 text-blue-400 animate-pulse", isSyncing && "animate-spin")} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Cloud'}</span>
          </Button>

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

              {/* PERIODO DE VALORACIÓN SELECTOR */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex flex-col text-center sm:text-left">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none">Periodo de Valoración</span>
                  <p className="text-xs text-white font-bold uppercase mt-1">Sinfonía de Evolución Anual</p>
                </div>
                
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 w-full sm:w-auto">
                  {(['Septiembre', 'Diciembre', 'Mayo'] as const).map(period => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setSelectedPeriod(period)}
                      className={cn(
                        "flex-1 sm:flex-none text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all",
                        selectedPeriod === period 
                          ? "bg-amber-500 text-slate-950 shadow-md" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data sheets grid */}
              {(() => {
                const baseStats = getPlayerStats(selectedPlayerProfile);
                const periodEval = evaluations[selectedPlayerProfile.id]?.[selectedPeriod];
                const currentStats = (periodEval && periodEval.stats && Object.keys(periodEval.stats).length > 0)
                  ? { ...baseStats, ...periodEval.stats }
                  : baseStats;
                return isEditingStats ? (
                  <form onSubmit={handleSavePlayerStats} className="space-y-4 text-left w-full">
                    <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                      <h5 className="text-[11px] text-blue-400 font-extrabold uppercase tracking-wider border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span>Estadísticas Oficiales de Temporada</span>
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Partidos Jugados</label>
                          <input 
                            type="number" 
                            min="0"
                            value={statsForm.partidos_jugados}
                            onChange={(e) => setStatsForm({...statsForm, partidos_jugados: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Minutos Jugados</label>
                          <input 
                            type="number" 
                            min="0"
                            value={statsForm.minutos_jugados}
                            onChange={(e) => setStatsForm({...statsForm, minutos_jugados: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Goles Marcados</label>
                          <input 
                            type="number" 
                            min="0"
                            value={statsForm.goles}
                            onChange={(e) => setStatsForm({...statsForm, goles: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Asistencias</label>
                          <input 
                            type="number" 
                            min="0"
                            value={statsForm.asistencias}
                            onChange={(e) => setStatsForm({...statsForm, asistencias: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Tarjetas Amarillas</label>
                          <input 
                            type="number" 
                            min="0"
                            value={statsForm.tarjetas_amarillas}
                            onChange={(e) => setStatsForm({...statsForm, tarjetas_amarillas: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Tarjetas Rojas / Expulsiones</label>
                          <input 
                            type="number" 
                            min="0"
                            value={statsForm.tarjetas_rojas}
                            onChange={(e) => setStatsForm({...statsForm, tarjetas_rojas: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Asistencia Entrenamientos (%)</label>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={statsForm.asistencia_entrenamientos}
                            onChange={(e) => setStatsForm({...statsForm, asistencia_entrenamientos: parseInt(e.target.value) || 0})}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Scouting attributes depending on player position */}
                    {(() => {
                      const specificGroups = POSITION_STRUCTURED_ATTRIBUTES[selectedPlayerProfile.posicion] || [];
                      return (
                        <>
                          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-4">
                            <h5 className="text-[11px] text-amber-500 font-extrabold uppercase tracking-wider border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-amber-500" />
                              <span>Valoración Técnica de la Demarcación ({selectedPlayerProfile.posicion})</span>
                            </h5>
                            <div className="space-y-6 text-left">
                              {specificGroups.map((group) => (
                                <div key={group.category} className="space-y-3">
                                  <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 inline-block">
                                    {group.category}
                                  </h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {group.items.map((attr) => (
                                      <div key={attr} className="space-y-2 bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/40">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{attr}</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className={cn(
                                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                                              (editableAttributes[attr] || 0) === 0 && "bg-red-950/30 border-red-500/20 text-red-400",
                                              (editableAttributes[attr] || 0) === 1 && "bg-red-500/10 border-red-500/20 text-red-350",
                                              (editableAttributes[attr] || 0) === 2 && "bg-orange-500/10 border-orange-500/20 text-orange-400",
                                              (editableAttributes[attr] || 0) === 3 && "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
                                              (editableAttributes[attr] || 0) === 4 && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                                              (editableAttributes[attr] || 0) === 5 && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                            )}>
                                              {getRatingLabel(editableAttributes[attr] || 0)}
                                            </span>
                                            <span className={cn(
                                              "text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center",
                                              (editableAttributes[attr] || 0) === 0 && "bg-red-700 text-white",
                                              (editableAttributes[attr] || 0) === 1 && "bg-red-500 text-white",
                                              (editableAttributes[attr] || 0) === 2 && "bg-orange-500 text-white",
                                              (editableAttributes[attr] || 0) === 3 && "bg-yellow-500 text-slate-950",
                                              (editableAttributes[attr] || 0) === 4 && "bg-blue-500 text-white",
                                              (editableAttributes[attr] || 0) === 5 && "bg-emerald-600 text-white"
                                            )}>
                                              {editableAttributes[attr] || 0}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex justify-between gap-1">
                                          {[0, 1, 2, 3, 4, 5].map((val) => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setEditableAttributes(prev => ({ ...prev, [attr]: val }))}
                                              className={cn(
                                                "flex-1 h-7 rounded-md flex items-center justify-center text-[10px] font-black transition-all border",
                                                (editableAttributes[attr] || 0) === val 
                                                  ? cn(
                                                      "text-white shadow-sm",
                                                      val === 0 && "bg-red-700 border-red-650",
                                                      val === 1 && "bg-red-500 border-red-400",
                                                      val === 2 && "bg-orange-500 border-orange-400",
                                                      val === 3 && "bg-yellow-500 border-yellow-400 text-slate-950",
                                                      val === 4 && "bg-blue-500 border-blue-400",
                                                      val === 5 && "bg-emerald-600 border-emerald-500"
                                                    )
                                                  : "bg-slate-900 border-slate-850 text-slate-500 hover:bg-slate-800"
                                              )}
                                            >
                                              {val}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-4">
                            <h5 className="text-[11px] text-blue-400 font-extrabold uppercase tracking-wider border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-blue-500" />
                              <span>Aspectos Comunes a Todas las Posiciones</span>
                            </h5>
                            <div className="space-y-6 text-left">
                              {COMMON_ATTRIBUTES.map((group) => (
                                <div key={group.category} className="space-y-3">
                                  <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 inline-block">
                                    {group.category}
                                  </h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {group.items.map((attr) => (
                                      <div key={attr} className="space-y-2 bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/40">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{attr}</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className={cn(
                                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                                              (editableAttributes[attr] || 0) === 0 && "bg-red-950/30 border-red-500/20 text-red-400",
                                              (editableAttributes[attr] || 0) === 1 && "bg-red-500/10 border-red-500/20 text-red-350",
                                              (editableAttributes[attr] || 0) === 2 && "bg-orange-500/10 border-orange-500/20 text-orange-400",
                                              (editableAttributes[attr] || 0) === 3 && "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
                                              (editableAttributes[attr] || 0) === 4 && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                                              (editableAttributes[attr] || 0) === 5 && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                            )}>
                                              {getRatingLabel(editableAttributes[attr] || 0)}
                                            </span>
                                            <span className={cn(
                                              "text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center",
                                              (editableAttributes[attr] || 0) === 0 && "bg-red-700 text-white",
                                              (editableAttributes[attr] || 0) === 1 && "bg-red-500 text-white",
                                              (editableAttributes[attr] || 0) === 2 && "bg-orange-500 text-white",
                                              (editableAttributes[attr] || 0) === 3 && "bg-yellow-500 text-slate-950",
                                              (editableAttributes[attr] || 0) === 4 && "bg-blue-500 text-white",
                                              (editableAttributes[attr] || 0) === 5 && "bg-emerald-600 text-white"
                                            )}>
                                              {editableAttributes[attr] || 0}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex justify-between gap-1">
                                          {[0, 1, 2, 3, 4, 5].map((val) => (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setEditableAttributes(prev => ({ ...prev, [attr]: val }))}
                                              className={cn(
                                                "flex-1 h-7 rounded-md flex items-center justify-center text-[10px] font-black transition-all border",
                                                (editableAttributes[attr] || 0) === val 
                                                  ? cn(
                                                      "text-white shadow-sm",
                                                      val === 0 && "bg-red-700 border-red-650",
                                                      val === 1 && "bg-red-500 border-red-400",
                                                      val === 2 && "bg-orange-500 border-orange-400",
                                                      val === 3 && "bg-yellow-500 border-yellow-400 text-slate-950",
                                                      val === 4 && "bg-blue-500 border-blue-400",
                                                      val === 5 && "bg-emerald-600 border-emerald-500"
                                                    )
                                                  : "bg-slate-900 border-slate-850 text-slate-500 hover:bg-slate-800"
                                              )}
                                            >
                                              {val}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditingStats(false)}
                        className="text-xs border-slate-800 text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold uppercase rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                      >
                        <Save className="w-4 h-4" />
                        <span>Guardar Estadísticas</span>
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 w-full text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: General data & Season stats */}
                      <div className="space-y-4">
                        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2">
                          <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-900 pb-1.5 flex justify-between items-center">
                            <span>Especificaciones Personales</span>
                            <span className="text-slate-600 font-semibold">DORSAL #{selectedPlayerProfile.dorsal}</span>
                          </h5>
                          <div className="text-xs space-y-1.5 text-slate-300">
                            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Año Nacimiento:</span> <strong className="text-white">{selectedPlayerProfile.anio_nacimiento || 'N/A'}</strong></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Lateralidad:</span> <strong className="text-white">{selectedPlayerProfile.lateralidad || 'Derecho'}</strong></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Teléfono:</span> <strong className="text-white">{selectedPlayerProfile.telefono || 'No registrado'}</strong></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Email:</span> <strong className="text-white truncate max-w-[150px]">{selectedPlayerProfile.email || 'No registrado'}</strong></div>
                          </div>
                        </div>

                        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                            <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-blue-400" />
                              <span>Estadísticas de Temporada</span>
                            </h5>
                            <button 
                              onClick={() => {
                                setStatsForm(currentStats);
                                setIsEditingStats(true);
                              }}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/10"
                            >
                              <Edit className="w-2.5 h-2.5" />
                              <span>Editar</span>
                            </button>
                          </div>
                          <div className="text-xs space-y-1.5 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Partidos Disputados:</span> 
                              <strong className="text-white">{currentStats.partidos_jugados} partidos</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Minutos Jugados:</span>
                              </span> 
                              <strong className="text-white">{currentStats.minutos_jugados} min</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Goles Convertidos:</span> 
                              <strong className="text-emerald-400 font-extrabold">{currentStats.goles} goles</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Asistencias de Gol:</span> 
                              <strong className="text-blue-400">{currentStats.asistencias} asistencias</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm inline-block" />
                                <span>Tarjetas Amarillas:</span>
                              </span> 
                              <strong className="text-yellow-400">{currentStats.tarjetas_amarillas} amarillas</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                <span className="w-2.5 h-3.5 bg-red-500 rounded-sm inline-block" />
                                <span>Expulsiones / Rojas:</span>
                              </span> 
                              <strong className={currentStats.tarjetas_rojas > 0 ? "text-red-500 font-extrabold" : "text-slate-400"}>{currentStats.tarjetas_rojas} rojas</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Asistencia Entrenamientos:</span> 
                              <strong className="text-amber-400">{currentStats.asistencia_entrenamientos}% de las sesiones</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Gorgeous FIFA Ultimate Team Style Card Preview */}
                      <div className="flex flex-col items-center justify-center bg-slate-950/30 border border-slate-850 p-4 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-2 right-2 z-10">
                          <button 
                            onClick={() => {
                              setStatsForm(currentStats);
                              setIsEditingStats(true);
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-[10px] uppercase px-2.5 py-1 rounded-xl flex items-center gap-1"
                          >
                            <Award className="w-3 h-3 text-amber-500" />
                            <span>Editar Atributos</span>
                          </button>
                        </div>
                        
                        {/* Golden FIFA Ultimate Team Card visual */}
                        <div className="w-52 h-80 bg-gradient-to-b from-amber-200/90 via-yellow-100/80 to-amber-300/90 border-4 border-amber-400/80 rounded-[1.75rem] p-3 flex flex-col justify-between shadow-2xl relative text-slate-950 select-none transform transition-transform group-hover:scale-[1.02] duration-200">
                          <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent pointer-events-none" />
                          <div className="flex justify-between items-start mt-1">
                            {/* Rating / Position */}
                            <div className="flex flex-col items-center leading-none mt-1">
                              <span className="text-3xl font-extrabold font-mono tracking-tight text-amber-950">{currentStats.rating_general}</span>
                              <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider mt-0.5">
                                {selectedPlayerProfile.posicion.substring(0, 3)}
                              </span>
                              <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-[6px] border border-amber-400/50 mt-3 shadow">
                                UDLP
                              </div>
                            </div>
                            
                            {/* Cutout Photo */}
                            <div className="w-24 h-24 bg-gradient-to-b from-amber-100/20 to-amber-300/40 border border-amber-300/30 rounded-xl overflow-hidden flex items-center justify-center shadow-inner relative">
                              {selectedPlayerProfile.foto_url ? (
                                <img src={selectedPlayerProfile.foto_url} alt={selectedPlayerProfile.nombre} className="w-full h-full object-cover scale-105" />
                              ) : (
                                <Users className="w-10 h-10 text-amber-900/30" />
                              )}
                            </div>
                          </div>

                          <div className="text-center mt-1 border-b border-amber-950/20 pb-1">
                            <h4 className="text-xs font-black uppercase tracking-tight text-amber-950 truncate">
                              {selectedPlayerProfile.nombre}
                            </h4>
                          </div>

                          {/* 6 Core attributes */}
                          <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[9px] px-1 pb-1">
                            <div className="flex justify-between border-b border-amber-950/10 py-0.5">
                              <span className="text-amber-900/80 font-semibold">RIT</span>
                              <strong className="text-slate-950 font-mono font-bold">{currentStats.ritmo}</strong>
                            </div>
                            <div className="flex justify-between border-b border-amber-950/10 py-0.5">
                              <span className="text-amber-900/80 font-semibold">REG</span>
                              <strong className="text-slate-950 font-mono font-bold">{currentStats.regate}</strong>
                            </div>
                            <div className="flex justify-between border-b border-amber-950/10 py-0.5">
                              <span className="text-amber-900/80 font-semibold">TIR</span>
                              <strong className="text-slate-950 font-mono font-bold">{currentStats.tiro}</strong>
                            </div>
                            <div className="flex justify-between border-b border-amber-950/10 py-0.5">
                              <span className="text-amber-900/80 font-semibold">DEF</span>
                              <strong className="text-slate-950 font-mono font-bold">{currentStats.defensa}</strong>
                            </div>
                            <div className="flex justify-between border-b border-amber-950/10 py-0.5">
                              <span className="text-amber-900/80 font-semibold">PAS</span>
                              <strong className="text-slate-950 font-mono font-bold">{currentStats.pase}</strong>
                            </div>
                            <div className="flex justify-between border-b border-amber-950/10 py-0.5">
                              <span className="text-amber-900/80 font-semibold">FIS</span>
                              <strong className="text-slate-950 font-mono font-bold">{currentStats.fisico}</strong>
                            </div>
                          </div>

                          <div className="text-[6px] font-bold text-amber-800 text-center uppercase tracking-widest leading-none pb-1">
                            U.D. LA POVEDA INFORME
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scouting Evaluations Panel */}
                    <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-4 mt-4 text-left">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h5 className="text-[11px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-500" />
                          <span>Valoraciones de Captación y Scouting de {selectedPeriod} ({selectedPlayerProfile.posicion})</span>
                        </h5>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Escala 0-5</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
                        {/* Specific attributes of the demarcation */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider pb-0.5 border-b border-slate-800/60 block">Específicos</span>
                          {(POSITION_STRUCTURED_ATTRIBUTES[selectedPlayerProfile.posicion] || []).map(group => {
                            const groupAttrs = group.items.map(name => ({
                              atributo: name,
                              valor: typeof editableAttributes[name] === 'number' ? editableAttributes[name] : 0
                            }));
                            return (
                              <div key={group.category} className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest block">{group.category}</span>
                                <div className="space-y-1.5">
                                  {groupAttrs.map(attr => (
                                    <div key={attr.atributo} className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 uppercase text-[10px] truncate max-w-[130px]">{attr.atributo}</span>
                                      <span className={cn(
                                        "font-black px-1.5 py-0.5 rounded text-[9px] min-w-[32px] text-center",
                                        attr.valor === 0 && "text-red-500 bg-red-500/10",
                                        attr.valor === 1 && "text-red-400 bg-red-400/10",
                                        attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                                        attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                                        attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                                        attr.valor === 5 && "text-emerald-500 bg-emerald-500/10"
                                      )}>{attr.valor}/5</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Common Attributes */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider pb-0.5 border-b border-slate-800/60 block">Metodológicos</span>
                          {COMMON_ATTRIBUTES.map(group => {
                            const groupAttrs = group.items.map(name => ({
                              atributo: name,
                              valor: typeof editableAttributes[name] === 'number' ? editableAttributes[name] : 0
                            }));
                            return (
                              <div key={group.category} className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">{group.category}</span>
                                <div className="space-y-1.5">
                                  {groupAttrs.map(attr => (
                                    <div key={attr.atributo} className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 uppercase text-[10px] truncate max-w-[130px]">{attr.atributo}</span>
                                      <span className={cn(
                                        "font-black px-1.5 py-0.5 rounded text-[9px] min-w-[32px] text-center",
                                        attr.valor === 0 && "text-red-500 bg-red-500/10",
                                        attr.valor === 1 && "text-red-400 bg-red-400/10",
                                        attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                                        attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                                        attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                                        attr.valor === 5 && "text-emerald-500 bg-emerald-500/10"
                                      )}>{attr.valor}/5</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* COMPARATIVE PROGRESSION CHART */}
                    <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl space-y-4 mt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-3 gap-3">
                        <div>
                          <h5 className="text-[11px] text-blue-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <span>Evolución Anual Comparativa</span>
                          </h5>
                          <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Progreso de atributos para {selectedPlayerProfile.nombre}</p>
                        </div>
                        {/* Period Selector Buttons */}
                        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                          <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Periodos:</span>
                          {(['Septiembre', 'Diciembre', 'Mayo'] as const).map(period => {
                            const active = comparePeriods.includes(period);
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() => toggleComparePeriod(period)}
                                className={cn(
                                  "px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer",
                                  active 
                                    ? "bg-blue-600/10 text-blue-400 border-blue-500/40 shadow-sm"
                                    : "bg-slate-950/40 text-slate-500 border-slate-850 hover:border-slate-800"
                                )}
                              >
                                {period}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="h-56 w-full pt-2">
                        {(() => {
                          const compData = getPlayerComparisonData(selectedPlayerProfile.id);
                          const attrData = [
                            {
                              name: 'OVR (General)',
                              'Septiembre': compData[0]?.['Rating General'] || 0,
                              'Diciembre': compData[1]?.['Rating General'] || 0,
                              'Mayo': compData[2]?.['Rating General'] || 0,
                            },
                            {
                              name: 'RIT (Ritmo)',
                              'Septiembre': compData[0]?.['Ritmo'] || 0,
                              'Diciembre': compData[1]?.['Ritmo'] || 0,
                              'Mayo': compData[2]?.['Ritmo'] || 0,
                            },
                            {
                              name: 'TIR (Tiro)',
                              'Septiembre': compData[0]?.['Tiro'] || 0,
                              'Diciembre': compData[1]?.['Tiro'] || 0,
                              'Mayo': compData[2]?.['Tiro'] || 0,
                            },
                            {
                              name: 'PAS (Pase)',
                              'Septiembre': compData[0]?.['Pase'] || 0,
                              'Diciembre': compData[1]?.['Pase'] || 0,
                              'Mayo': compData[2]?.['Pase'] || 0,
                            },
                            {
                              name: 'REG (Regate)',
                              'Septiembre': compData[0]?.['Regate'] || 0,
                              'Diciembre': compData[1]?.['Regate'] || 0,
                              'Mayo': compData[2]?.['Regate'] || 0,
                            },
                            {
                              name: 'DEF (Defensa)',
                              'Septiembre': compData[0]?.['Defensa'] || 0,
                              'Diciembre': compData[1]?.['Defensa'] || 0,
                              'Mayo': compData[2]?.['Defensa'] || 0,
                            },
                            {
                              name: 'FIS (Físico)',
                              'Septiembre': compData[0]?.['Físico'] || 0,
                              'Diciembre': compData[1]?.['Físico'] || 0,
                              'Mayo': compData[2]?.['Físico'] || 0,
                            },
                          ];
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={attrData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} fontWeight="bold" />
                                <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: 9 }} formatter={(v) => <span className="text-white font-semibold px-1">{v}</span>} />
                                {comparePeriods.includes('Septiembre') && <Bar dataKey="Septiembre" fill="#3b82f6" radius={[3, 3, 0, 0]} />}
                                {comparePeriods.includes('Diciembre') && <Bar dataKey="Diciembre" fill="#f59e0b" radius={[3, 3, 0, 0]} />}
                                {comparePeriods.includes('Mayo') && <Bar dataKey="Mayo" fill="#10b981" radius={[3, 3, 0, 0]} />}
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>

                      {/* TACTICAL ITEMS COMPARISON TABLE */}
                      <div className="border-t border-slate-900 pt-4 space-y-3 text-left">
                        <div>
                          <h6 className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Progreso de Ítems Tácticos (Demarcación y Metodología)</span>
                          </h6>
                          <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Comparativa directa de valoraciones tácticas de 0 a 5</p>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/80">
                          <table className="w-full text-left text-[11px] border-collapse min-w-[320px]">
                            <thead>
                              <tr className="bg-slate-900/60 border-b border-slate-900 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                                <th className="py-2 px-3">Atributo</th>
                                <th className="py-2 px-2 text-center">Tipo</th>
                                {comparePeriods.includes('Septiembre') && <th className="py-2 px-2 text-center text-blue-400">Sep</th>}
                                {comparePeriods.includes('Diciembre') && <th className="py-2 px-2 text-center text-amber-500">Dic</th>}
                                {comparePeriods.includes('Mayo') && <th className="py-2 px-2 text-center text-emerald-400">May</th>}
                                <th className="py-2 px-3 text-right">Progresión</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const specificGroups = POSITION_STRUCTURED_ATTRIBUTES[selectedPlayerProfile.posicion] || [];
                                const specificItems = specificGroups.flatMap(g => g.items.map(name => ({ name, type: 'Específico' })));
                                const commonItems = COMMON_ATTRIBUTES.flatMap(g => g.items.map(name => ({ name, type: 'Metodológico' })));
                                const allItems = [...specificItems, ...commonItems];

                                return allItems.map((item, idx) => {
                                  const valSep = getAttributeValueForPeriod(selectedPlayerProfile.id, 'Septiembre', item.name);
                                  const valDic = getAttributeValueForPeriod(selectedPlayerProfile.id, 'Diciembre', item.name);
                                  const valMay = getAttributeValueForPeriod(selectedPlayerProfile.id, 'Mayo', item.name);

                                  const activeVals: number[] = [];
                                  if (comparePeriods.includes('Septiembre')) activeVals.push(valSep);
                                  if (comparePeriods.includes('Diciembre')) activeVals.push(valDic);
                                  if (comparePeriods.includes('Mayo')) activeVals.push(valMay);

                                  let trendText = '= Estable';
                                  let trendColor = 'text-slate-500';
                                  if (activeVals.length >= 2) {
                                    const first = activeVals[0];
                                    const last = activeVals[activeVals.length - 1];
                                    const diff = last - first;
                                    if (diff > 0) {
                                      trendText = `+${diff.toFixed(0)} Mejora`;
                                      trendColor = 'text-emerald-400 font-bold';
                                    } else if (diff < 0) {
                                      trendText = `${diff.toFixed(0)} Retroceso`;
                                      trendColor = 'text-red-400 font-bold';
                                    }
                                  }

                                  const getRatingBadgeClass = (val: number) => {
                                    return cn(
                                      "inline-block font-extrabold text-[9px] px-1.5 py-0.5 rounded-md min-w-[22px] text-center",
                                      val === 0 && "text-red-500 bg-red-500/10",
                                      val === 1 && "text-red-400 bg-red-400/10",
                                      val === 2 && "text-orange-500 bg-orange-500/10",
                                      val === 3 && "text-yellow-500 bg-yellow-500/10",
                                      val === 4 && "text-blue-500 bg-blue-500/10",
                                      val === 5 && "text-emerald-500 bg-emerald-500/10"
                                    );
                                  };

                                  return (
                                    <tr key={idx} className="border-b border-slate-900/40 hover:bg-slate-900/20 transition-colors">
                                      <td className="py-1.5 px-3 text-white font-medium truncate max-w-[140px] uppercase text-[9px]">{item.name}</td>
                                      <td className="py-1.5 px-2 text-center">
                                        <span className={cn(
                                          "text-[7px] font-bold uppercase px-1 py-0.5 rounded-full border",
                                          item.type === 'Específico' ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" : "bg-blue-500/5 text-blue-400 border-blue-500/10"
                                        )}>
                                          {item.type === 'Específico' ? 'ESP' : 'MET'}
                                        </span>
                                      </td>
                                      {comparePeriods.includes('Septiembre') && (
                                        <td className="py-1.5 px-2 text-center">
                                          <span className={getRatingBadgeClass(valSep)}>{valSep}</span>
                                        </td>
                                      )}
                                      {comparePeriods.includes('Diciembre') && (
                                        <td className="py-1.5 px-2 text-center">
                                          <span className={getRatingBadgeClass(valDic)}>{valDic}</span>
                                        </td>
                                      )}
                                      {comparePeriods.includes('Mayo') && (
                                        <td className="py-1.5 px-2 text-center">
                                          <span className={getRatingBadgeClass(valMay)}>{valMay}</span>
                                        </td>
                                      )}
                                      <td className={cn("py-1.5 px-3 text-right text-[9px]", trendColor)}>
                                        {trendText}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                      setShowPrintPreview(true);
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

      {/* Print Preview Modal */}
      {showPrintPreview && selectedPlayerProfile && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-start p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto my-auto space-y-4 pt-6 pb-12">
            
            {/* Header / Top controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-wrap gap-3 items-center justify-between text-white shadow-2xl">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400 animate-pulse" />
                <div className="text-left">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">Vista Previa del Informe de Impresión</h4>
                  <p className="text-[10px] text-slate-400">Jugador/a: <strong className="text-white">{selectedPlayerProfile.nombre} {selectedPlayerProfile.apellidos}</strong></p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    window.focus();
                    window.print();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowPrintPreview(false)}
                  className="text-xs border-slate-800 text-slate-400 hover:text-white rounded-xl px-4 py-2"
                >
                  Cerrar Vista Previa
                </Button>
              </div>
            </div>

            {/* Iframe advice notice */}
            <div className="bg-blue-950/40 border border-blue-900/30 rounded-2xl p-4 space-y-2 text-xs text-blue-300 text-left">
              <span className="font-bold uppercase tracking-wider block text-[10px] text-blue-400">💡 Consejo de Impresión en Navegadores:</span>
              <p className="leading-relaxed text-[11px]">
                Los navegadores suelen bloquear la impresión integrada desde paneles reducidos (como el iframe de AI Studio). 
                Si al pulsar <strong>"Imprimir / Guardar PDF"</strong> no se abre el diálogo de impresión, por favor haz clic en el botón <strong>"Abrir en pestaña nueva"</strong> situado en la esquina superior derecha del panel de desarrollo para usar la app en pantalla completa y poder imprimir sin restricciones de seguridad.
              </p>
            </div>

            {/* Template Selector Tabs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 px-2">Seleccionar Tipo de Informe:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPrintReportType('FUT')}
                  className={`text-[11px] font-black uppercase py-2 px-4 rounded-xl transition-all ${
                    printReportType === 'FUT' 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15' 
                      : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Ficha FIFA (Corto)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintReportType('DOSSIER')}
                  className={`text-[11px] font-black uppercase py-2 px-4 rounded-xl transition-all ${
                    printReportType === 'DOSSIER' 
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15' 
                      : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Dossier Completo
                </button>
                <button
                  type="button"
                  onClick={() => setPrintReportType('BOTH')}
                  className={`text-[11px] font-black uppercase py-2 px-4 rounded-xl transition-all ${
                    printReportType === 'BOTH' 
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md' 
                      : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  Ambos Informes
                </button>
              </div>
            </div>

            {/* On-Screen Document Previews */}
            <div className="space-y-8">
              {(printReportType === 'FUT' || printReportType === 'BOTH') && (
                <div className="space-y-2">
                  {printReportType === 'BOTH' && (
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-amber-500">INFORME 1: FICHA TÉCNICA FIFA STYLE</span>
                    </div>
                  )}
                  {/* The actual simulated paper document */}
                  <div className="bg-[#030712] text-white p-6 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 relative font-sans text-left overflow-hidden">
                    {/* Subtle background cosmic mesh */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(239,68,68,0.1),transparent_60%)] pointer-events-none" />
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center lg:items-stretch">
                      
                      {/* Left Column: The FIFA FUT Player Card */}
                      <div className="lg:col-span-5 flex justify-center items-center">
                        {(() => {
                          const stats = getPlayerStats(selectedPlayerProfile);
                          return <FUTPlayerCard player={selectedPlayerProfile} stats={stats} />;
                        })()}
                      </div>

                      {/* Right Column: Extended Technical dossier */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                        {(() => {
                          const stats = getPlayerStats(selectedPlayerProfile);
                          const age = selectedPlayerProfile.anio_nacimiento ? (2026 - parseInt(selectedPlayerProfile.anio_nacimiento as any)) : 15;
                          return (
                            <>
                              {/* Dossier Header */}
                              <div>
                                <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-1">
                                  <span>U.D. LA POVEDA • ÁREA DE METODOLOGÍA</span>
                                </div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none">
                                  {selectedPlayerProfile.nombre} {selectedPlayerProfile.apellidos}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase mt-1">
                                  DORSAL #{selectedPlayerProfile.dorsal} • <span className="text-amber-400">{selectedPlayerProfile.posicion}</span> • {age} AÑOS
                                </p>
                                <div className="h-px bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent mt-4" />
                              </div>

                              {/* Extended Records Grids */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Block A: Personal details */}
                                <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl space-y-2.5">
                                  <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider border-b border-slate-800 pb-1.5">
                                    DATOS PERSONALES
                                  </h4>
                                  <div className="text-xs space-y-1.5">
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Lateralidad:</span>
                                      <strong className="text-white">{selectedPlayerProfile.lateralidad || 'Derecho'}</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Estado Físico:</span>
                                      <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] uppercase ${
                                        selectedPlayerProfile.estado_fisico === 'Disponible' ? 'bg-emerald-500/10 text-emerald-400' :
                                        selectedPlayerProfile.estado_fisico === 'Lesionado' ? 'bg-red-500/10 text-red-400' :
                                        'bg-amber-500/10 text-amber-400'
                                      }`}>
                                        {selectedPlayerProfile.estado_fisico}
                                      </span>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Teléfono:</span>
                                      <strong className="text-white">{selectedPlayerProfile.telefono || 'No registrado'}</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Email:</span>
                                      <strong className="text-white truncate block max-w-[140px]">{selectedPlayerProfile.email || 'No registrado'}</strong>
                                    </p>
                                  </div>
                                </div>

                                {/* Block B: Performance stats */}
                                <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl space-y-2.5">
                                  <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider border-b border-slate-800 pb-1.5">
                                    ESTADÍSTICAS COMPLETAS
                                  </h4>
                                  <div className="text-xs space-y-1.5">
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Partidos Disputados:</span>
                                      <strong className="text-white">{stats.partidos_jugados}</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Minutos Totales:</span>
                                      <strong className="text-white">{stats.minutos_jugados} min</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Goles Marcados:</span>
                                      <strong className="text-emerald-400 font-bold">{stats.goles} goles</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span className="text-slate-400 font-semibold">Asistencia Entrenos:</span>
                                      <strong className="text-amber-400">{stats.asistencia_entrenamientos}%</strong>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Block C: Scouting evaluation & Rating */}
                              <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                  <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                                    EVALUACIÓN METODOLÓGICA
                                  </h4>
                                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-400 text-slate-950 rounded uppercase tracking-wider">
                                    VALORACIÓN GENERAL: {stats.rating_general}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed italic">
                                  "Jugador/a con una valoración general de {stats.rating_general} y una tasa de asistencia a entrenamientos del {stats.asistencia_entrenamientos}%. Demuestra un alto compromiso con el modelo de juego del club, excelente disciplina táctica en el terreno de juego, y un potencial físico-técnico sobresaliente según las mediciones registradas en el software."
                                </p>
                              </div>

                              {/* Dossier Footer */}
                              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-slate-900">
                                <span>U.D. LA POVEDA © 2026</span>
                                <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {(printReportType === 'DOSSIER' || printReportType === 'BOTH') && (
                <div className="space-y-2">
                  {printReportType === 'BOTH' && (
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl mt-4">
                      <span className="text-[10px] font-black uppercase text-emerald-500">INFORME 2: DOSSIER COMPLETO DE RENDIMIENTO (MULTIPLIEGO)</span>
                    </div>
                  )}
                  <div className="p-1 sm:p-2 bg-slate-950 rounded-[2.5rem] border border-slate-850">
                    <DetailedPerformanceDossier player={selectedPlayerProfile} stats={getPlayerStats(selectedPlayerProfile)} allPlayers={players} />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Printable Area for Ficha Técnica (Portal-rendered at document.body for flawless printing) */}
      {selectedPlayerProfile && createPortal(
        <div id="printable-player-report" className="print-only-container p-12 bg-[#030712] text-white min-h-screen relative font-sans">
          {/* Subtle cosmic mesh for high-quality background prints */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.12),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(239,68,68,0.08),transparent_60%)] pointer-events-none" />
          
          {(printReportType === 'FUT' || printReportType === 'BOTH') && (
            <div className="max-w-4xl mx-auto grid grid-cols-12 gap-8 items-center relative z-10 pt-8 min-h-screen page-break">
              
              {/* Left Column: Card */}
              <div className="col-span-5 flex justify-center">
                {(() => {
                  const stats = getPlayerStats(selectedPlayerProfile);
                  return <FUTPlayerCard player={selectedPlayerProfile} stats={stats} />;
                })()}
              </div>

              {/* Right Column: Complete Stats Dossier */}
              <div className="col-span-7 space-y-6 text-left">
                {(() => {
                  const stats = getPlayerStats(selectedPlayerProfile);
                  const age = selectedPlayerProfile.anio_nacimiento ? (2026 - parseInt(selectedPlayerProfile.anio_nacimiento as any)) : 15;
                  return (
                    <>
                      <div>
                        <div className="text-amber-500 font-extrabold uppercase tracking-widest text-[10px] mb-1">
                          U.D. LA POVEDA • ÁREA DE METODOLOGÍA
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-tight text-white leading-none">
                          {selectedPlayerProfile.nombre} {selectedPlayerProfile.apellidos}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-1">
                          DORSAL #{selectedPlayerProfile.dorsal} • <span className="text-amber-400">{selectedPlayerProfile.posicion}</span> • {age} AÑOS
                        </p>
                        <div className="h-px bg-slate-800 mt-4" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Block A */}
                        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider border-b border-slate-800 pb-1.5">
                            DATOS PERSONALES
                          </h4>
                          <div className="text-xs space-y-1.5">
                            <p className="flex justify-between"><span className="text-slate-400">Lateralidad:</span> <strong className="text-white">{selectedPlayerProfile.lateralidad || 'Derecho'}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">Estado Físico:</span> <strong className="text-emerald-400">{selectedPlayerProfile.estado_fisico}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">Teléfono:</span> <strong className="text-white">{selectedPlayerProfile.telefono || 'No registrado'}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">Email:</span> <strong className="text-white truncate block max-w-[150px]">{selectedPlayerProfile.email || 'No registrado'}</strong></p>
                          </div>
                        </div>

                        {/* Block B */}
                        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider border-b border-slate-800 pb-1.5">
                            ESTADÍSTICAS COMPLETAS
                          </h4>
                          <div className="text-xs space-y-1.5">
                            <p className="flex justify-between"><span className="text-slate-400">Partidos Disputados:</span> <strong className="text-white">{stats.partidos_jugados}</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">Minutos Jugados:</span> <strong className="text-white">{stats.minutos_jugados} min</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">Goles Marcados:</span> <strong className="text-emerald-400 font-bold">{stats.goles} goles</strong></p>
                            <p className="flex justify-between"><span className="text-slate-400">Asistencia Entrenos:</span> <strong className="text-amber-400">{stats.asistencia_entrenamientos}%</strong></p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                            EVALUACIÓN METODOLÓGICA
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-amber-400 text-slate-950 rounded uppercase tracking-wider">
                            VALORACIÓN GENERAL: {stats.rating_general}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          "Jugador/a con una valoración general de {stats.rating_general} y una tasa de asistencia a entrenamientos del {stats.asistencia_entrenamientos}%. Demuestra un alto compromiso con el modelo de juego del club, excelente disciplina táctica en el terreno de juego, y un potencial físico-técnico sobresaliente según las mediciones registradas en el software."
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-slate-900">
                        <span>U.D. LA POVEDA © 2026</span>
                        <span>ÁREA DE METODOLOGÍA Y RENDIMIENTO</span>
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          )}

          {(printReportType === 'DOSSIER' || printReportType === 'BOTH') && (
            <div className="max-w-5xl mx-auto">
              <DetailedPerformanceDossier player={selectedPlayerProfile} stats={getPlayerStats(selectedPlayerProfile)} allPlayers={players} />
            </div>
          )}

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
            background-color: #030712 !important;
            background: #030712 !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            display: none !important;
          }
          .print-only-container {
            display: block !important;
            background-color: #030712 !important;
            background: #030712 !important;
            color: white !important;
            padding: 40px !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

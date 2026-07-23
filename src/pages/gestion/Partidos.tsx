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
  ArrowUpDown,
  MessageSquare,
  Users,
  CheckSquare,
  Square,
  Copy,
  Send,
  ExternalLink,
  Search,
  Filter,
  Shirt,
  FileText,
  Check,
  Save,
  Download,
  Sparkles,
  Share2,
  FileDown,
  Image as ImageIcon,
  Printer
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
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
  convocatoria?: string[];
  hora_citacion?: string;
  lugar?: string;
  equipacion?: string;
  observaciones?: string;
  mensaje_motivacional?: string;
  estadisticas?: {
    jugadoras_stats?: MatchPlayerStat[];
    cambios?: Substitution[];
    convocatoria?: string[];
    hora_citacion?: string;
    lugar?: string;
    equipacion?: string;
    observaciones?: string;
    mensaje_motivacional?: string;
  };
}

const MOTIVATIONAL_PHRASES = [
  "¡VAMOS POVEDA! ¡A POR LA VICTORIA!",
  "¡Orgullo, pasión y corazón en cada balón!",
  "¡Unidas y fuertes, hoy luchamos por nuestro escudo!",
  "¡La fuerza del equipo está en cada una de vosotras!",
  "¡Humildad en el trabajo, grandeza en el campo!",
  "¡Hoy salimos a darlo todo por la U.D. La Poveda!",
  "¡Confianza, entrega y victoria! ¡A por todas!",
  "¡No jugamos solas, jugamos por el club y la afición!",
  "¡Con garra, ilusión y alma hasta el último segundo!",
  "¡Juntas somos imparables! ¡A ganar!"
];

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

  // Convocatoria & Corporate WhatsApp Modal state
  const [showConvocatoriaModal, setShowConvocatoriaModal] = useState<Match | null>(null);
  const [activeConvocatoriaTab, setActiveConvocatoriaTab] = useState<'fifa' | 'editor' | 'whatsapp'>('fifa');
  const [selectedConvocadas, setSelectedConvocadas] = useState<string[]>([]);
  const [citacionHora, setCitacionHora] = useState<string>('');
  const [citacionLugar, setCitacionLugar] = useState<string>('');
  const [citacionEquipacion, setCitacionEquipacion] = useState<string>('');
  const [citacionNotas, setCitacionNotas] = useState<string>('');
  const [citacionMensajeMotivacional, setCitacionMensajeMotivacional] = useState<string>('');
  const [whatsappMsgText, setWhatsappMsgText] = useState<string>('');
  const [searchPlayerQuery, setSearchPlayerQuery] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('TODAS');
  const [isMsgCustomEdited, setIsMsgCustomEdited] = useState<boolean>(false);

  // Generate official club corporate message for WhatsApp convocatoria
  const generateCorporateWhatsappMessage = (
    match: Match,
    convocadasIds: string[],
    allPlayers: any[],
    teamName: string,
    citHora: string,
    citLugar: string,
    citEquip: string,
    citObs: string,
    citMotivacional: string
  ) => {
    const isLocal = match.tipo === 'Local';
    const matchTitle = isLocal 
      ? `U.D. LA POVEDA 🆚 ${match.rival.toUpperCase()}`
      : `${match.rival.toUpperCase()} 🆚 U.D. LA POVEDA`;

    const convokedPlayers = allPlayers.filter(p => convocadasIds.includes(p.id));

    const posOrder: Record<string, number> = {
      'Portera': 1, 'Portero': 1, 'GK': 1,
      'Defensa': 2, 'Lateral': 2, 'Central': 2, 'CB': 2, 'LB': 2, 'RB': 2,
      'Centrocampista': 3, 'Medio': 3, 'Pivote': 3, 'MC': 3, 'MCD': 3, 'MCO': 3,
      'Delantera': 4, 'Delantero': 4, 'Extremo': 4, 'DC': 4, 'EI': 4, 'ED': 4
    };

    const getPosIcon = (pos: string) => {
      const p = (pos || '').toLowerCase();
      if (p.includes('port') || p.includes('gk')) return '🧤';
      if (p.includes('def') || p.includes('lateral') || p.includes('cb')) return '🛡️';
      if (p.includes('med') || p.includes('centro') || p.includes('pivote') || p.includes('mc')) return '⚙️';
      if (p.includes('del') || p.includes('extrem') || p.includes('dc')) return '⚡';
      return '⚽';
    };

    const sortedList = [...convokedPlayers].sort((a, b) => {
      const posA = posOrder[a.posicion] || 99;
      const posB = posOrder[b.posicion] || 99;
      if (posA !== posB) return posA - posB;
      const numA = parseInt(a.dorsal) || 99;
      const numB = parseInt(b.dorsal) || 99;
      return numA - numB;
    });

    const playersListText = sortedList.length > 0
      ? sortedList.map((p, index) => {
          const numStr = String(index + 1).padStart(2, '0');
          const dorsalStr = p.dorsal ? `#${p.dorsal}` : '';
          const icon = getPosIcon(p.posicion);
          return `${numStr}. ${icon} ${dorsalStr} ${p.nombre} ${p.apellidos}`.trim();
        }).join('\n')
      : '_(No se han seleccionado jugadoras convocadas aún)_';

    let formattedDate = match.fecha;
    if (match.fecha) {
      try {
        const parts = match.fecha.split('-');
        if (parts.length === 3) {
          const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          formattedDate = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        }
      } catch (e) {
        formattedDate = match.fecha;
      }
    }

    return `🔵⚪ *U.D. LA POVEDA* ⚪🔵
📋 *CONVOCATORIA OFICIAL DE PARTIDO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *COMPETICIÓN:* ${match.competicion.toUpperCase()} (${teamName.toUpperCase()})
⚔️ *ENCUENTRO:* ${isLocal ? '🏠 LOCAL' : '🚌 VISITANTE'} • ${matchTitle}
📅 *FECHA:* ${formattedDate}
⏰ *HORA DE PARTIDO:* ${match.hora} h
📍 *LUGAR / CAMPO:* ${citLugar || (isLocal ? 'Polideportivo Municipal La Poveda' : match.rival)}
⏱️ *HORA DE CITACIÓN:* ${citHora || '1 hora antes del encuentro'}
👕 *INDUMENTARIA:* ${citEquip || '1ª Equipación Oficial + Chándal'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *JUGADORAS CONVOCADAS (${sortedList.length})*:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${playersListText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *NOTAS & RECOMENDACIONES:*
${citObs || '• Acudir con puntualidad.\n• Confirmar asistencia en el grupo.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵⚪ *${citMotivacional || '¡VAMOS POVEDA! ¡A POR LA VICTORIA!'}* ⚽🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  };

  // Open convocatoria modal
  const handleOpenConvocatoriaModal = (match: Match) => {
    setShowConvocatoriaModal(match);
    
    const existingConv = match.convocatoria || match.estadisticas?.convocatoria || [];
    setSelectedConvocadas(existingConv);

    let defaultCitHora = match.estadisticas?.hora_citacion || match.hora_citacion || '';
    if (!defaultCitHora && match.hora) {
      const [h, m] = match.hora.split(':').map(Number);
      if (!isNaN(h)) {
        const totalMatchMins = h * 60 + (isNaN(m) ? 0 : m);
        let citMins = totalMatchMins - 75; // 1h 15m (75 mins) before match
        if (citMins < 0) citMins += 1440;
        const citH = Math.floor(citMins / 60);
        const citM = citMins % 60;
        defaultCitHora = `${String(citH).padStart(2, '0')}:${String(citM).padStart(2, '0')} h (1h 15m antes)`;
      } else {
        defaultCitHora = '1h 15m antes del encuentro';
      }
    }
    setCitacionHora(defaultCitHora);

    const defaultLugar = match.estadisticas?.lugar || match.lugar || 
      (match.tipo === 'Local' ? 'Polideportivo Municipal La Poveda (Campo Principal)' : `Campo Municipal del Rival (${match.rival})`);
    setCitacionLugar(defaultLugar);

    const defaultEquip = match.estadisticas?.equipacion || match.equipacion || '1ª Equipación Oficial + Chándal';
    setCitacionEquipacion(defaultEquip);

    const defaultNotas = match.estadisticas?.observaciones || match.observaciones || 
      '• Acudir con puntualidad a la hora fijada.\n• Confirmar recepción del mensaje en el grupo de WhatsApp.';
    setCitacionNotas(defaultNotas);

    const defaultMotivacional = match.estadisticas?.mensaje_motivacional || match.mensaje_motivacional || 
      MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];
    setCitacionMensajeMotivacional(defaultMotivacional);

    setIsMsgCustomEdited(false);
    setActiveConvocatoriaTab('fifa');
  };

  // Helper to generate poster image data URL using html-to-image with html2canvas fallback
  const getPosterDataUrl = async (el: HTMLElement): Promise<string> => {
    // Primary approach: html-to-image (handles modern Tailwind v4 oklch colors natively)
    try {
      const dataUrl = await toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#07090e',
        cacheBust: true
      });
      if (dataUrl && dataUrl.length > 200) {
        return dataUrl;
      }
    } catch (err1) {
      console.warn('html-to-image failed, trying html2canvas fallback:', err1);
    }

    // Secondary fallback: html2canvas with sanitized styles
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#07090e',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('fifa-poster-export');
          if (clonedEl) {
            clonedEl.style.transform = 'none';
            clonedEl.style.maxHeight = 'none';
            clonedEl.style.overflow = 'visible';
            const blurNodes = clonedEl.querySelectorAll<HTMLElement>('.blur-3xl, [class*="blur"]');
            blurNodes.forEach((node) => {
              node.style.display = 'none';
            });
          }
        }
      });
      return canvas.toDataURL('image/png');
    } catch (err2) {
      console.error('All poster generation attempts failed:', err2);
      throw err2;
    }
  };

  // Export FIFA Convocatoria Poster to PDF
  const handleExportFifaPdf = async () => {
    const el = document.getElementById('fifa-poster-export');
    if (!el) {
      toast.error('No se encontró el lienzo del cartel.');
      return;
    }
    const toastId = toast.loading('Generando PDF estilo EA FC / FIFA...');
    try {
      const imgData = await getPosterDataUrl(el);
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const imgW = img.width || 500;
      const imgH = img.height || 1000;
      
      // Calculate exact vertical height in mm for 210mm width (A4 width)
      const mmWidth = 210;
      const mmHeight = Math.round((imgH * mmWidth) / imgW);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [mmWidth, mmHeight] // Custom vertical page size matching exact image aspect ratio
      });

      pdf.addImage(imgData, 'PNG', 0, 0, mmWidth, mmHeight);
      
      const cleanTeam = selectedTeam.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanRival = (showConvocatoriaModal?.rival || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Cartel_FIFA_${cleanTeam}_vs_${cleanRival}.pdf`;
      pdf.save(filename);
      
      toast.dismiss(toastId);
      toast.success('¡PDF estilo FIFA vertical generado y descargado correctamente!');
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      toast.dismiss(toastId);
      toast.error('Ocurrió un error al generar el PDF. Reinténtalo.');
    }
  };

  // Export FIFA Convocatoria Poster to PNG for direct WhatsApp attachment
  const handleExportFifaPng = async () => {
    const el = document.getElementById('fifa-poster-export');
    if (!el) {
      toast.error('No se encontró el lienzo del cartel.');
      return;
    }
    const toastId = toast.loading('Generando cartel FIFA en HD...');
    try {
      const imgData = await getPosterDataUrl(el);
      const link = document.createElement('a');
      
      const cleanTeam = selectedTeam.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanRival = (showConvocatoriaModal?.rival || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Cartel_FIFA_${cleanTeam}_vs_${cleanRival}.png`;
      
      link.download = filename;
      link.href = imgData;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 100);
      
      toast.dismiss(toastId);
      toast.success('¡Imagen HD guardada! Ya puedes adjuntarla en tu grupo de WhatsApp.');
    } catch (err) {
      console.error('Error al exportar PNG:', err);
      toast.dismiss(toastId);
      toast.error('Error al generar la imagen. Reinténtalo.');
    }
  };

  // Sync WhatsApp template text
  useEffect(() => {
    if (showConvocatoriaModal && !isMsgCustomEdited) {
      const msg = generateCorporateWhatsappMessage(
        showConvocatoriaModal,
        selectedConvocadas,
        players,
        selectedTeam,
        citacionHora,
        citacionLugar,
        citacionEquipacion,
        citacionNotas,
        citacionMensajeMotivacional
      );
      setWhatsappMsgText(msg);
    }
  }, [showConvocatoriaModal, selectedConvocadas, players, selectedTeam, citacionHora, citacionLugar, citacionEquipacion, citacionNotas, citacionMensajeMotivacional, isMsgCustomEdited]);

  // Load roster and matches on team change
  useEffect(() => {
    const fetchTeamRosterAndMatches = async () => {
      const rosterKey = `team_roster_${selectedTeam}`;
      const savedRoster = localStorage.getItem(rosterKey);
      let localList: any[] = savedRoster ? JSON.parse(savedRoster) : [];

      try {
        const { data: dbPlayers } = await supabase
          .from('players')
          .select('*')
          .or(`equipo.eq.${selectedTeam},equipo.is.null,equipo.eq.''`);

        if (dbPlayers && dbPlayers.length > 0) {
          const map = new Map<string, any>();
          localList.forEach(p => map.set(p.id, p));
          dbPlayers.forEach(p => {
            if (!map.has(p.id)) {
              map.set(p.id, {
                id: p.id,
                nombre: p.nombre || '',
                apellidos: p.apellidos || '',
                dorsal: p.dorsal || '',
                posicion: p.posicion || 'Jugadora'
              });
            }
          });
          const merged = Array.from(map.values());
          setPlayers(merged);
          localStorage.setItem(rosterKey, JSON.stringify(merged));
        } else {
          setPlayers(localList);
        }
      } catch (err) {
        setPlayers(localList);
      }

      try {
        const { data, error } = await supabase
          .from('team_matches')
          .select('*')
          .eq('team', selectedTeam)
          .order('fecha', { ascending: false });

        if (!error && data) {
          const formatted: Match[] = data.map(item => {
            const stats = item.estadisticas || {};
            return {
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
              convocatoria: stats.convocatoria || item.convocatoria || [],
              hora_citacion: stats.hora_citacion || item.hora_citacion || '',
              lugar: stats.lugar || item.lugar || '',
              equipacion: stats.equipacion || item.equipacion || '',
              observaciones: stats.observaciones || item.observaciones || '',
              estadisticas: stats
            };
          });
          
          setMatches(formatted);
          localStorage.setItem(`team_matches_${selectedTeam}`, JSON.stringify(formatted));
          return;
        }
      } catch (err) {
        console.warn('Exception fetching matches:', err);
      }

      const key = `team_matches_${selectedTeam}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setMatches(JSON.parse(saved));
      } else {
        const defaults: Match[] = [
          { id: 'm1', rival: 'A.D. Arganda', fecha: new Date().toISOString().split('T')[0], hora: '12:00', tipo: 'Local', competicion: 'Liga', estado: 'Programado' },
          { id: 'm2', rival: 'F.C. Rivas Vaciamadrid', fecha: '2026-05-15', hora: '11:30', tipo: 'Visitante', competicion: 'Liga', estado: 'Finalizado', goles_favor: 3, goles_contra: 1, acta: 'Excelente partido de posesión y presión alta. Destacó el juego defensivo por bandas.' }
        ];
        localStorage.setItem(key, JSON.stringify(defaults));
        setMatches(defaults);
      }
    };

    fetchTeamRosterAndMatches();
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
        const statsToSave = {
          ...(match.estadisticas || {}),
          convocatoria: match.convocatoria || match.estadisticas?.convocatoria || [],
          hora_citacion: match.hora_citacion || match.estadisticas?.hora_citacion || '',
          lugar: match.lugar || match.estadisticas?.lugar || '',
          equipacion: match.equipacion || match.estadisticas?.equipacion || '',
          observaciones: match.observaciones || match.estadisticas?.observaciones || '',
          mensaje_motivacional: match.mensaje_motivacional || match.estadisticas?.mensaje_motivacional || ''
        };

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
          estadisticas: statsToSave
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

  const handleSaveConvocatoria = async () => {
    if (!showConvocatoriaModal) return;

    const updated = matches.map(m => {
      if (m.id === showConvocatoriaModal.id) {
        const newStats = {
          ...(m.estadisticas || {}),
          convocatoria: selectedConvocadas,
          hora_citacion: citacionHora,
          lugar: citacionLugar,
          equipacion: citacionEquipacion,
          observaciones: citacionNotas,
          mensaje_motivacional: citacionMensajeMotivacional
        };
        return {
          ...m,
          convocatoria: selectedConvocadas,
          hora_citacion: citacionHora,
          lugar: citacionLugar,
          equipacion: citacionEquipacion,
          observaciones: citacionNotas,
          mensaje_motivacional: citacionMensajeMotivacional,
          estadisticas: newStats
        };
      }
      return m;
    });

    await saveMatches(updated);
    toast.success('¡Convocatoria y datos del partido guardados correctamente!');
    setShowConvocatoriaModal(null);
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
                <div className="border-t border-slate-900/60 pt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => handleOpenConvocatoriaModal(match)}
                      className="text-[10px] font-black text-white bg-green-600 hover:bg-green-500 flex items-center gap-1.5 px-3 h-8 rounded-xl uppercase shadow-md transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      <span>Convocatoria & WhatsApp</span>
                      {(match.convocatoria?.length || 0) > 0 && (
                        <span className="bg-green-800 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ml-1">
                          {match.convocatoria?.length}
                        </span>
                      )}
                    </Button>

                    {match.estado === 'Finalizado' && match.acta && (
                      <Button
                        onClick={() => setShowActaModal(match)}
                        variant="ghost"
                        className="text-[10px] font-black text-blue-400 hover:text-white flex items-center gap-1 px-2.5 h-8 bg-blue-500/10 hover:bg-blue-600 rounded-xl uppercase"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Ver Acta</span>
                      </Button>
                    )}

                    {match.estado === 'Programado' && (
                      <Button
                        onClick={() => setShowActaModal(match)}
                        className="text-[10px] font-black text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1 px-2.5 h-8 rounded-xl uppercase"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
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

      {/* Official Convocatoria & FIFA EA FC Poster Modal */}
      {showConvocatoriaModal && (() => {
        const selectedPlayersList = players.filter(p => selectedConvocadas.includes(p.id));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[1400px] my-auto overflow-hidden shadow-2xl animate-in fade-in duration-200 flex flex-col max-h-[95vh]">
              
              {/* Modal Header */}
              <div className="p-4 md:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm md:text-base uppercase tracking-tight flex items-center gap-2">
                      <span>Convocatoria Oficial EA FC & Cartel FIFA</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {selectedTeam} • {showConvocatoriaModal.tipo === 'Local' ? 'U.D. LA POVEDA vs ' + showConvocatoriaModal.rival : showConvocatoriaModal.rival + ' vs U.D. LA POVEDA'}
                    </p>
                  </div>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl text-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveConvocatoriaTab('fifa')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase transition-all flex items-center gap-1.5 ${
                      activeConvocatoriaTab === 'fifa'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🎮 Cartel FIFA (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveConvocatoriaTab('editor')}
                    className={`px-3 py-1.5 rounded-xl font-black uppercase transition-all flex items-center gap-1.5 ${
                      activeConvocatoriaTab === 'editor'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>⚙️ Selección y Citación ({selectedConvocadas.length})</span>
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowConvocatoriaModal(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 md:p-6 overflow-y-auto flex-1">
                {activeConvocatoriaTab === 'fifa' ? (
                  /* TAB 1: CARTEL ESTILO FIFA EA FC ULTIMATE TEAM (CON PDF & PNG EXPORT) */
                  <div className="space-y-6">
                    {/* Top Action Bar */}
                    <div className="bg-slate-950/80 border border-amber-500/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                        <span className="font-extrabold text-amber-300 uppercase tracking-wide">
                          Cartel Vistoso Estilo FIFA EA FC Convocatoria ({selectedPlayersList.length} Convocadas)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleExportFifaPdf}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-950/50"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Descargar Cartel PDF (FIFA)</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={handleExportFifaPng}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Descargar Imagen PNG (WhatsApp)</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(whatsappMsgText);
                            toast.success('¡Texto de la convocatoria copiado al portapapeles!');
                          }}
                          variant="outline"
                          className="border-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase px-3 py-2 rounded-xl flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                          <span>Copiar Texto</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => setActiveConvocatoriaTab('editor')}
                          variant="outline"
                          className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-extrabold text-xs uppercase px-3 py-2 rounded-xl flex items-center gap-1.5"
                        >
                          <span>✏️ Cambiar Convocadas</span>
                        </Button>
                      </div>
                    </div>

                    {/* FIFA EA FC Ultimate Team Poster Canvas Element (Vertical Story Format for Mobile - Corporate Blue & Silver Theme) */}
                    <div className="flex justify-center">
                      <div 
                        id="fifa-poster-export" 
                        className="bg-gradient-to-br from-blue-950 via-[#0b182e] to-slate-950 text-white p-5 sm:p-7 rounded-3xl border-2 border-slate-300/60 relative shadow-[0_0_30px_rgba(30,58,138,0.5)] overflow-hidden w-full max-w-[500px] space-y-4"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      >
                        {/* Glow and Background FX */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-300/15 rounded-full blur-3xl pointer-events-none" />

                        {/* Top Header Banner - Vertical Stack */}
                        <div className="relative z-10 text-center border-b-2 border-slate-300/40 pb-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-900 to-slate-950 border-2 border-slate-200/80 p-2 shadow-2xl flex items-center justify-center mx-auto mb-2.5 shrink-0">
                            <UDLaPovedaLogo className="w-12 h-12 drop-shadow" />
                          </div>

                          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 uppercase italic leading-none mb-1 drop-shadow-sm">
                            U.D. LA POVEDA
                          </h2>
                          
                          <p className="text-xs font-black text-slate-300 uppercase tracking-wide mb-2">
                            {selectedTeam} • {showConvocatoriaModal.competicion}
                          </p>

                          <div className="flex items-center justify-center gap-2 text-xs">
                            <span className="font-extrabold text-slate-100 bg-blue-900/80 px-2.5 py-1 rounded-lg border border-slate-300/30">
                              📅 {showConvocatoriaModal.fecha}
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm border border-slate-200/40 ${
                              showConvocatoriaModal.tipo === 'Local' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
                            }`}>
                              {showConvocatoriaModal.tipo === 'Local' ? '🏠 PARTIDO EN CASA' : '🚌 PARTIDO FUERA'}
                            </span>
                          </div>
                        </div>

                        {/* Matchup Banner */}
                        <div className="relative z-10 bg-gradient-to-b from-blue-900/50 via-slate-900/90 to-blue-950/60 border border-slate-300/40 rounded-2xl p-3.5 shadow-xl space-y-3">
                          <div className="flex items-center justify-between text-center gap-2">
                            <div className="flex-1">
                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">LOCAL</p>
                              <p className="text-sm font-black text-white uppercase tracking-tight leading-tight mt-0.5">
                                {showConvocatoriaModal.tipo === 'Local' ? 'U.D. LA POVEDA' : showConvocatoriaModal.rival}
                              </p>
                            </div>
                            
                            <div className="w-10 h-10 bg-slate-200/20 border-2 border-slate-200/80 rounded-full flex items-center justify-center text-slate-100 font-black text-xs italic shadow-inner shrink-0">
                              VS
                            </div>

                            <div className="flex-1">
                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">VISITANTE</p>
                              <p className="text-sm font-black text-white uppercase tracking-tight leading-tight mt-0.5">
                                {showConvocatoriaModal.tipo === 'Local' ? showConvocatoriaModal.rival : 'U.D. LA POVEDA'}
                              </p>
                            </div>
                          </div>

                          {/* Logistics Section */}
                          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-300/20 text-xs">
                            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-300/30">
                              <span className="text-[9px] text-slate-300 font-extrabold uppercase block mb-0.5">⏰ HORA PARTIDO</span>
                              <span className="font-black text-blue-200 text-xs">{showConvocatoriaModal.hora || 'Por definir'} h</span>
                            </div>

                            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-300/30">
                              <span className="text-[9px] text-slate-300 font-extrabold uppercase block mb-0.5">⏱️ HORA CITACIÓN</span>
                              <span className="font-black text-slate-100 text-xs">{citacionHora || '1h 15m antes'}</span>
                            </div>

                            <div className="col-span-2 bg-slate-950/80 p-2.5 rounded-xl border border-blue-400/40">
                              <span className="text-[9px] text-blue-300 font-extrabold uppercase block mb-0.5">📍 LUGAR / CAMPO DE JUEGO</span>
                              <span className="font-bold text-white text-xs leading-snug block whitespace-normal break-words">{citacionLugar}</span>
                            </div>

                            <div className="col-span-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-300/40">
                              <span className="text-[9px] text-slate-300 font-extrabold uppercase block mb-0.5">👕 INDUMENTARIA Y EQUIPACIÓN</span>
                              <span className="font-bold text-white text-xs leading-snug block whitespace-normal break-words">{citacionEquipacion}</span>
                            </div>
                          </div>
                        </div>

                        {/* Roster Section: FUT Player Cards Grid */}
                        <div className="relative z-10 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-300/30 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-slate-200" />
                              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                                JUGADORAS CONVOCADAS ({selectedPlayersList.length})
                              </h3>
                            </div>
                          </div>

                          {selectedPlayersList.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 italic text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                              No se han seleccionado jugadoras convocadas aún.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {selectedPlayersList.map((player) => {
                                const pos = player.posicion || 'Jugadora';
                                const isPor = pos.toLowerCase().includes('port') || pos.toLowerCase().includes('gk');
                                const isDef = pos.toLowerCase().includes('def') || pos.toLowerCase().includes('lat') || pos.toLowerCase().includes('centr');
                                const isMed = pos.toLowerCase().includes('med') || pos.toLowerCase().includes('pivote') || pos.toLowerCase().includes('mc');
                                
                                let posTag = 'DEL';
                                let posBg = 'bg-blue-600/30 text-blue-200 border-blue-400/50';
                                if (isPor) { posTag = 'POR'; posBg = 'bg-slate-200 text-blue-950 border-white font-black'; }
                                else if (isDef) { posTag = 'DEF'; posBg = 'bg-slate-700/60 text-slate-200 border-slate-400/50'; }
                                else if (isMed) { posTag = 'MED'; posBg = 'bg-sky-600/30 text-sky-200 border-sky-400/50'; }

                                return (
                                  <div 
                                    key={`fifa-card-${player.id}`}
                                    className="bg-gradient-to-b from-blue-900/40 via-slate-900 to-slate-950 border-2 border-slate-300/60 rounded-2xl p-2 flex flex-col justify-between shadow-lg relative overflow-hidden"
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="text-base font-black text-slate-200 font-mono leading-none">
                                        #{player.dorsal || '•'}
                                      </span>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${posBg}`}>
                                        {posTag}
                                      </span>
                                    </div>

                                    <div className="my-1">
                                      <p className="font-extrabold text-xs text-white uppercase tracking-tight truncate leading-tight">
                                        {player.nombre}
                                      </p>
                                      <p className="font-bold text-[9px] text-slate-300 uppercase truncate">
                                        {player.apellidos}
                                      </p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-300/20 pt-1 mt-0.5">
                                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest truncate">
                                        LA POVEDA
                                      </span>
                                      <span className="text-[9px]">⚽</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Observations / Notes */}
                        {citacionNotas && (
                          <div className="relative z-10 bg-slate-950/80 border border-slate-300/30 rounded-xl p-2.5 text-xs">
                            <span className="text-[9px] font-black text-slate-200 uppercase block mb-1">📌 INDICACIONES DEL CUERPO TÉCNICO:</span>
                            <p className="text-slate-300 text-[10px] whitespace-pre-line leading-relaxed font-medium">
                              {citacionNotas}
                            </p>
                          </div>
                        )}

                        {/* Poster Footer */}
                        <div className="relative z-10 border-t-2 border-slate-300/40 pt-3 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          <p className="text-blue-200 flex items-center justify-center gap-1.5 flex-wrap px-2">
                            <span>🔵⚪</span>
                            <span className="italic">{citacionMensajeMotivacional || '¡VAMOS POVEDA! ¡A POR LA VICTORIA!'}</span>
                            <span>⚽🔥</span>
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: EDITOR DE DATOS Y CONVOCADAS + WHATSAPP CORPORATIVO */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Col 1: Jugadoras de la Plantilla (4 Cols) */}
                    <div className="lg:col-span-4 bg-slate-950/50 border border-slate-850 p-4 rounded-2xl flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider">Selección de Convocadas</span>
                  </div>
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {selectedConvocadas.length} / {players.length} Convocadas
                  </span>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o dorsal..."
                      value={searchPlayerQuery}
                      onChange={(e) => setSearchPlayerQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[220px]">
                      {['TODAS', 'Portera', 'Defensa', 'Centrocampista', 'Delantera'].map(pos => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setFilterPosition(pos)}
                          className={`px-2 py-0.5 rounded-md font-bold uppercase transition-all whitespace-nowrap ${
                            filterPosition === pos 
                              ? 'bg-green-600 text-white' 
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {pos === 'TODAS' ? 'Todas' : pos.substring(0, 3)}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConvocadas(players.map(p => p.id));
                          setIsMsgCustomEdited(false);
                          toast.success('Todas las jugadoras seleccionadas.');
                        }}
                        className="text-[9px] text-green-400 hover:underline font-bold"
                      >
                        Todas
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConvocadas([]);
                          setIsMsgCustomEdited(false);
                          toast.info('Selección vaciada.');
                        }}
                        className="text-[9px] text-slate-400 hover:underline font-bold"
                      >
                        Ninguna
                      </button>
                    </div>
                  </div>
                </div>

                {/* Player Checklist */}
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {players.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic text-xs">
                      No hay jugadoras registradas en la plantilla de este equipo.
                    </div>
                  ) : (
                    players
                      .filter(p => {
                        const matchesSearch = `${p.nombre} ${p.apellidos} ${p.dorsal}`
                          .toLowerCase()
                          .includes(searchPlayerQuery.toLowerCase());
                        const matchesPos = filterPosition === 'TODAS' || 
                          (p.posicion || '').toLowerCase().includes(filterPosition.toLowerCase());
                        return matchesSearch && matchesPos;
                      })
                      .map(p => {
                        const isSelected = selectedConvocadas.includes(p.id);
                        return (
                          <div
                            key={`conv-check-${p.id}`}
                            onClick={() => {
                              setSelectedConvocadas(prev => 
                                isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                              );
                              setIsMsgCustomEdited(false);
                            }}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-green-950/20 border-green-500/40 text-white'
                                : 'bg-slate-900/40 border-slate-850 hover:border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                isSelected ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {p.dorsal || '•'}
                              </span>
                              <div className="truncate">
                                <p className="font-bold text-xs truncate leading-tight text-white">{p.nombre} {p.apellidos}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-semibold">{p.posicion || 'Jugadora'}</p>
                              </div>
                            </div>

                            <div className="shrink-0 ml-2">
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-green-400 fill-green-950" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Col 2: Logística y Detalles del Encuentro - Ampliado a 4 Cols */}
              <div className="lg:col-span-4 bg-slate-950/50 border border-slate-850 p-4.5 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                    <Shirt className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider">Datos de Citación del Partido</span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-extrabold text-amber-400 uppercase block mb-1">⏰ Hora Partido</label>
                        <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-extrabold rounded-xl px-3 py-2 text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{showConvocatoriaModal.hora || 'Por definir'} h</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-green-400 uppercase block mb-1">⏱️ Hora Citación</label>
                        <input
                          type="text"
                          value={citacionHora}
                          onChange={(e) => {
                            setCitacionHora(e.target.value);
                            setIsMsgCustomEdited(false);
                          }}
                          placeholder="Ej. 17:45 h (1h 15m antes)"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-500 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-300 uppercase block mb-1">Lugar / Campo de Juego</label>
                      <textarea
                        rows={2}
                        value={citacionLugar}
                        onChange={(e) => {
                          setCitacionLugar(e.target.value);
                          setIsMsgCustomEdited(false);
                        }}
                        placeholder="Ej. Polideportivo Municipal La Poveda (Campo Principal)"
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-500 font-medium leading-normal resize-y"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-300 uppercase block mb-1">Indumentaria / Equipación</label>
                      <textarea
                        rows={2}
                        value={citacionEquipacion}
                        onChange={(e) => {
                          setCitacionEquipacion(e.target.value);
                          setIsMsgCustomEdited(false);
                        }}
                        placeholder="Ej. 1ª Equipación Oficial + Chándal"
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-500 font-medium leading-normal resize-y"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-extrabold text-blue-400 uppercase block">
                          🔥 Mensaje Emotivo / Motivacional (Pie de Cartel & WhatsApp)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const randomPhrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];
                            setCitacionMensajeMotivacional(randomPhrase);
                            setIsMsgCustomEdited(false);
                            toast.success('¡Frase motivacional actualizada!');
                          }}
                          className="text-[10px] font-bold text-sky-300 hover:text-white bg-sky-500/20 hover:bg-sky-500/30 px-2 py-0.5 rounded-md border border-sky-500/30 transition-colors flex items-center gap-1"
                        >
                          <span>🎲 Cambiar frase</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={citacionMensajeMotivacional}
                        onChange={(e) => {
                          setCitacionMensajeMotivacional(e.target.value);
                          setIsMsgCustomEdited(false);
                        }}
                        placeholder="Ej. ¡Orgullo, pasión y corazón en cada balón!"
                        className="w-full bg-slate-900 border border-slate-800 text-blue-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-300 uppercase block mb-1">Observaciones / Indicaciones para el Equipo</label>
                      <textarea
                        rows={6}
                        value={citacionNotas}
                        onChange={(e) => {
                          setCitacionNotas(e.target.value);
                          setIsMsgCustomEdited(false);
                        }}
                        placeholder="Indicaciones de puntualidad, confirmación de asistencia..."
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-green-500 font-medium leading-relaxed resize-y"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMsgCustomEdited(false);
                    toast.success('Plantilla de WhatsApp actualizada con los datos introducidos.');
                  }}
                  className="w-full border-slate-800 text-slate-300 hover:text-white text-[10px] font-extrabold uppercase py-2"
                >
                  Regenerar Plantilla WhatsApp
                </Button>
              </div>

              {/* Col 3: Vista Previa y Envío WhatsApp (4 Cols) */}
              <div className="lg:col-span-4 bg-slate-950/50 border border-slate-850 p-4.5 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider">Plantilla WhatsApp Corporativa</span>
                    </div>
                    <span className="text-[9px] bg-green-500/20 text-green-300 font-black px-2 py-0.5 rounded-full border border-green-500/30">
                      U.D. LA POVEDA
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 mb-2">
                    Visualiza y personaliza el texto corporativo antes de enviarlo al grupo de WhatsApp del equipo:
                  </p>

                  <textarea
                    rows={15}
                    value={whatsappMsgText}
                    onChange={(e) => {
                      setWhatsappMsgText(e.target.value);
                      setIsMsgCustomEdited(true);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 font-mono text-[11px] p-3 rounded-2xl focus:outline-none focus:border-green-500 leading-relaxed resize-y"
                  />
                </div>

                {/* WhatsApp Direct Share Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(whatsappMsgText);
                        toast.success('¡Mensaje copiado al portapapeles!');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold uppercase rounded-xl flex items-center justify-center gap-1.5 h-9"
                    >
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Copiar Texto</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsgText)}`;
                        window.open(url, '_blank');
                        toast.success('Abriendo WhatsApp App...');
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold uppercase rounded-xl flex items-center justify-center gap-1.5 h-9 shadow-lg shadow-green-950"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp App</span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setActiveConvocatoriaTab('fifa')}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black uppercase rounded-xl flex items-center justify-center gap-1.5 h-9 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ver / Descargar Cartel FIFA (PDF)</span>
                  </Button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <p className="text-[10px] text-slate-500 italic hidden sm:block">
            Los cambios en la lista de convocadas y citación se guardarán en la ficha del partido.
          </p>

          <div className="flex gap-2 ml-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowConvocatoriaModal(null)}
              className="text-xs border-slate-800 text-slate-400 hover:text-white rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveConvocatoria}
              className="text-xs bg-green-600 hover:bg-green-500 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 shadow-lg shadow-green-950"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Convocatoria</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
})()}
    </div>
  );
}

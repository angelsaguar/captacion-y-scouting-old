import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Save, 
  Printer, 
  RefreshCw, 
  Trophy, 
  Clock, 
  MapPin, 
  ShieldAlert,
  Info,
  Check,
  Zap,
  Flame,
  Users,
  FileDown,
  Share2,
  Copy,
  Send,
  MessageSquare,
  ExternalLink,
  CloudUpload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { supabase } from '@/lib/supabase';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export type CalendarEventType = 'Entrenamiento' | 'Descanso' | 'Partido' | 'Inicio Liga' | 'Torneo' | 'Personalizado';

export interface CalendarEvent {
  dateStr: string; // YYYY-MM-DD
  title: string;
  type: CalendarEventType;
  hora?: string;
  lugar?: string;
  rival?: string;
  notas?: string;
  colorBg?: string;
  colorText?: string;
}

interface TeamMonthlyCalendarProps {
  selectedTeam: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function TeamMonthlyCalendar({ selectedTeam }: TeamMonthlyCalendarProps) {
  // Current view date (Default to current date or August 2026 for preseason)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(7); // 7 = Agosto (0-indexed)
  const [seasonLabel, setSeasonLabel] = useState<string>('2026-2027');
  
  // Events stored by dateStr (YYYY-MM-DD)
  const [events, setEvents] = useState<Record<string, CalendarEvent>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Modal for editing an event
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<CalendarEvent>({
    dateStr: '',
    title: 'Entrenamiento',
    type: 'Entrenamiento',
    hora: '',
    lugar: '',
    notas: ''
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsappMsg, setWhatsappMsg] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  // Storage key based on team
  const storageKey = `team_monthly_calendar_${selectedTeam}_${currentYear}_${currentMonth}`;

  // Load saved calendar events for this team & month
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading calendar events:', e);
        setEvents({});
      }
    } else {
      // Default initial mock if August 2026 (Pretemporada sample matching user image if Agosto 2026)
      if (currentYear === 2026 && currentMonth === 7) {
        const defaultSample: Record<string, CalendarEvent> = {
          '2026-08-24': { dateStr: '2026-08-24', title: 'Descanso', type: 'Descanso' },
          '2026-08-25': { dateStr: '2026-08-25', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-08-26': { dateStr: '2026-08-26', title: 'Descanso', type: 'Descanso' },
          '2026-08-27': { dateStr: '2026-08-27', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-08-28': { dateStr: '2026-08-28', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-08-29': { dateStr: '2026-08-29', title: 'vs AD PARLA', type: 'Partido', rival: 'AD PARLA', hora: '20:00 h', lugar: 'Polideportivo La Poveda' },
          '2026-08-30': { dateStr: '2026-08-30', title: 'Descanso', type: 'Descanso' },

          '2026-08-31': { dateStr: '2026-08-31', title: 'Descanso', type: 'Descanso' },
          '2026-09-01': { dateStr: '2026-09-01', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-02': { dateStr: '2026-09-02', title: 'Descanso', type: 'Descanso' },
          '2026-09-03': { dateStr: '2026-09-03', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-04': { dateStr: '2026-09-04', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-05': { dateStr: '2026-09-05', title: 'Por confirmar', type: 'Partido' },
          '2026-09-06': { dateStr: '2026-09-06', title: 'Descanso', type: 'Descanso' },

          '2026-09-07': { dateStr: '2026-09-07', title: 'Descanso', type: 'Descanso' },
          '2026-09-08': { dateStr: '2026-09-08', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-09': { dateStr: '2026-09-09', title: 'Descanso', type: 'Descanso' },
          '2026-09-10': { dateStr: '2026-09-10', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-11': { dateStr: '2026-09-11', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-12': { dateStr: '2026-09-12', title: 'vs SPORTING HORTALEZA', type: 'Partido', rival: 'SPORTING HORTALEZA' },
          '2026-09-13': { dateStr: '2026-09-13', title: 'Descanso', type: 'Descanso' },

          '2026-09-14': { dateStr: '2026-09-14', title: 'Descanso', type: 'Descanso' },
          '2026-09-15': { dateStr: '2026-09-15', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-16': { dateStr: '2026-09-16', title: 'Descanso', type: 'Descanso' },
          '2026-09-17': { dateStr: '2026-09-17', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-18': { dateStr: '2026-09-18', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-19': { dateStr: '2026-09-19', title: 'vs CD INTER PROMESAS', type: 'Partido', rival: 'CD INTER PROMESAS' },
          '2026-09-20': { dateStr: '2026-09-20', title: 'Descanso', type: 'Descanso' },

          '2026-09-21': { dateStr: '2026-09-21', title: 'Descanso', type: 'Descanso' },
          '2026-09-22': { dateStr: '2026-09-22', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-23': { dateStr: '2026-09-23', title: 'Descanso', type: 'Descanso' },
          '2026-09-24': { dateStr: '2026-09-24', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-25': { dateStr: '2026-09-25', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-27': { dateStr: '2026-09-27', title: 'INICIO LIGA', type: 'Inicio Liga' }
        };
        setEvents(defaultSample);
        localStorage.setItem(storageKey, JSON.stringify(defaultSample));
      } else {
        setEvents({});
      }
    }

    // Trigger auto synchronization from Supabase / localStorage matches & attendance
    syncAutoData(false);
  }, [selectedTeam, currentYear, currentMonth]);

  // Save changes to localStorage and optionally sync to Supabase
  const saveEvents = (newEvents: Record<string, CalendarEvent>) => {
    setEvents(newEvents);
    localStorage.setItem(storageKey, JSON.stringify(newEvents));
  };

  // Upload current month's calendar state to Supabase database tables
  const handleUploadToSupabase = async (eventsToSave?: Record<string, CalendarEvent>) => {
    const targetEvents = eventsToSave || events;
    setIsSyncing(true);
    const toastId = toast.loading('Subiendo calendario a Supabase...');

    try {
      let savedMatches = 0;
      let savedSessions = 0;

      const allEntries = Object.values(targetEvents) as CalendarEvent[];

      // 1. Upsert training sessions into attendance_sessions
      const trainingEntries = allEntries.filter(e => e.type === 'Entrenamiento');
      for (const tr of trainingEntries) {
        const payload = {
          team: selectedTeam,
          fecha: tr.dateStr,
          tipo: 'Entrenamiento',
          descripcion: tr.title || 'Entrenamiento',
          hora: tr.hora || '19:30 h',
          records: [],
          tareas: [],
          archivos: []
        };
        const { error } = await supabase
          .from('attendance_sessions')
          .upsert(payload);
        if (!error) savedSessions++;
      }

      // 2. Upsert matches into team_matches
      const matchEntries = allEntries.filter(e => e.type === 'Partido');
      for (const m of matchEntries) {
        const payload = {
          team_id: selectedTeam,
          fecha: m.dateStr,
          rival: m.rival || m.title.replace(/^vs\s+/i, '').replace(/^@\s+/i, '') || 'Rival',
          tipo: m.title.toLowerCase().includes('@') ? 'Visitante' : 'Local',
          hora: m.hora || '20:00 h',
          lugar: m.lugar || (m.title.toLowerCase().includes('@') ? 'Campo Visitante' : 'Polideportivo La Poveda'),
          estadisticas: {}
        };
        const { error } = await supabase
          .from('team_matches')
          .upsert(payload);
        if (!error) savedMatches++;
      }

      // 3. Upsert full master monthly calendar record into attendance_sessions
      const firstOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const masterPayload = {
        team: selectedTeam,
        fecha: firstOfMonth,
        tipo: 'CalendarioMensual',
        descripcion: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          team: selectedTeam,
          events: targetEvents,
          updatedAt: new Date().toISOString()
        }),
        records: [],
        tareas: [],
        archivos: []
      };

      await supabase
        .from('attendance_sessions')
        .upsert(masterPayload);

      // Keep localStorage in sync
      localStorage.setItem(storageKey, JSON.stringify(targetEvents));

      toast.success(`¡Sincronizado con Supabase! Se han guardado los eventos, entrenamientos y partidos en la base de datos de Supabase.`, { id: toastId });
    } catch (err) {
      console.error('Error uploading calendar to Supabase:', err);
      toast.error('Error al subir los datos a Supabase.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatic Data Feeding Engine (Pulling from Partidos and Entrenamientos)
  const syncAutoData = async (showToast = true) => {
    setIsSyncing(true);
    let matchesCount = 0;
    let sessionsCount = 0;

    try {
      const autoEvents: Record<string, CalendarEvent> = { ...events };

      // 0. Fetch master monthly calendar record from Supabase if present
      const firstOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const { data: dbMaster } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('team', selectedTeam)
        .eq('fecha', firstOfMonth)
        .eq('tipo', 'CalendarioMensual');

      if (dbMaster && dbMaster.length > 0 && dbMaster[0].descripcion) {
        try {
          const parsedMaster = JSON.parse(dbMaster[0].descripcion);
          if (parsedMaster && parsedMaster.events) {
            Object.assign(autoEvents, parsedMaster.events);
          }
        } catch (e) {
          console.warn('Could not parse master calendar json from Supabase:', e);
        }
      }

      // 1. Fetch matches from Supabase
      const { data: dbMatches } = await supabase
        .from('team_matches')
        .select('*')
        .eq('team_id', selectedTeam);

      // Combine with local storage matches
      const localMatchesStr = localStorage.getItem(`team_matches_${selectedTeam}`);
      const localMatches = localMatchesStr ? JSON.parse(localMatchesStr) : [];

      const allMatchesMap = new Map<string, any>();
      (dbMatches || []).forEach(m => { if (m.fecha) allMatchesMap.set(m.fecha, m); });
      localMatches.forEach((m: any) => { if (m.fecha) allMatchesMap.set(m.fecha, m); });

      allMatchesMap.forEach((m, dateStr) => {
        const d = new Date(dateStr);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          autoEvents[dateStr] = {
            dateStr,
            title: m.tipo === 'Local' ? `vs ${m.rival}` : `@ ${m.rival}`,
            type: 'Partido',
            hora: m.hora || '20:00 h',
            lugar: m.lugar || (m.tipo === 'Local' ? 'Polideportivo La Poveda' : 'Campo Visitante'),
            rival: m.rival
          };
          matchesCount++;
        }
      });

      // 2. Fetch training / attendance sessions from Supabase
      const { data: dbSessions } = await supabase
        .from('attendance_sessions')
        .select('*');

      // Combine with local storage sessions
      const localSessionsStr = localStorage.getItem(`attendance_sessions_${selectedTeam}`);
      const localSessions = localSessionsStr ? JSON.parse(localSessionsStr) : [];

      const allSessionsMap = new Map<string, any>();
      (dbSessions || []).forEach(s => { 
        if (s.fecha && s.tipo !== 'CalendarioMensual' && (s.team_name === selectedTeam || s.team_id === selectedTeam || s.team === selectedTeam || !s.team_id)) {
          allSessionsMap.set(s.fecha, s); 
        }
      });
      localSessions.forEach((s: any) => { 
        if (s.fecha && s.tipo !== 'CalendarioMensual') allSessionsMap.set(s.fecha, s); 
      });

      allSessionsMap.forEach((s, dateStr) => {
        const d = new Date(dateStr);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          // Keep match if already set
          if (!autoEvents[dateStr] || autoEvents[dateStr].type !== 'Partido') {
            const evType: CalendarEventType = s.tipo === 'Partido' ? 'Partido' : 'Entrenamiento';
            autoEvents[dateStr] = {
              dateStr,
              title: s.descripcion || (s.tipo === 'Partido' ? 'Partido Programado' : 'Entrenamiento'),
              type: evType,
              hora: s.hora || '19:30 h'
            };
            sessionsCount++;
          }
        }
      });

      saveEvents(autoEvents);
      if (showToast) {
        if (matchesCount > 0 || sessionsCount > 0 || dbMaster?.length) {
          toast.success(`Datos sincronizados desde Supabase: ${matchesCount} partidos y ${sessionsCount} entrenamientos cargados.`);
        } else {
          toast.info('Sincronización completada desde Supabase.');
        }
      }
    } catch (err) {
      console.warn('Error syncing auto data from Supabase:', err);
      if (showToast) toast.error('Error al sincronizar datos desde Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to get formatted day grid for the selected month/year
  const getDaysGrid = () => {
    // First day of month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Number of days in month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Day of week for first day (0 = Sun, 1 = Mon, ..., 6 = Sat)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1; 
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday -> 6 in Mon-Sun indexing

    const days: { date: Date | null; dateStr: string; label: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding days if needed to complete week
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, pDay);
      const dateStr = prevDate.toISOString().split('T')[0];
      const monthAbbr = MONTH_NAMES[prevDate.getMonth()].substring(0, 3).toLowerCase();
      days.push({
        date: prevDate,
        dateStr,
        label: `${pDay}-${monthAbbr}`,
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(currentYear, currentMonth, d);
      const year = cDate.getFullYear();
      const month = String(cDate.getMonth() + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthAbbr = MONTH_NAMES[currentMonth].substring(0, 3).toLowerCase();
      days.push({
        date: cDate,
        dateStr,
        label: `${d}-${monthAbbr}`,
        isCurrentMonth: true
      });
    }

    // Next month padding days to complete grid rows
    const totalSoFar = days.length;
    const remainingInGrid = (7 - (totalSoFar % 7)) % 7;
    for (let n = 1; n <= remainingInGrid; n++) {
      const nextDate = new Date(currentYear, currentMonth + 1, n);
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(n).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthAbbr = MONTH_NAMES[nextDate.getMonth()].substring(0, 3).toLowerCase();
      days.push({
        date: nextDate,
        dateStr,
        label: `${n}-${monthAbbr}`,
        isCurrentMonth: false
      });
    }

    // Group into 7-day rows
    const rows: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }

    return rows;
  };

  // Fill standard training pattern (Tue, Thu, Fri -> Training, Mon, Wed, Sun -> Rest)
  const handleFillStandardWeeklyPattern = () => {
    const gridRows = getDaysGrid();
    const updated = { ...events };
    let count = 0;

    gridRows.forEach(row => {
      row.forEach((cell, dayIdx) => {
        if (cell.isCurrentMonth && !updated[cell.dateStr]) {
          // dayIdx: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
          if (dayIdx === 1 || dayIdx === 3 || dayIdx === 4) {
            updated[cell.dateStr] = {
              dateStr: cell.dateStr,
              title: 'Entrenamiento',
              type: 'Entrenamiento',
              hora: '19:30 h'
            };
            count++;
          } else if (dayIdx === 0 || dayIdx === 2 || dayIdx === 6) {
            updated[cell.dateStr] = {
              dateStr: cell.dateStr,
              title: 'Descanso',
              type: 'Descanso'
            };
            count++;
          }
        }
      });
    });

    saveEvents(updated);
    toast.success(`Se han completado ${count} días con el patrón semanal estándar.`);
  };

  // Open edit modal for cell
  const handleOpenEdit = (dateStr: string, label: string) => {
    const existing = events[dateStr];
    setEditingDate(dateStr);
    if (existing) {
      setEventForm({ ...existing });
    } else {
      setEventForm({
        dateStr,
        title: 'Entrenamiento',
        type: 'Entrenamiento',
        hora: '19:30 h',
        lugar: 'Polideportivo La Poveda',
        notas: ''
      });
    }
  };

  // Save event modal
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDate) return;

    const updated = {
      ...events,
      [editingDate]: {
        ...eventForm,
        dateStr: editingDate
      }
    };

    saveEvents(updated);
    setEditingDate(null);
    toast.success('Evento guardado en el calendario.');
  };

  // Delete event
  const handleDeleteEvent = (dateStr: string) => {
    const updated = { ...events };
    delete updated[dateStr];
    saveEvents(updated);
    setEditingDate(null);
    toast.success('Evento eliminado.');
  };

  // Clear entire month
  const handleClearMonth = () => {
    if (window.confirm('¿Seguro que deseas borrar todos los eventos de este mes?')) {
      saveEvents({});
      toast.success('Calendario del mes limpiado.');
    }
  };

  // Helper to generate poster image data URL using html-to-image with html2canvas fallback
  const getCalendarImageDataUrl = async (el: HTMLElement): Promise<string> => {
    // Primary approach: html-to-image (supports Tailwind v4 modern CSS)
    try {
      const dataUrl = await toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#070d1e',
        cacheBust: true,
      });
      if (dataUrl && dataUrl.length > 200) {
        return dataUrl;
      }
    } catch (err1) {
      console.warn('html-to-image failed, trying html2canvas fallback:', err1);
    }

    // Fallback: html2canvas
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#070d1e',
        logging: false,
        onclone: (clonedDoc) => {
          const pulses = clonedDoc.querySelectorAll<HTMLElement>('.animate-pulse');
          pulses.forEach(p => { p.style.animation = 'none'; });
        }
      });
      return canvas.toDataURL('image/png');
    } catch (err2) {
      console.error('Canvas capture failed:', err2);
      throw err2;
    }
  };

  // Export to Convocatoria Poster PDF
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando Calendario en PDF de alta calidad...');

    try {
      const element = printRef.current;
      const imgData = await getCalendarImageDataUrl(element);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Create temporary Image to measure dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = imgData;
      });

      const imgWidth = img.naturalWidth || 1000;
      const imgHeight = img.naturalHeight || 600;

      const margin = 5;
      const targetWidth = pdfWidth - (margin * 2);
      const targetHeight = pdfHeight - (margin * 2);

      const ratio = Math.min(targetWidth / imgWidth, targetHeight / imgHeight);
      const finalW = imgWidth * ratio;
      const finalH = imgHeight * ratio;

      const x = (pdfWidth - finalW) / 2;
      const y = (pdfHeight - finalH) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalW, finalH);
      const filename = `Calendario_${selectedTeam.replace(/\s+/g, '_')}_${MONTH_NAMES[currentMonth]}_${currentYear}.pdf`;
      pdf.save(filename);

      toast.success('¡Calendario descargado en PDF con éxito!', { id: toastId });
    } catch (e) {
      console.error('Error al exportar en PDF:', e);
      toast.error('Ocurrió un error al generar el PDF. Puedes intentar descargar como Imagen PNG o compartir por WhatsApp.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PNG Image
  const handleExportPNG = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando imagen HD PNG...');

    try {
      const element = printRef.current;
      const imgData = await getCalendarImageDataUrl(element);

      const link = document.createElement('a');
      link.download = `Calendario_${selectedTeam.replace(/\s+/g, '_')}_${MONTH_NAMES[currentMonth]}_${currentYear}.png`;
      link.href = imgData;
      link.click();

      toast.success('¡Imagen HD del calendario descargada!', { id: toastId });
    } catch (e) {
      console.error('Error al exportar PNG:', e);
      toast.error('Error al generar la imagen PNG.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate WhatsApp summary text for current month's events
  const generateWhatsAppSummary = () => {
    const monthName = MONTH_NAMES[currentMonth].toUpperCase();
    let text = `📅 *UD LA POVEDA - CALENDARIO DE ${monthName} ${currentYear}*\n`;
    text += `⚽ *Equipo:* ${selectedTeam}\n`;
    text += `🏆 *Temporada:* ${seasonLabel}\n`;
    text += `------------------------------------\n\n`;

    const sortedDates = Object.keys(events).sort();
    let matchesList: string[] = [];
    let trainingList: string[] = [];
    let keyEventsList: string[] = [];

    sortedDates.forEach(dateStr => {
      const ev = events[dateStr];
      if (!ev) return;
      const dateObj = new Date(dateStr);
      const dayNum = dateObj.getDate();
      const dayName = WEEKDAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1].substring(0, 3);
      const formattedDate = `${dayName} ${dayNum}`;

      if (ev.type === 'Partido') {
        matchesList.push(`⚽ *${formattedDate}:* ${ev.title}${ev.hora ? ` a las ${ev.hora}` : ''}${ev.lugar ? ` (${ev.lugar})` : ''}`);
      } else if (ev.type === 'Inicio Liga' || ev.type === 'Torneo') {
        keyEventsList.push(`🏆 *${formattedDate}:* ${ev.title.toUpperCase()}`);
      } else if (ev.type === 'Entrenamiento') {
        trainingList.push(`🏃 *${formattedDate}:* ${ev.hora || '19:30 h'}`);
      }
    });

    if (keyEventsList.length > 0) {
      text += `🔥 *EVENTOS DESTACADOS:*\n${keyEventsList.join('\n')}\n\n`;
    }

    if (matchesList.length > 0) {
      text += `⚽ *PARTIDOS PROGRAMADOS:*\n${matchesList.join('\n')}\n\n`;
    } else {
      text += `⚽ *PARTIDOS:* Sin partidos confirmados aún.\n\n`;
    }

    if (trainingList.length > 0) {
      text += `🏃 *ENTRENAMIENTOS:*\n${trainingList.join('\n')}\n\n`;
    }

    text += `------------------------------------\n`;
    text += `🔵⚪ *¡CONFIANZA, ENTREGA Y VICTORIA! ¡A POR TODAS!* ⚽🔥`;

    return text;
  };

  const handleOpenWhatsAppModal = () => {
    const summaryText = generateWhatsAppSummary();
    setWhatsappMsg(summaryText);
    setShowWhatsAppModal(true);
  };

  // Convocatoria FIFA style event badge mapping
  const getEventBadgeStyle = (ev?: CalendarEvent) => {
    if (!ev || !ev.title) {
      return {
        bg: 'bg-transparent',
        text: 'text-slate-600',
        border: 'border-transparent',
        shadow: ''
      };
    }

    switch (ev.type) {
      case 'Descanso':
        return {
          bg: 'bg-amber-950/70 border border-amber-500/30',
          text: 'text-amber-300 font-extrabold',
          border: 'border-amber-500/30',
          shadow: 'shadow-sm'
        };
      case 'Entrenamiento':
        return {
          bg: 'bg-emerald-950/80 border border-emerald-500/40',
          text: 'text-emerald-300 font-extrabold',
          border: 'border-emerald-500/40',
          shadow: 'shadow-sm'
        };
      case 'Partido':
        return {
          bg: 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 border border-blue-400/50',
          text: 'text-white font-black uppercase tracking-wider',
          border: 'border-blue-400/50',
          shadow: 'shadow-lg shadow-blue-600/30'
        };
      case 'Inicio Liga':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-rose-600 border border-red-400',
          text: 'text-white font-black uppercase tracking-widest',
          border: 'border-red-400',
          shadow: 'shadow-md shadow-red-600/30'
        };
      case 'Torneo':
        return {
          bg: 'bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400',
          text: 'text-white font-black uppercase tracking-wider',
          border: 'border-purple-400',
          shadow: 'shadow-md shadow-purple-600/30'
        };
      default:
        return {
          bg: 'bg-slate-800/80 border border-slate-700',
          text: 'text-slate-200 font-bold',
          border: 'border-slate-700',
          shadow: ''
        };
    }
  };

  const gridRows = getDaysGrid();

  return (
    <div className="space-y-6">
      
      {/* Top Action Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl">
        
        {/* Month Navigation & Team info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(prev => prev - 1);
                } else {
                  setCurrentMonth(prev => prev - 1);
                }
              }}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="px-3 py-1 text-center min-w-[150px]">
              <span className="font-black text-white text-sm uppercase tracking-wide block">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-wider block">
                {selectedTeam}
              </span>
            </div>

            <Button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(prev => prev + 1);
                } else {
                  setCurrentMonth(prev => prev + 1);
                }
              }}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-blue-950/40 border border-blue-900/60 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Temporada {seasonLabel}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <Button
            onClick={() => handleUploadToSupabase()}
            disabled={isSyncing}
            className="text-xs font-black uppercase bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 gap-1.5 rounded-xl h-9 px-3.5 cursor-pointer"
            title="Guardar y subir todos los eventos del calendario a la base de datos Supabase"
          >
            <CloudUpload className={`w-4 h-4 text-cyan-200 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Subir a Supabase</span>
          </Button>

          <Button
            onClick={() => syncAutoData(true)}
            disabled={isSyncing}
            variant="outline"
            className="text-xs font-bold uppercase border-blue-500/30 hover:bg-blue-950/30 text-blue-400 hover:text-blue-300 gap-1.5 rounded-xl h-9 cursor-pointer"
            title="Sincronizar automáticamente desde Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Cargando...' : 'Cargar de Supabase'}</span>
          </Button>

          <Button
            onClick={handleFillStandardWeeklyPattern}
            variant="outline"
            className="text-xs font-bold uppercase border-emerald-500/30 hover:bg-emerald-950/30 text-emerald-400 hover:text-emerald-300 gap-1.5 rounded-xl h-9 cursor-pointer"
            title="Completar semanas con patrón: Mar/Jue/Vie entrenamientos y Lun/Mié/Dom descanso"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Patrón Semanal</span>
          </Button>

          <Button
            onClick={handleClearMonth}
            variant="ghost"
            className="text-xs font-bold uppercase text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-9 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>

          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="text-xs font-extrabold uppercase bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 gap-2 rounded-xl h-9 px-4 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-200" />
            <span>{isExporting ? 'Exportando...' : 'Descargar PDF'}</span>
          </Button>

          <Button
            onClick={handleExportPNG}
            disabled={isExporting}
            variant="outline"
            className="text-xs font-bold uppercase border-blue-500/40 text-blue-300 hover:bg-blue-950/40 gap-1.5 rounded-xl h-9 px-3 cursor-pointer"
            title="Descargar como imagen PNG de alta calidad"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xl:inline">Imagen PNG</span>
          </Button>

          <Button
            onClick={handleOpenWhatsAppModal}
            className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 gap-2 rounded-xl h-9 px-4 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-100" />
            <span>Enviar por WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Main High-Definition Convocatoria Poster Printable Area */}
      <div className="overflow-x-auto rounded-[2.5rem] border border-blue-900/60 shadow-2xl bg-[#070d1e] p-4 sm:p-6">
        <div 
          ref={printRef}
          className="w-full min-w-[850px] bg-gradient-to-b from-[#0a1228] via-[#0e1b3d] to-[#070d1e] text-white p-6 sm:p-8 rounded-[2rem] border-2 border-blue-600/40 space-y-6 font-sans relative shadow-2xl"
        >
          {/* Top Convocatoria Header */}
          <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b-2 border-blue-900/60 relative">
            
            {/* Crest Logo Badge */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0a1738] border-2 border-blue-400/50 p-2.5 shadow-xl flex items-center justify-center relative shadow-blue-500/20 group">
              <UDLaPovedaLogo className="w-full h-full object-contain" />
              <div className="absolute inset-0 rounded-full border border-blue-400/20 animate-pulse pointer-events-none" />
            </div>

            {/* Club & Category Titles */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-black italic tracking-wider text-white uppercase drop-shadow-md">
                UD LA POVEDA
              </h2>
              <p className="text-xs sm:text-sm font-black text-blue-400 uppercase tracking-widest mt-1">
                {selectedTeam} • CALENDARIO MENSUAL DE ACTIVIDAD
              </p>
            </div>

            {/* Sub-Pills matching Convocatoria style */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 font-black text-slate-100 bg-[#12244a] px-4 py-1.5 rounded-full border border-blue-400/30 text-xs shadow-md uppercase tracking-wide">
                📅 MES DE {MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}
              </span>
              <span className="inline-flex items-center gap-1.5 font-black text-white bg-blue-600 px-4 py-1.5 rounded-full border border-blue-300/40 text-xs shadow-md uppercase tracking-wider">
                🏠 TEMPORADA {seasonLabel}
              </span>
            </div>
          </div>

          {/* Calendar Table Grid (Convocatoria Glassmorphic Theme) */}
          <div className="bg-[#0a1532]/90 border border-[#1b2f5c] rounded-2xl p-3 shadow-2xl space-y-2">
            
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 bg-[#122349] border border-[#1e3870] rounded-xl text-center py-2.5 font-black text-xs sm:text-sm text-blue-200 uppercase tracking-widest shadow-inner">
              {WEEKDAYS.map(day => (
                <div key={day} className="tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Rows */}
            <div className="space-y-1.5">
              {gridRows.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-7 gap-1.5">
                  {row.map((cell, cIdx) => {
                    const event = events[cell.dateStr];
                    const badgeStyle = getEventBadgeStyle(event);

                    return (
                      <div 
                        key={cIdx} 
                        onClick={() => handleOpenEdit(cell.dateStr, cell.label)}
                        className={`min-h-[85px] sm:min-h-[95px] rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${
                          !cell.isCurrentMonth 
                            ? 'opacity-30 bg-[#080d1e]/50 border-slate-900' 
                            : 'bg-[#0d1b3a]/90 hover:bg-[#142854] border-[#1e3a70] hover:border-blue-400/50 shadow-md'
                        }`}
                      >
                        {/* Day Header Pill inside Cell */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-[#16274e] text-slate-200 border border-blue-500/20 shadow-sm">
                            {cell.label}
                          </span>
                          {event?.hora && (
                            <span className="text-[9px] font-extrabold text-blue-300 flex items-center gap-0.5">
                              ⏰ {event.hora}
                            </span>
                          )}
                        </div>

                        {/* Event Content Badge inside Cell */}
                        <div className={`mt-1.5 flex-1 flex flex-col justify-center items-center text-center p-1.5 rounded-lg text-xs transition-all ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.shadow}`}>
                          <span className="line-clamp-2 leading-snug">{event?.title || ''}</span>
                          {event?.type === 'Partido' && event?.lugar && (
                            <span className="text-[8px] font-bold text-blue-200 block mt-0.5 opacity-90 truncate max-w-full">
                              📍 {event.lugar}
                            </span>
                          )}
                        </div>

                        {/* Quick Edit Icon on Hover */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white p-1 rounded-md shadow">
                          <Edit3 className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Motivation Banner (Convocatoria Footer) */}
          <div className="pt-3 border-t border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Legend Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 mr-1">LEYENDA:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                🏃 Entrenamiento
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                😴 Descanso
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white border border-blue-400 text-[11px] font-black uppercase">
                ⚽ Partido
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white border border-red-400 text-[11px] font-black uppercase">
                🏆 Inicio Liga
              </span>
            </div>

            {/* Motivation Quote */}
            <div className="text-xs font-black tracking-widest text-slate-100 flex items-center gap-1.5 uppercase bg-[#0e1d40] px-4 py-2 rounded-full border border-blue-400/30 shadow-lg">
              <span>🔵⚪ ¡CONFIANZA, ENTREGA Y VICTORIA! ¡A POR TODAS! ⚽ 🔥</span>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Export & WhatsApp Share Footer Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-black shrink-0">
            💬
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              ¿Quieres compartir este calendario?
            </h4>
            <p className="text-[11px] text-slate-400">
              Descarga el archivo PDF de alta resolución o envía un resumen estructurado por WhatsApp al grupo del equipo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <Button
            onClick={() => handleUploadToSupabase()}
            disabled={isSyncing}
            className="text-xs font-black uppercase bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 gap-2 rounded-xl h-10 px-4 cursor-pointer"
          >
            <CloudUpload className={`w-4 h-4 text-cyan-200 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Subir a Supabase</span>
          </Button>

          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            className="text-xs font-bold uppercase border-blue-500/40 text-blue-300 hover:bg-blue-950/50 gap-2 rounded-xl h-10 px-4 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Descargar PDF</span>
          </Button>

          <Button
            onClick={handleExportPNG}
            disabled={isExporting}
            variant="outline"
            className="text-xs font-bold uppercase border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 rounded-xl h-10 px-4 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Descargar PNG</span>
          </Button>

          <Button
            onClick={handleOpenWhatsAppModal}
            className="text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 gap-2 rounded-xl h-10 px-5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar por WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-emerald-950/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                  Enviar Calendario por WhatsApp
                </h3>
              </div>
              <button 
                onClick={() => setShowWhatsAppModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Puedes revisar y editar el texto del calendario de <strong className="text-white">{MONTH_NAMES[currentMonth]} {currentYear}</strong> antes de enviarlo:
              </p>

              <textarea
                rows={11}
                value={whatsappMsg}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappMsg);
                    toast.success('¡Texto del calendario copiado al portapapeles!');
                  }}
                  className="text-xs font-bold border-slate-800 text-slate-300 hover:text-white rounded-xl gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>Copiar Texto</span>
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
                      window.open(url, '_blank');
                    }}
                    className="text-xs font-bold border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/40 rounded-xl gap-1.5 cursor-pointer hidden sm:flex"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>WhatsApp Web</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
                      window.open(url, '_blank');
                    }}
                    className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 px-4"
                  >
                    <Send className="w-4 h-4" />
                    <span>Abrir WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                  Editar Evento ({editingDate})
                </h3>
              </div>
              <button 
                onClick={() => setEditingDate(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tipo de Actividad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Entrenamiento', 'Descanso', 'Partido', 'Inicio Liga', 'Torneo', 'Personalizado'] as CalendarEventType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        let titleStr: string = t;
                        if (t === 'Entrenamiento') titleStr = 'Entrenamiento';
                        if (t === 'Descanso') titleStr = 'Descanso';
                        if (t === 'Inicio Liga') titleStr = 'INICIO LIGA';
                        if (t === 'Partido') titleStr = eventForm.rival ? `vs ${eventForm.rival}` : 'Partido';

                        setEventForm({
                          ...eventForm,
                          type: t,
                          title: titleStr
                        });
                      }}
                      className={`px-3 py-2 text-xs font-black rounded-xl border transition-all text-center uppercase tracking-wider cursor-pointer ${
                        eventForm.type === t 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Texto Principal en la Celda *
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                  placeholder="Ej. Entrenamiento, vs AD PARLA, INICIO LIGA..."
                />
              </div>

              {eventForm.type === 'Partido' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Nombre del Rival / Equipo
                  </label>
                  <input 
                    type="text"
                    value={eventForm.rival || ''}
                    onChange={(e) => setEventForm({ ...eventForm, rival: e.target.value, title: `vs ${e.target.value}` })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Ej. AD PARLA"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Hora (Opcional)
                  </label>
                  <input 
                    type="text"
                    value={eventForm.hora || ''}
                    onChange={(e) => setEventForm({ ...eventForm, hora: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Ej. 20:00 h"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Lugar (Opcional)
                  </label>
                  <input 
                    type="text"
                    value={eventForm.lugar || ''}
                    onChange={(e) => setEventForm({ ...eventForm, lugar: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Ej. Polideportivo La Poveda"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDeleteEvent(editingDate)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span>Borrar Celda</span>
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDate(null)}
                    className="text-xs font-bold border-slate-800 text-slate-300 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="text-xs font-extrabold uppercase bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

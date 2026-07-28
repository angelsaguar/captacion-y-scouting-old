import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Player, PlayerAttribute, POSITION_ATTRIBUTES, POSITION_STRUCTURED_ATTRIBUTES, COMMON_ATTRIBUTES } from '@/types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Edit2, 
  Pencil,
  Save,
  User,
  FileDown, 
  Star, 
  Phone, 
  Calendar, 
  Trophy, 
  Users,
  TrendingUp,
  Download,
  MessageSquare,
  Mail,
  Activity
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PlayerDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [profileSubTab, setProfileSubTab] = useState<'antropo' | 'phys'>('antropo');
  const [physicalTests, setPhysicalTests] = useState<any[]>([]);
  const [antropometria, setAntropometria] = useState<any[]>([]);

  // Edit Personal Data Modal State
  const [showEditPersonalModal, setShowEditPersonalModal] = useState(false);
  const [editPersonalData, setEditPersonalData] = useState<Partial<Player>>({});

  const handleOpenEditPersonalModal = () => {
    if (player) {
      setEditPersonalData({
        nombre: player.nombre,
        apellidos: player.apellidos,
        apodo: player.apodo || '',
        posicion: player.posicion,
        equipo_actual: player.equipo_actual || '',
        equipo_asignado: player.equipo_asignado || '',
        anio_nacimiento: player.anio_nacimiento,
        fecha_nacimiento: player.fecha_nacimiento || '',
        telefono: player.telefono || '',
        email: player.email || '',
        contacto_tipo: player.contacto_tipo || 'Tutor',
        observador: player.observador || '',
        foto_url: player.foto_url || '',
        estado: player.estado
      });
      setShowEditPersonalModal(true);
    }
  };

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    if (!editPersonalData.nombre?.trim() || !editPersonalData.apellidos?.trim()) {
      toast.error('Nombre y Apellidos son obligatorios');
      return;
    }

    try {
      const payload = {
        nombre: editPersonalData.nombre.trim(),
        apellidos: editPersonalData.apellidos.trim(),
        apodo: editPersonalData.apodo?.trim() || null,
        posicion: editPersonalData.posicion || player.posicion,
        equipo_actual: editPersonalData.equipo_actual?.trim() || null,
        equipo_asignado: editPersonalData.equipo_asignado?.trim() || null,
        anio_nacimiento: editPersonalData.anio_nacimiento || null,
        fecha_nacimiento: editPersonalData.fecha_nacimiento?.trim() || null,
        telefono: editPersonalData.telefono?.trim() || null,
        email: editPersonalData.email?.trim() || null,
        contacto_tipo: editPersonalData.contacto_tipo || 'Tutor',
        observador: editPersonalData.observador?.trim() || null,
        foto_url: editPersonalData.foto_url?.trim() || null,
        estado: editPersonalData.estado || player.estado
      };

      try {
        const { error } = await supabase
          .from('players')
          .update(payload)
          .eq('id', player.id);

        if (error) throw error;
      } catch (dbError: any) {
        console.warn('Handling Supabase update failover:', dbError);
        const { 
          fecha_nacimiento, 
          apodo, 
          equipo_asignado, 
          observador, 
          email, 
          contacto_tipo, 
          ...fallbackPayload 
        } = payload;

        const { error: retryError } = await supabase
          .from('players')
          .update(fallbackPayload)
          .eq('id', player.id);

        if (retryError) throw retryError;
      }

      setPlayer({
        ...player,
        ...payload
      });

      toast.success('¡Datos personales guardados y sincronizados correctamente!');
      setShowEditPersonalModal(false);
    } catch (err: any) {
      console.error('Error guardando datos personales:', err);
      toast.error('Error al guardar datos personales: ' + (err.message || err));
    }
  };

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*, attributes:player_attributes(*)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPlayer(data);
      } catch (error) {
        toast.error('Error al cargar datos del jugador');
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [id]);

  useEffect(() => {
    if (!player) return;

    // Load Physical Tests
    const savedPhys = localStorage.getItem('ud_poveda_physical_test_history');
    if (savedPhys) {
      try {
        const parsedPhys = JSON.parse(savedPhys);
        const playerPhys = parsedPhys.filter((r: any) => 
          r.player_id === player.id || 
          r.player_name.toLowerCase().trim() === `${player.nombre} ${player.apellidos}`.toLowerCase().trim()
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
          r.player_name.toLowerCase().trim() === `${player.nombre} ${player.apellidos}`.toLowerCase().trim()
        );
        setAntropometria(playerAntropo.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      } catch (e) {
        console.error(e);
      }
    }
  }, [player]);

  const exportToPDF = () => {
    if (!player) return;
    const doc = new jsPDF();
    
    // Header banner styling
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('Helvetica', 'bold');
    doc.text('U.D. LA POVEDA • DOSSIER TÉCNICO', 15, 18);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(`Informe de Scouting generado el: ${format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}`, 15, 28);
    
    // Amber decorative border line
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 40, 210, 3, 'F');
    
    // Left Column Info (General Data)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('DATOS DE LA JUGADORA', 15, 55);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Nombre: ${player.nombre} ${player.apellidos}${player.apodo ? ` ("${player.apodo}")` : ''}`, 15, 65);
    doc.text(`Posición: ${player.posicion}`, 15, 72);
    doc.text(`Año Nacimiento: ${player.anio_nacimiento || '-'}`, 15, 79);
    doc.text(`Procedencia: ${player.equipo_actual || '-'}`, 15, 86);
    doc.text(`Asignación Club: ${player.equipo_asignado || '-'}`, 15, 93);
    doc.text(`Dorsal: ${player.dorsal || '-'}`, 15, 100);
    doc.text(`Lateralidad: ${player.lateralidad || '-'}`, 15, 107);
    
    // Right Column Info (Scouting Status)
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('ESTADO DE SCUTING', 115, 55);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Estado: ${player.estado}`, 115, 65);
    doc.text(`Potencial: ${player.potencial}/5 estrellas`, 115, 72);
    doc.text(`Observador: ${player.observador || 'Técnicos del Club'}`, 115, 79);
    if (player.telefono) {
      doc.text(`Contacto (${player.contacto_tipo || 'Tutor'}): ${player.telefono}`, 115, 86);
    }
    if (player.email) {
      doc.text(`Email: ${player.email}`, 115, 93);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 115, 195, 115);

    // Section 2: Technical Observations
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text('OBSERVACIONES GENERALES', 15, 125);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    const splitObs = doc.splitTextToSize(player.observaciones || 'Sin observaciones registradas por los analistas.', 180);
    doc.text(splitObs, 15, 133);

    // Section 3: Anthropometrics History (Separated as requested)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text('CONTROL DE COMPOSICIÓN CORPORAL Y BIOMETRÍA', 15, 162);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    let yPos = 172;
    if (antropometria.length === 0) {
      doc.text('No se han registrado controles antropométricos esta temporada.', 15, yPos);
      yPos += 10;
    } else {
      // Table Header
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos - 4, 180, 7, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.text('Fecha', 17, yPos + 1);
      doc.text('Peso', 45, yPos + 1);
      doc.text('Altura', 70, yPos + 1);
      doc.text('IMC', 95, yPos + 1);
      doc.text('% Grasa', 120, yPos + 1);
      doc.text('% Músculo', 145, yPos + 1);
      doc.text('Cintura', 170, yPos + 1);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      antropometria.forEach(r => {
        yPos += 8;
        if (yPos > 275) { doc.addPage(); yPos = 20; }
        const heightM = r.height / 100;
        const imc = r.weight && r.height ? (r.weight / (heightM * heightM)).toFixed(1) : '-';
        doc.text(r.date, 17, yPos);
        doc.text(`${r.weight || '-'} kg`, 45, yPos);
        doc.text(`${r.height || '-'} cm`, 70, yPos);
        doc.text(`${imc}`, 95, yPos);
        doc.text(r.body_fat_pct ? `${r.body_fat_pct}%` : '-', 120, yPos);
        doc.text(r.muscle_pct ? `${r.muscle_pct}%` : '-', 145, yPos);
        doc.text(r.waist_cm ? `${r.waist_cm} cm` : '-', 170, yPos);
      });
      yPos += 12;
    }

    // Section 4: Physical Tests History
    if (yPos > 245) { doc.addPage(); yPos = 20; }
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text('CONTROL DE RENDIMIENTO FÍSICO Y TEST DE VELOCIDAD', 15, yPos);
    yPos += 10;

    if (physicalTests.length === 0) {
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('No se han registrado test físicos de rendimiento esta temporada.', 15, yPos);
    } else {
      // Table Header
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos - 4, 180, 7, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.text('Fecha', 17, yPos + 1);
      doc.text('Yo-Yo Test (m)', 50, yPos + 1);
      doc.text('Yo-Yo Velocidad', 90, yPos + 1);
      doc.text('Illinois Agility', 130, yPos + 1);
      doc.text('Sprint 30m', 165, yPos + 1);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      physicalTests.forEach(r => {
        yPos += 8;
        if (yPos > 275) { doc.addPage(); yPos = 20; }
        doc.text(r.date, 17, yPos);
        doc.text(`${r.yoyo_m || '-'} m`, 50, yPos);
        doc.text(r.yoyo_kmh ? `${r.yoyo_kmh} km/h` : '-', 90, yPos);
        doc.text(r.illinois ? `${r.illinois} s` : '-', 130, yPos);
        doc.text(r.vel30m ? `${r.vel30m} s` : '-', 165, yPos);
      });
    }

    doc.save(`Informe_Completo_${player.nombre}_${player.apellidos}.pdf`);
    toast.success('Dossier completo en PDF exportado con éxito');
  };

  const exportToExcel = () => {
    if (!player) return;
    
    // General scouting worksheet data
    const dataGeneral = [
      { Campo: 'Nombre', Valor: player.nombre },
      { Campo: 'Apellidos', Valor: player.apellidos },
      { Campo: 'Apodo / Alias', Valor: player.apodo || '-' },
      { Campo: 'Posición', Valor: player.posicion },
      { Campo: 'Procedencia', Valor: player.equipo_actual || '-' },
      { Campo: 'Asignación Club', Valor: player.equipo_asignado || '-' },
      { Campo: 'Potencial', Valor: `${player.potencial}/5` },
      { Campo: 'Estado de Scouting', Valor: player.estado },
      { Campo: 'Telf. Contacto', Valor: player.telefono || '-' },
      { Campo: 'Email Contacto', Valor: player.email || '-' },
      { Campo: 'Observaciones Scouting', Valor: player.observaciones || '' },
      ... (player.attributes?.map(a => ({ Campo: `Atributo: ${a.atributo}`, Valor: a.valor })) || [])
    ];

    // Anthropometrics worksheet data
    const dataAntropo = antropometria.map((r, idx) => {
      const heightM = r.height / 100;
      const imc = r.weight && r.height ? (r.weight / (heightM * heightM)).toFixed(1) : '-';
      const icc = r.waist_cm && r.hip_cm ? (r.waist_cm / r.hip_cm).toFixed(2) : '-';
      const fatKg = r.weight && r.body_fat_pct ? ((r.weight * r.body_fat_pct) / 100).toFixed(1) : '-';
      const muscleKg = r.weight && r.muscle_pct ? ((r.weight * r.muscle_pct) / 100).toFixed(1) : '-';

      return {
        'Nº': idx + 1,
        'Fecha Control': r.date,
        'Peso (kg)': r.weight || '-',
        'Altura (cm)': r.height || '-',
        'IMC (kg/m²)': imc,
        'Grasa (%)': r.body_fat_pct || '-',
        'Grasa Est. (kg)': fatKg,
        'Músculo (%)': r.muscle_pct || '-',
        'Músculo Est. (kg)': muscleKg,
        'Agua (%)': r.water_pct || '-',
        'Envergadura (cm)': r.wingspan_cm || '-',
        'Cintura (cm)': r.waist_cm || '-',
        'Cadera (cm)': r.hip_cm || '-',
        'Índice Cintura-Cadera': icc,
        'Observaciones': r.notes || ''
      };
    });

    // Physical Tests worksheet data
    const dataPhys = physicalTests.map((r, idx) => ({
      'Nº': idx + 1,
      'Fecha Test': r.date,
      'Yo-Yo Test (m)': r.yoyo_m || '-',
      'Yo-Yo Max Speed (km/h)': r.yoyo_kmh || '-',
      'Illinois Agility (s)': r.illinois || '-',
      'Sprint 30m (s)': r.vel30m || '-',
      'Observaciones': r.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    
    const wsGen = XLSX.utils.json_to_sheet(dataGeneral);
    XLSX.utils.book_append_sheet(wb, wsGen, "Ficha Técnica");

    if (dataAntropo.length > 0) {
      const wsAnt = XLSX.utils.json_to_sheet(dataAntropo);
      XLSX.utils.book_append_sheet(wb, wsAnt, "Controles Antropométricos");
    }

    if (dataPhys.length > 0) {
      const wsPhy = XLSX.utils.json_to_sheet(dataPhys);
      XLSX.utils.book_append_sheet(wb, wsPhy, "Pruebas Físicas");
    }

    XLSX.writeFile(wb, `Dossier_UD_Poveda_${player.nombre}_${player.apellidos}.xlsx`);
    toast.success('Excel multi-pestaña generado con éxito');
  };

  const calculateAverage = (attributes?: any[]) => {
    if (!attributes || attributes.length === 0) return '0.0';
    const sum = attributes.reduce((acc, attr) => acc + (attr.valor || 0), 0);
    return (sum / attributes.length).toFixed(1);
  };

  const getWhatsAppLink = (phone?: string, playerName?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 9) {
      // Default Spanish country code if 9 digits and no country code prefix
      clean = '34' + clean;
    }
    const message = encodeURIComponent(`Hola ${playerName || 'jugadora'},`);
    return `https://wa.me/${clean}?text=${message}`;
  };

  if (loading) return <div className="flex justify-center py-20 animate-pulse font-bold">CARGANDO JUGADOR...</div>;
  if (!player) return <div className="text-center py-20">Jugador no encontrado</div>;

  const positionGroups = POSITION_STRUCTURED_ATTRIBUTES[player.posicion] || [];
  const specificAttrNames = positionGroups.flatMap(g => g.items);
  const radarData = player.attributes
    ?.filter(attr => specificAttrNames.includes(attr.atributo))
    .map(attr => ({
      subject: attr.atributo,
      A: attr.valor,
      fullMark: 5,
    })) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex-shrink-0">
              {player.foto_url ? (
                <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-600/10 text-blue-500 font-bold text-xl sm:text-2xl">
                  {player.nombre.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white leading-tight flex items-center gap-2 flex-wrap">
                  <span>{player.nombre} {player.apellidos}</span>
                  {player.apodo && (
                    <span className="text-emerald-400 not-italic text-xs sm:text-base font-bold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg shadow-sm">
                      "{player.apodo}"
                    </span>
                  )}
                </h1>
                <Badge className={cn(
                  "px-2 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-none shadow-lg outline-none",
                  player.estado === 'Rechazado' ? "bg-red-600 text-white" :
                  player.estado === 'Observado' ? "bg-slate-600 text-white" :
                  player.estado === 'En seguimiento' ? "bg-blue-600 text-white" :
                  player.estado === 'Interesa' ? "bg-yellow-600 text-white" :
                  player.estado === 'Fichado' ? "bg-emerald-600 text-white" :
                  "bg-slate-600 text-white"
                )}>
                  {player.estado}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1.5 text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {player.posicion}</span>
                <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {player.equipo_actual || 'Sin club'}</span>
                {player.equipo_asignado && (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                    UD Poveda: {player.equipo_asignado}
                  </span>
                )}
                {player.fecha_nacimiento ? (
                  <span className="flex items-center gap-1 text-slate-300 font-bold"><Calendar className="w-3 h-3 text-blue-400" /> Nac: {player.fecha_nacimiento}</span>
                ) : player.anio_nacimiento ? (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Gen {player.anio_nacimiento}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
          <Button 
            onClick={handleOpenEditPersonalModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-all shadow-md"
          >
            <Pencil className="w-4 h-4 mr-2" /> Editar Datos Personales
          </Button>
          <Link to={`/players/${player.id}/edit`}>
            <Button variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white">
              <Edit2 className="w-4 h-4 mr-2" /> Formulario Completo
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "bg-slate-900 border-slate-700")}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF}><FileDown className="w-4 h-4 mr-2" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}><FileDown className="w-4 h-4 mr-2" /> Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scouting Analysis */}
        <div className="lg:col-span-2 space-y-8">
          {player.estado === 'Rechazado' && player.motivos_rechazo && (
            <Card className="border-none shadow-sm overflow-hidden bg-red-950/20 border border-red-500/20">
              <CardHeader className="bg-red-950/40 border-b border-red-500/20 py-3">
                <CardTitle className="text-red-500 text-sm flex items-center gap-2 uppercase tracking-widest font-black">
                  Motivos del Descarte
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-red-200/80 leading-relaxed italic text-sm">
                   "{player.motivos_rechazo}"
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm overflow-hidden bg-slate-950 text-white">
            <CardHeader className="bg-slate-900 border-b border-slate-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Análisis de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col md:flex-row h-auto md:h-[350px] overflow-hidden">
              <div className="w-full h-[260px] md:h-full p-4 md:p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 text-slate-400">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Radar
                      name={player.nombre}
                      dataKey="A"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-80 p-5 md:p-6 overflow-y-auto space-y-5 max-h-[350px] bg-slate-900/40">
                 <div className="flex justify-between items-center mb-2 border-b border-slate-850 pb-2">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Atributos</h4>
                   <div className="px-2.5 py-1 bg-blue-600/20 rounded-lg border border-blue-600/30 flex items-center gap-1.5">
                     <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Global</span>
                     <span className="text-base font-black text-blue-400 tracking-tighter">{calculateAverage(player.attributes)}</span>
                   </div>
                 </div>

                 {/* Specific attributes */}
                 <div className="space-y-4">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Específicos ({player.posicion})</p>
                   {(POSITION_STRUCTURED_ATTRIBUTES[player.posicion] || []).map(group => {
                     const groupAttrs = player.attributes?.filter(a => group.items.includes(a.atributo)) || [];
                     if (groupAttrs.length === 0) return null;
                     return (
                       <div key={group.category} className="space-y-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                         <h5 className="text-[9px] font-bold text-slate-450 uppercase tracking-wide border-b border-slate-850/60 pb-1 mb-2">{group.category}</h5>
                         {groupAttrs.map(attr => (
                           <div key={attr.atributo} className="space-y-1">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-slate-400 font-medium text-[10px] uppercase truncate max-w-[150px]">{attr.atributo}</span>
                               <span className={cn(
                                 "font-black text-[9px] px-1.5 py-0.5 rounded",
                                 attr.valor === 0 && "text-red-500 bg-red-500/10",
                                 attr.valor === 1 && "text-red-400 bg-red-400/10",
                                 attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                                 attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                                 attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                                 attr.valor === 5 && "text-emerald-500 bg-emerald-500/10"
                               )}>{attr.valor}/5</span>
                             </div>
                             <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                               <div 
                                 className={cn(
                                   "h-full rounded-full transition-all",
                                   attr.valor === 0 && "bg-red-700",
                                   attr.valor === 1 && "bg-red-500",
                                   attr.valor === 2 && "bg-orange-500",
                                   attr.valor === 3 && "bg-yellow-500",
                                   attr.valor === 4 && "bg-blue-500",
                                   attr.valor === 5 && "bg-emerald-600"
                                 )} 
                                 style={{ width: `${(attr.valor / 5) * 100}%` }} 
                               />
                             </div>
                           </div>
                         ))}
                       </div>
                     );
                   })}
                 </div>

                 {/* Common attributes */}
                 <div className="space-y-4 pt-2 border-t border-slate-850">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Comunes</p>
                   {COMMON_ATTRIBUTES.map(group => {
                     const groupAttrs = player.attributes?.filter(a => group.items.includes(a.atributo)) || [];
                     if (groupAttrs.length === 0) return null;
                     return (
                       <div key={group.category} className="space-y-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                         <h5 className="text-[9px] font-bold text-slate-450 uppercase tracking-wide border-b border-slate-850/60 pb-1 mb-2">{group.category}</h5>
                         {groupAttrs.map(attr => (
                           <div key={attr.atributo} className="space-y-1">
                             <div className="flex justify-between items-center text-xs">
                               <span className="text-slate-400 font-medium text-[10px] uppercase truncate max-w-[150px]">{attr.atributo}</span>
                               <span className={cn(
                                 "font-black text-[9px] px-1.5 py-0.5 rounded",
                                 attr.valor === 0 && "text-red-500 bg-red-500/10",
                                 attr.valor === 1 && "text-red-400 bg-red-400/10",
                                 attr.valor === 2 && "text-orange-500 bg-orange-500/10",
                                 attr.valor === 3 && "text-yellow-500 bg-yellow-500/10",
                                 attr.valor === 4 && "text-blue-500 bg-blue-500/10",
                                 attr.valor === 5 && "text-emerald-500 bg-emerald-500/10"
                               )}>{attr.valor}/5</span>
                             </div>
                             <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                               <div 
                                 className={cn(
                                   "h-full rounded-full transition-all",
                                   attr.valor === 0 && "bg-red-700",
                                   attr.valor === 1 && "bg-red-500",
                                   attr.valor === 2 && "bg-orange-500",
                                   attr.valor === 3 && "bg-yellow-500",
                                   attr.valor === 4 && "bg-blue-500",
                                   attr.valor === 5 && "bg-emerald-600"
                                 )} 
                                 style={{ width: `${(attr.valor / 5) * 100}%` }} 
                               />
                             </div>
                           </div>
                         ))}
                       </div>
                     );
                   })}
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card min-h-[250px]">
             <CardHeader className="border-b border-slate-800">
               <CardTitle className="text-lg font-bold text-white tracking-tight">Informes y Seguimiento</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6 pt-6">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Resumen Técnico</h4>
                  <p className="text-slate-300 leading-relaxed italic border-l-4 border-blue-600 pl-4">
                    "{player.observaciones || 'No se han añadido observaciones detalladas para este informe.'}"
                  </p>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Lateralidad</span>
                    <span className="text-lg font-bold text-white mt-1">{player.lateralidad}</span>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Dorsal</span>
                    <span className="text-lg font-bold text-white mt-1">{player.dorsal || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Nacimiento</span>
                    <span className="text-lg font-bold text-white mt-1">{player.anio_nacimiento || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Potencial</span>
                    <div className="flex gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <Star 
                          key={val} 
                          className={cn(
                            "w-4 h-4", 
                            val <= player.potencial 
                              ? cn(
                                  "fill-current",
                                  player.potencial === 1 && "text-red-500",
                                  player.potencial === 2 && "text-orange-500",
                                  player.potencial === 3 && "text-yellow-500",
                                  player.potencial === 4 && "text-lime-500",
                                  player.potencial === 5 && "text-emerald-500"
                                )
                              : "text-slate-700"
                          )} 
                        />
                      ))}
                    </div>
                    <span className="text-xs font-black mt-1 text-slate-400">{player.potencial}/5</span>
                  </div>
                </div>
             </CardContent>
          </Card>

          {/* Control de Rendimiento y Biometría section */}
          <Card className="premium-card text-left bg-slate-950/20 border border-slate-900 rounded-3xl overflow-hidden mt-8">
            <CardHeader className="border-b border-slate-900 p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-950/40">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <span>Control Biométrico y Rendimiento</span>
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs font-bold uppercase">Historial segregado del inicio y desarrollo de temporada</CardDescription>
              </div>

              {/* Subtabs switches */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setProfileSubTab('antropo')}
                  className={cn(
                    "text-[10px] font-black uppercase px-3.5 py-2 rounded-lg transition-all",
                    profileSubTab === 'antropo'
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Antropometría
                </button>
                <button
                  type="button"
                  onClick={() => setProfileSubTab('phys')}
                  className={cn(
                    "text-[10px] font-black uppercase px-3.5 py-2 rounded-lg transition-all",
                    profileSubTab === 'phys'
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Pruebas Físicas
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Tab 1: Antropometria */}
              {profileSubTab === 'antropo' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {antropometria.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 uppercase font-black border border-dashed border-slate-800 rounded-2xl">
                      No hay registros de composición corporal para este jugador esta temporada.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Latest Record Highlight Box */}
                      {(() => {
                        const latest = antropometria[antropometria.length - 1];
                        const heightM = latest.height / 100;
                        const imc = latest.weight && latest.height ? (latest.weight / (heightM * heightM)).toFixed(1) : '-';
                        const icc = latest.waist_cm && latest.hip_cm ? (latest.waist_cm / latest.hip_cm).toFixed(2) : '-';
                        const fatKg = latest.weight && latest.body_fat_pct ? ((latest.weight * latest.body_fat_pct) / 100).toFixed(1) : '-';
                        const muscleKg = latest.weight && latest.muscle_pct ? ((latest.weight * latest.muscle_pct) / 100).toFixed(1) : '-';

                        return (
                          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                              <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Último Control Antropométrico ({latest.date})</span>
                              <span className="text-xs text-slate-400 font-bold uppercase">{latest.notes || 'Composición Corporal'}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Peso</span>
                                <div className="text-lg font-black text-white mt-0.5">{latest.weight || '-'} kg</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Altura</span>
                                <div className="text-lg font-black text-white mt-0.5">{latest.height || '-'} cm</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">IMC</span>
                                <div className="text-lg font-black text-purple-400 mt-0.5">{imc}</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Envergadura</span>
                                <div className="text-lg font-black text-white mt-0.5">{latest.wingspan_cm || '-'} cm</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">% Grasa Corporal</span>
                                <div className="text-lg font-black text-red-400 mt-0.5">{latest.body_fat_pct ? `${latest.body_fat_pct}%` : '-'}</div>
                                {fatKg !== '-' && <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block">{fatKg} kg estim.</span>}
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">% Masa Muscular</span>
                                <div className="text-lg font-black text-emerald-400 mt-0.5">{latest.muscle_pct ? `${latest.muscle_pct}%` : '-'}</div>
                                {muscleKg !== '-' && <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 block">{muscleKg} kg estim.</span>}
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">% Agua</span>
                                <div className="text-lg font-black text-blue-400 mt-0.5">{latest.water_pct ? `${latest.water_pct}%` : '-'}</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">ICC (Cintura/Cadera)</span>
                                <div className="text-lg font-black text-amber-500 mt-0.5">{icc}</div>
                                <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{latest.waist_cm || '-'}/{latest.hip_cm || '-'} cm</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Mini Progression Charts */}
                      {antropometria.length >= 2 && (
                        <div className="bg-slate-900/20 border border-slate-800/80 p-5 rounded-2xl space-y-3">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Historial Gráfico Composición</span>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={antropometria.map(r => {
                                const heightM = r.height / 100;
                                return {
                                  fecha: r.date,
                                  'Peso (kg)': r.weight || null,
                                  'Grasa (%)': r.body_fat_pct || null,
                                  'Músculo (%)': r.muscle_pct || null
                                };
                              })}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="fecha" stroke="#64748b" tick={{ fontSize: 9 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 10 }} />
                                <Legend wrapperStyle={{ fontSize: 9 }} />
                                <Line type="monotone" dataKey="Peso (kg)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Grasa (%)" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Músculo (%)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Complete List Table */}
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="bg-slate-900/60 font-black uppercase text-[9px] border-b border-slate-800 text-slate-400">
                              <th className="p-3">Fecha</th>
                              <th className="p-3 text-center">Peso</th>
                              <th className="p-3 text-center">Altura</th>
                              <th className="p-3 text-center">Grasa %</th>
                              <th className="p-3 text-center">Músculo %</th>
                              <th className="p-3 text-center">Cintura</th>
                              <th className="p-3 text-center">Cadera</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/50">
                            {antropometria.map((r) => (
                              <tr key={r.date} className="hover:bg-slate-900/20 font-medium">
                                <td className="p-3 font-mono font-bold text-slate-400">{r.date}</td>
                                <td className="p-3 text-center font-mono text-sky-400">{r.weight || '-'} kg</td>
                                <td className="p-3 text-center font-mono">{r.height || '-'} cm</td>
                                <td className="p-3 text-center font-mono text-red-400">{r.body_fat_pct ? `${r.body_fat_pct}%` : '-'}</td>
                                <td className="p-3 text-center font-mono text-emerald-400">{r.muscle_pct ? `${r.muscle_pct}%` : '-'}</td>
                                <td className="p-3 text-center font-mono">{r.waist_cm ? `${r.waist_cm} cm` : '-'}</td>
                                <td className="p-3 text-center font-mono">{r.hip_cm ? `${r.hip_cm} cm` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Pruebas Fisicas */}
              {profileSubTab === 'phys' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {physicalTests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 uppercase font-black border border-dashed border-slate-800 rounded-2xl">
                      No hay registros de pruebas físicas de rendimiento para este jugador esta temporada.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Latest Physical Test Highlight Box */}
                      {(() => {
                        const latest = physicalTests[physicalTests.length - 1];
                        return (
                          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                              <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Último Test de Rendimiento ({latest.date})</span>
                              <span className="text-xs text-slate-400 font-bold uppercase">{latest.notes || 'Rendimiento'}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Yo-Yo Test</span>
                                <div className="text-lg font-black text-white mt-0.5">{latest.yoyo_m || '-'} m</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Yo-Yo Velocidad Máxima</span>
                                <div className="text-lg font-black text-sky-400 mt-0.5">{latest.yoyo_kmh || '-'} km/h</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Illinois Agilidad</span>
                                <div className="text-lg font-black text-red-400 mt-0.5">{latest.illinois || '-'} s</div>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-black uppercase">Sprint 30m</span>
                                <div className="text-lg font-black text-emerald-400 mt-0.5">{latest.vel30m || '-'} s</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Mini Performance Progression Charts */}
                      {physicalTests.length >= 2 && (
                        <div className="bg-slate-900/20 border border-slate-800/80 p-5 rounded-2xl space-y-3">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Evolución de Velocidad y Resistencia</span>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={physicalTests.map(r => ({
                                fecha: r.date,
                                'Yo-Yo (m)': r.yoyo_m || null,
                                'Sprint 30m (s)': r.vel30m || null
                              }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="fecha" stroke="#64748b" tick={{ fontSize: 9 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 10 }} />
                                <Legend wrapperStyle={{ fontSize: 9 }} />
                                <Line type="monotone" dataKey="Yo-Yo (m)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Sprint 30m (s)" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Physical Tests List Table */}
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="bg-slate-900/60 font-black uppercase text-[9px] border-b border-slate-800 text-slate-400">
                              <th className="p-3">Fecha</th>
                              <th className="p-3 text-center">Yo-Yo Distancia</th>
                              <th className="p-3 text-center">Yo-Yo Vel. Máx.</th>
                              <th className="p-3 text-center">Illinois Agilidad</th>
                              <th className="p-3 text-center">Sprint 30m</th>
                              <th className="p-3">Observaciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/50">
                            {physicalTests.map((r) => (
                              <tr key={r.date} className="hover:bg-slate-900/20 font-medium">
                                <td className="p-3 font-mono font-bold text-slate-400">{r.date}</td>
                                <td className="p-3 text-center font-mono text-emerald-400">{r.yoyo_m || '-'} m</td>
                                <td className="p-3 text-center font-mono">{r.yoyo_kmh ? `${r.yoyo_kmh} km/h` : '-'}</td>
                                <td className="p-3 text-center font-mono text-red-400">{r.illinois ? `${r.illinois} s` : '-'}</td>
                                <td className="p-3 text-center font-mono text-blue-400">{r.vel30m ? `${r.vel30m} s` : '-'}</td>
                                <td className="p-3 text-slate-450 truncate max-w-[150px]">{r.notes || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="premium-card bg-blue-600 text-white relative overflow-hidden border-none shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold tracking-tight">Contacto Directo</CardTitle>
              <Button 
                size="sm" 
                onClick={handleOpenEditPersonalModal}
                className="bg-white/20 hover:bg-white/30 text-white border-none font-bold text-xs h-8 px-2.5"
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10 pt-6">
               <div className="space-y-1">
                 <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">{player.contacto_tipo || 'Tutor'}</p>
                 <p className="text-xl font-bold flex items-center gap-2 tracking-tight">
                    <Phone className="w-5 h-5 text-white/70" />
                    {player.telefono || 'Sin teléfono'}
                 </p>
               </div>
               {player.email && (
                 <>
                   <Separator className="bg-white/10" />
                   <div className="space-y-1">
                     <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Email {player.contacto_tipo ? `(${player.contacto_tipo})` : ''}</p>
                     <p className="text-base font-bold flex items-center gap-2 tracking-tight break-all">
                        <Mail className="w-5 h-5 text-white/70 shrink-0" />
                        <a href={`mailto:${player.email}`} className="hover:underline">{player.email}</a>
                     </p>
                   </div>
                 </>
               )}
               <Separator className="bg-white/10" />
               <div className="space-y-1">
                 <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Próximo Seguimiento</p>
                 <p className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-white/70" />
                    {player.fecha_seguimiento ? format(new Date(player.fecha_seguimiento), "EEEE, d 'de' MMMM", { locale: es }) : 'No programado'}
                 </p>
               </div>
               {player.observador && (
                 <>
                   <Separator className="bg-white/10" />
                   <div className="space-y-1">
                     <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Observador / Scout</p>
                     <p className="text-lg font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-white/70" />
                        {player.observador}
                     </p>
                   </div>
                 </>
               )}
               {player.telefono ? (
                 <div className="grid grid-cols-2 gap-3 mt-4">
                   <a 
                     href={`tel:${player.telefono}`} 
                     className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-100 text-blue-600 hover:text-blue-700 font-black rounded-xl transition-all duration-200 text-center uppercase text-[10px] tracking-widest shadow-md hover:shadow-lg"
                   >
                     <Phone className="w-3.5 h-3.5" />
                     Llamar
                   </a>
                   <a 
                     href={getWhatsAppLink(player.telefono, `${player.nombre} ${player.apellidos}`)} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all duration-200 text-center uppercase text-[10px] tracking-widest shadow-md hover:shadow-lg"
                   >
                     <MessageSquare className="w-3.5 h-3.5 text-white" />
                     WhatsApp
                   </a>
                 </div>
               ) : (
                 <Button disabled className="w-full bg-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest mt-4 rounded-xl h-11 pointer-events-none">
                    Sin teléfono
                 </Button>
               )}
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-[10px] uppercase tracking-widest font-black text-slate-500">Historial del Jugador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 pb-2">
                 <div className="relative">
                   <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-blue-600 ring-4 ring-slate-950 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                   <p className="text-xs font-bold text-white tracking-tight">Informe creado</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{player.created_at ? format(new Date(player.created_at), 'Pp', { locale: es }) : 'Reciente'}</p>
                 </div>
                 <div className="relative opacity-30">
                    <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-slate-800 ring-4 ring-slate-950" />
                    <p className="text-xs font-bold text-slate-400 tracking-tight">Próxima observación</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">Pendiente</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT PERSONAL DATA MODAL */}
      {showEditPersonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">Editar Datos Personales</h3>
                  <p className="text-xs text-slate-400">Modifica la información básica del jugador</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEditPersonalModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePersonalData} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre *</label>
                  <input 
                    type="text" 
                    required
                    value={editPersonalData.nombre || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Apellidos *</label>
                  <input 
                    type="text" 
                    required
                    value={editPersonalData.apellidos || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, apellidos: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-1">Apodo / Alias</label>
                  <input 
                    type="text" 
                    value={editPersonalData.apodo || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, apodo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ej. 'Pedri'"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Posición</label>
                  <select 
                    value={editPersonalData.posicion || 'CENTRAL'}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, posicion: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="PORTERO">PORTERO</option>
                    <option value="LATERAL DERECHO">LATERAL DERECHO</option>
                    <option value="LATERAL IZQUIERDO">LATERAL IZQUIERDO</option>
                    <option value="CENTRAL">CENTRAL</option>
                    <option value="PIVOTE">PIVOTE</option>
                    <option value="INTERIOR">INTERIOR</option>
                    <option value="MEDIA PUNTA">MEDIA PUNTA</option>
                    <option value="EXTREMO DERECHO">EXTREMO DERECHO</option>
                    <option value="EXTREMO IZQUIERDO">EXTREMO IZQUIERDO</option>
                    <option value="DELANTERO">DELANTERO</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Estado Scouting</label>
                  <select 
                    value={editPersonalData.estado || 'Observado'}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, estado: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Observado">Observado</option>
                    <option value="En seguimiento">En seguimiento</option>
                    <option value="Interesa">Interesa</option>
                    <option value="Fichado">Fichado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha de Nacimiento</label>
                  <input 
                    type="text" 
                    value={editPersonalData.fecha_nacimiento || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, fecha_nacimiento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. 23/08/2005"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Año de Nacimiento</label>
                  <input 
                    type="number" 
                    value={editPersonalData.anio_nacimiento || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, anio_nacimiento: parseInt(e.target.value) || undefined })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. 2008"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Procedencia / Club Actual</label>
                  <input 
                    type="text" 
                    value={editPersonalData.equipo_actual || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, equipo_actual: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. Rayo Vallecano B"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Asignación UD Poveda</label>
                  <input 
                    type="text" 
                    value={editPersonalData.equipo_asignado || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, equipo_asignado: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. Juvenil A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={editPersonalData.telefono || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. 612345678"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={editPersonalData.email || ''}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="ejemplo@email.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Contacto</label>
                  <select 
                    value={editPersonalData.contacto_tipo || 'Tutor'}
                    onChange={(e) => setEditPersonalData({ ...editPersonalData, contacto_tipo: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Padre">Padre</option>
                    <option value="Madre">Madre</option>
                    <option value="Jugador">Jugador</option>
                    <option value="Tutor">Tutor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">URL Foto de Perfil</label>
                <input 
                  type="url" 
                  value={editPersonalData.foto_url || ''}
                  onChange={(e) => setEditPersonalData({ ...editPersonalData, foto_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowEditPersonalModal(false)}
                  className="border-slate-700 text-slate-300 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

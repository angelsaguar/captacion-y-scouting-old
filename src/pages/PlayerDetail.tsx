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
  FileDown, 
  Star, 
  Phone, 
  Calendar, 
  Trophy, 
  Users,
  TrendingUp,
  Download,
  MessageSquare,
  Mail
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
  Tooltip
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

  const exportToPDF = () => {
    if (!player) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(`Informe de Scouting: ${player.nombre} ${player.apellidos}`, 10, 20);
    doc.setFontSize(14);
    doc.text(`Posicion: ${player.posicion}`, 10, 30);
    doc.text(`Equipo Procedencia: ${player.equipo_actual || '-'}`, 10, 40);
    if (player.equipo_asignado) {
      doc.text(`Equipo Asignado Club: ${player.equipo_asignado}`, 10, 48);
    }
    doc.text(`Potencial: ${player.potencial}/5`, 10, 56);
    doc.text(`Estado: ${player.estado}`, 10, 64);
    doc.text('Observaciones:', 10, 80);
    doc.setFontSize(10);
    const splitObs = doc.splitTextToSize(player.observaciones || 'Sin observaciones', 180);
    doc.text(splitObs, 10, 90);
    doc.save(`Informe_${player.nombre}_${player.apellidos}.pdf`);
    toast.success('PDF generado con éxito');
  };

  const exportToExcel = () => {
    if (!player) return;
    const data = [
      { Campo: 'Nombre', Valor: player.nombre },
      { Campo: 'Apellidos', Valor: player.apellidos },
      { Campo: 'Posicion', Valor: player.posicion },
      { Campo: 'Equipo Procedencia', Valor: player.equipo_actual },
      { Campo: 'Equipo Asignado Club', Valor: player.equipo_asignado || '-' },
      { Campo: 'Potencial', Valor: player.potencial },
      { Campo: 'Estado', Valor: player.estado },
      ... (player.attributes?.map(a => ({ Campo: a.atributo, Valor: a.valor })) || [])
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jugador");
    XLSX.writeFile(wb, `${player.nombre}_${player.apellidos}.xlsx`);
    toast.success('Excel generado con éxito');
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
                <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white leading-tight">
                  {player.nombre} {player.apellidos}
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
                {player.anio_nacimiento && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Gen {player.anio_nacimiento}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
          {(isAdmin || user?.role === 'scout') && (
            <Link to={`/players/${player.id}/edit`}>
              <Button variant="outline"><Edit2 className="w-4 h-4 mr-2" /> Editar</Button>
            </Link>
          )}
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
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="premium-card bg-blue-600 text-white relative overflow-hidden border-none shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-lg font-bold tracking-tight">Contacto Directo</CardTitle>
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
    </div>
  );
}

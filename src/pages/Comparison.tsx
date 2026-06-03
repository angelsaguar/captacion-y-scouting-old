import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, POSITION_ATTRIBUTES, CLUB_TEAMS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Swords, TrendingUp, Users, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Comparison() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterBirthYear, setFilterBirthYear] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterEquipoAsignado, setFilterEquipoAsignado] = useState<string>('');

  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await supabase.from('players').select('*, attributes:player_attributes(*)');
      if (data) setPlayers(data);
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  // Filter computations
  const birthYears = Array.from(
    new Set<number>(players.map(p => p.anio_nacimiento).filter((y: any): y is number => typeof y === 'number'))
  ).sort((a: number, b: number) => b - a);

  const filteredPlayers = players.filter(p => {
    if (filterBirthYear && p.anio_nacimiento?.toString() !== filterBirthYear) return false;
    if (filterPosition && p.posicion !== filterPosition) return false;
    if (filterEquipoAsignado) {
      if (filterEquipoAsignado === 'SIN_ASIGNAR') {
        if (p.equipo_asignado && p.equipo_asignado !== '') return false;
      } else if (p.equipo_asignado !== filterEquipoAsignado) {
        return false;
      }
    }
    return true;
  });

  const getOptionsList = (selectedPlayer: Player | null) => {
    // If we have search results, let's sort them alphabetically for convenience
    const sortedFiltered = [...filteredPlayers].sort((a, b) => `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`));
    if (!selectedPlayer) return sortedFiltered;
    const isAlreadyInList = sortedFiltered.some(p => p.id === selectedPlayer.id);
    if (isAlreadyInList) return sortedFiltered;
    return [selectedPlayer, ...sortedFiltered];
  };

  const getPlayerDataForChart = () => {
    if (!playerA && !playerB) return [];
    
    const subjectsA = playerA?.attributes?.map(a => a.atributo) || [];
    const subjectsB = playerB?.attributes?.map(a => a.atributo) || [];
    
    // Get the unique union of both players' attributes to show attributes on both axes
    const allSubjects = Array.from(new Set([...subjectsA, ...subjectsB]));
    
    return allSubjects.map(subject => ({
      subject,
      A: playerA?.attributes?.find(a => a.atributo === subject)?.valor || 0,
      B: playerB?.attributes?.find(a => a.atributo === subject)?.valor || 0,
      fullMark: 5,
    }));
  };

  const chartData = getPlayerDataForChart();

  const avgA = playerA ? (playerA.attributes && playerA.attributes.length > 0 ? (playerA.attributes.reduce((sum, a) => sum + (a.valor || 0), 0) / playerA.attributes.length).toFixed(1) : 'Sin valorar') : '-';
  const avgB = playerB ? (playerB.attributes && playerB.attributes.length > 0 ? (playerB.attributes.reduce((sum, a) => sum + (a.valor || 0), 0) / playerB.attributes.length).toFixed(1) : 'Sin valorar') : '-';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="text-center space-y-2 mb-8 md:mb-12">
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter uppercase italic flex items-center justify-center gap-2 sm:gap-3 text-white">
          <Swords className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 text-red-600" />
          Comparador Pro
        </h1>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px] sm:text-xs">Análisis de rendimiento lado a lado</p>
      </div>

      {/* Filtros de Búsqueda de Jugadores */}
      <Card className="premium-card bg-slate-900/40 border-slate-800">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Filter className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Filtros para los selectores de prospectos</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Selector de Año de Nacimiento */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Año de Nacimiento</label>
                <Select value={filterBirthYear} onValueChange={setFilterBirthYear}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 rounded-xl h-10">
                    <SelectValue placeholder="TODOS LOS AÑOS" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                    <SelectItem value="">Todos los años</SelectItem>
                    {birthYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Demarcación/Posición */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Demarcación</label>
                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 rounded-xl h-10">
                    <SelectValue placeholder="TODAS LAS DEMARCACIONES" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                    <SelectItem value="">Todas las demarcaciones</SelectItem>
                    <SelectItem value="PORTERO">Portero</SelectItem>
                    <SelectItem value="CENTRAL">Central</SelectItem>
                    <SelectItem value="LATERAL">Lateral</SelectItem>
                    <SelectItem value="MEDIO CENTRO DEFENSIVO">MCD</SelectItem>
                    <SelectItem value="INTERIOR">Interior</SelectItem>
                    <SelectItem value="MEDIA PUNTA">Media Punta</SelectItem>
                    <SelectItem value="EXTREMO">Extremo</SelectItem>
                    <SelectItem value="DELANTERO">Delantero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Equipo Asignado */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Equipo Asignado Club</label>
                <Select value={filterEquipoAsignado} onValueChange={setFilterEquipoAsignado}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 rounded-xl h-10">
                    <SelectValue placeholder="TODOS LOS EQUIPOS" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                    <SelectItem value="">Todos los equipos</SelectItem>
                    <SelectItem value="SIN_ASIGNAR">Sin Asignar</SelectItem>
                    {CLUB_TEAMS.map((team) => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botón de Limpiar */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilterBirthYear('');
                  setFilterPosition('');
                  setFilterEquipoAsignado('');
                }}
                className="border-slate-800 hover:bg-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-xl h-10 flex items-center justify-center gap-2"
                disabled={!filterBirthYear && !filterPosition && !filterEquipoAsignado}
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar Filtros
              </Button>
            </div>
            
            {/* Pequeña nota informativa del estado de filtrado */}
            <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">
              <span>Jugadores disponibles que coinciden:</span>
              <span className="text-indigo-400 font-black">{filteredPlayers.length} de {players.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-slate-950/90 pb-4 md:pb-6 pt-2 z-20">
        <Card className="premium-card bg-blue-600/5 border-blue-600/20">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-500">Prospecto A</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={playerA?.id || ""} 
              onValueChange={(id) => setPlayerA(players.find(p => p.id === id) || null)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-800 text-white rounded-xl w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium">
                <SelectValue placeholder="Seleccionar prospecto A...">
                  {playerA ? `${playerA.nombre} ${playerA.apellidos || ""} (${playerA.posicion})` : "Seleccionar prospecto A..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                {getOptionsList(playerA).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {`${p.nombre} ${p.apellidos || ""} (${p.posicion})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="premium-card bg-red-600/5 border-red-600/20">
          <CardHeader className="pb-2">
             <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-500">Prospecto B</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={playerB?.id || ""} 
              onValueChange={(id) => setPlayerB(players.find(p => p.id === id) || null)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-800 text-white rounded-xl w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium">
                <SelectValue placeholder="Seleccionar prospecto B...">
                  {playerB ? `${playerB.nombre} ${playerB.apellidos || ""} (${playerB.posicion})` : "Seleccionar prospecto B..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                {getOptionsList(playerB).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {`${p.nombre} ${p.apellidos || ""} (${p.posicion})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar View */}
        <Card className="lg:col-span-2 premium-card p-4 sm:p-8 h-[340px] sm:h-[450px] md:h-[550px] flex items-center justify-center">
           <ResponsiveContainer width="100%" height="100%">
             <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                {playerA && (
                  <Radar
                    name={playerA.nombre}
                    dataKey="A"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.6}
                    strokeWidth={3}
                  />
                )}
                {playerB && (
                  <Radar
                    name={playerB.nombre}
                    dataKey="B"
                    stroke="#dc2626"
                    fill="#dc2626"
                    fillOpacity={0.6}
                    strokeWidth={3}
                  />
                )}
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
             </RadarChart>
           </ResponsiveContainer>
        </Card>

        {/* Stats Column */}
        <div className="space-y-6">
           <Card className="premium-card">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-lg font-bold text-white tracking-tight">Comparativa de Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                 <StatRow label="Posición" valA={playerA?.posicion} valB={playerB?.posicion} />
                 <StatRow label="Potencial" valA={playerA?.potencial} valB={playerB?.potencial} isStar />
                  <StatRow label="Media de Atributos" valA={avgA !== '-' && avgA !== 'Sin valorar' ? `${avgA} ⭐` : avgA} valB={avgB !== '-' && avgB !== 'Sin valorar' ? `${avgB} ⭐` : avgB} isHighlight />
                 <StatRow label="Lateral" valA={playerA?.lateralidad} valB={playerB?.lateralidad} />
                 <StatRow label="Año Nac." valA={playerA?.anio_nacimiento} valB={playerB?.anio_nacimiento} />
              </CardContent>
           </Card>

           <Card className="premium-card bg-gradient-to-br from-slate-900 to-slate-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] uppercase tracking-widest font-black text-slate-500">Prospectos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 border border-blue-600/30">
                       {playerA?.nombre.charAt(0) || 'A'}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate text-sm">{playerA?.nombre ? `${playerA.nombre} ${playerA.apellidos}` : 'Jugador A'}</p>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Azul Pro</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-red-500 border border-red-600/30">
                      {playerB?.nombre.charAt(0) || 'B'}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate text-sm">{playerB?.nombre ? `${playerB.nombre} ${playerB.apellidos}` : 'Jugador B'}</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Rojo Pro</p>
                   </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
      
      {/* Attribute bars side by side */}
      {chartData.length > 0 && (
         <Card className="border-none shadow-sm p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-slate-800">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Desglose de Atributos
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center shrink-0">
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5">Media de {playerA ? playerA.nombre : 'Jugador A'}</span>
                  <span className="text-lg font-black text-white font-mono">{avgA !== '-' && avgA !== 'Sin valorar' ? `${avgA} ⭐` : avgA}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-center shrink-0">
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-0.5">Media de {playerB ? playerB.nombre : 'Jugador B'}</span>
                  <span className="text-lg font-black text-white font-mono">{avgB !== '-' && avgB !== 'Sin valorar' ? `${avgB} ⭐` : avgB}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
               {chartData.map(item => (
                 <div key={item.subject} className="space-y-3">
                   <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">{item.subject}</p>
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-600 transition-all" style={{ width: `${(item.A/5)*100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-4 text-blue-600">{item.A}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-red-600 transition-all" style={{ width: `${(item.B/5)*100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-4 text-red-600">{item.B}</span>
                      </div>
                   </div>
                 </div>
               ))}
            </div>
         </Card>
      )}
    </div>
  );
}

function StatRow({ label, valA, valB, isStar, isHighlight }: any) {
  return (
    <div className={cn("space-y-1 p-2 rounded-xl transition-all", isHighlight && "bg-slate-900 border border-slate-800/80")}>
      <p className={cn("text-[10px] uppercase font-bold text-center", isHighlight ? "text-amber-400" : "text-muted-foreground")}>{label}</p>
      <div className="flex items-center justify-between font-bold text-sm gap-4">
        <span className={cn("text-blue-600 text-left flex-1 truncate", isHighlight && "text-blue-400 font-mono text-base")}>
          {isStar ? (
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-3 h-3", i < (valA || 0) ? "fill-blue-600" : "text-slate-200")} />
              ))}
            </div>
          ) : (
            valA || '-'
          )}
        </span>
        <div className="w-px h-4 bg-slate-800" />
        <span className={cn("text-red-600 text-right flex-1 truncate", isHighlight && "text-red-400 font-mono text-base")}>
          {isStar ? (
            <div className="flex gap-0.5 justify-end">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-3 h-3", i < (valB || 0) ? "fill-red-600" : "text-slate-200")} />
              ))}
            </div>
          ) : (
            valB || '-'
          )}
        </span>
      </div>
    </div>
  );
}

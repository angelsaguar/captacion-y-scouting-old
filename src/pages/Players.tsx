import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, PlayerStatus, CLUB_TEAMS, Observer } from '@/types';
import { getObservers } from '@/lib/observers';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Star,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Label } from '@/components/ui/label';

export default function Players() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(() => sessionStorage.getItem('players_search') || '');
  const [filterStatus, setFilterStatus] = useState<string>(() => sessionStorage.getItem('players_filterStatus') || '');
  const [filterPosition, setFilterPosition] = useState<string>(() => sessionStorage.getItem('players_filterPosition') || '');
  const [filterLateralidad, setFilterLateralidad] = useState<string>(() => sessionStorage.getItem('players_filterLateralidad') || '');
  const [filterBirthYear, setFilterBirthYear] = useState<string>(() => sessionStorage.getItem('players_filterBirthYear') || '');
  const [filterEquipoAsignado, setFilterEquipoAsignado] = useState<string>(() => sessionStorage.getItem('players_filterEquipoAsignado') || '');
  const [filterEquipoActual, setFilterEquipoActual] = useState<string>(() => sessionStorage.getItem('players_filterEquipoActual') || '');
  const [filterObservador, setFilterObservador] = useState<string>(() => sessionStorage.getItem('players_filterObservador') || '');

  useEffect(() => {
    sessionStorage.setItem('players_search', search);
    sessionStorage.setItem('players_filterStatus', filterStatus);
    sessionStorage.setItem('players_filterPosition', filterPosition);
    sessionStorage.setItem('players_filterLateralidad', filterLateralidad);
    sessionStorage.setItem('players_filterBirthYear', filterBirthYear);
    sessionStorage.setItem('players_filterEquipoAsignado', filterEquipoAsignado);
    sessionStorage.setItem('players_filterEquipoActual', filterEquipoActual);
    sessionStorage.setItem('players_filterObservador', filterObservador);
  }, [search, filterStatus, filterPosition, filterLateralidad, filterBirthYear, filterEquipoAsignado, filterEquipoActual, filterObservador]);
  const [observers, setObservers] = useState<Observer[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadObservers = async () => {
      try {
        const list = await getObservers();
        setObservers(list);
      } catch (err) {
        console.error('Error loading observers:', err);
      }
    };
    loadObservers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('players').select('*, attributes:player_attributes(*)');

      if (search) {
        query = query.ilike('nombre', `%${search}%`);
      }
      if (filterStatus) {
        query = query.eq('estado', filterStatus);
      }
      if (filterPosition) {
        query = query.eq('posicion', filterPosition);
      }
      if (filterLateralidad) {
        query = query.eq('lateralidad', filterLateralidad);
      }
      if (filterBirthYear) {
        query = query.eq('anio_nacimiento', parseInt(filterBirthYear));
      }
      if (filterEquipoAsignado) {
        if (filterEquipoAsignado === 'SIN_ASIGNAR') {
          query = query.or('equipo_asignado.is.null,equipo_asignado.eq.""');
        } else {
          query = query.eq('equipo_asignado', filterEquipoAsignado);
        }
      }
      if (filterEquipoActual) {
        query = query.ilike('equipo_actual', `%${filterEquipoActual}%`);
      }
      if (filterObservador) {
        if (filterObservador === 'SIN_ASIGNAR') {
          query = query.or('observador.is.null,observador.eq.""');
        } else {
          query = query.eq('observador', filterObservador);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      toast.error('Error al cargar jugadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [search, filterStatus, filterPosition, filterLateralidad, filterBirthYear, filterEquipoAsignado, filterEquipoActual, filterObservador]);

  const requestDelete = (id: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para eliminar jugadores');
      return;
    }
    setPlayerToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!playerToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerToDelete);
      if (error) throw error;
      toast.success('Jugador eliminado');
      setDeleteModalOpen(false);
      setPlayerToDelete(null);
      fetchPlayers();
    } catch (error) {
      toast.error('Error al eliminar jugador');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case 'Rechazado': return 'bg-red-600';
      case 'Observado': return 'bg-slate-600';
      case 'En seguimiento': return 'bg-blue-600';
      case 'Interesa': return 'bg-yellow-600';
      case 'Fichado': return 'bg-emerald-600';
      default: return 'bg-slate-500';
    }
  };

  const calculateAverage = (attributes?: any[]) => {
    if (!attributes || attributes.length === 0) return '0.0';
    const sum = attributes.reduce((acc, attr) => acc + (attr.valor || 0), 0);
    return (sum / attributes.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white italic">Base de Jugadores</h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">Gestiona y analiza el talento detectado.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearch(''); 
              setFilterStatus(''); 
              setFilterPosition(''); 
              setFilterLateralidad('');
              setFilterBirthYear('');
              setFilterEquipoAsignado('');
              setFilterEquipoActual('');
              setFilterObservador('');
              toast.info('Se han restablecido todos los filtros para mostrar el total');
            }}
            className="bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border-blue-500/40 rounded-full font-extrabold text-sm md:text-base h-12 md:h-14 px-5 md:px-7 flex items-center gap-3 self-start sm:self-center shadow-lg shadow-blue-955/20 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            Jugadores Captados: <span className="text-white bg-slate-950 px-4 py-1.5 rounded-full text-base md:text-lg font-black whitespace-nowrap min-w-[3rem] text-center border border-blue-500/20">{players.length}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-800 rounded-xl p-1 bg-slate-900/50">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' && "bg-slate-800 text-white")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg", viewMode === 'list' && "bg-slate-800 text-white")}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Link to="/players/new">
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg shadow-red-900/30">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Jugador
            </Button>
          </Link>
        </div>
      </div>

      <Card className="premium-card">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Jugador</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Buscar por nombre..." 
                  className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 rounded-xl h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipo de Origen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Club de procedencia..." 
                  className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 rounded-xl h-10"
                  value={filterEquipoActual}
                  onChange={(e) => setFilterEquipoActual(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de Captación</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 rounded-xl h-10">
                  <SelectValue placeholder="TODOS LOS ESTADOS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">TODOS LOS ESTADOS</SelectItem>
                  <SelectItem value="Observado">Observado</SelectItem>
                  <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                  <SelectItem value="Interesa">Interesa</SelectItem>
                  <SelectItem value="Fichado">Fichado</SelectItem>
                  <SelectItem value="Rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demarcación</Label>
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 rounded-xl h-10">
                  <SelectValue placeholder="TODAS LAS DEMARCACIONES" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">TODAS LAS DEMARCACIONES</SelectItem>
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

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lateralidad</Label>
              <Select value={filterLateralidad} onValueChange={setFilterLateralidad}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 rounded-xl h-10">
                  <SelectValue placeholder="TODAS LAS LATERALIDADES" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">TODAS LAS LATERALIDADES</SelectItem>
                  <SelectItem value="Derecho">Derecho</SelectItem>
                  <SelectItem value="Izquierdo">Izquierdo</SelectItem>
                  <SelectItem value="Ambidiestro">Ambidiestro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Año de Nacimiento</Label>
              <Select value={filterBirthYear} onValueChange={setFilterBirthYear}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 rounded-xl h-10">
                  <SelectValue placeholder="TODOS LOS AÑOS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">TODOS LOS AÑOS</SelectItem>
                  {Array.from({ length: 25 }, (_, i) => 2000 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipo Asignado</Label>
              <Select value={filterEquipoAsignado} onValueChange={setFilterEquipoAsignado}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 rounded-xl h-10">
                  <SelectValue placeholder="TODOS LOS EQUIPOS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">TODOS LOS EQUIPOS</SelectItem>
                  <SelectItem value="SIN_ASIGNAR">Sin Asignar</SelectItem>
                  {CLUB_TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observador / Scout</Label>
              <Select value={filterObservador} onValueChange={setFilterObservador}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 rounded-xl h-10">
                  <SelectValue placeholder="TODOS LOS OBSERVADORES" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">TODOS LOS OBSERVADORES</SelectItem>
                  <SelectItem value="SIN_ASIGNAR">Sin Observador</SelectItem>
                  {observers.map((obs) => (
                    <SelectItem key={obs.id} value={obs.nombre}>{obs.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              <Button 
                variant="outline" 
                className="w-full h-10 border-slate-700 hover:bg-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all"
                onClick={() => { 
                  setSearch(''); 
                  setFilterStatus(''); 
                  setFilterPosition(''); 
                  setFilterLateralidad('');
                  setFilterBirthYear('');
                  setFilterEquipoAsignado('');
                  setFilterEquipoActual('');
                  setFilterObservador('');
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No se encontraron jugadores</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            Intenta cambiar los filtros o añade un nuevo jugador para comenzar.
          </p>
          <Link to="/players/new" className="mt-6 inline-block">
            <Button variant="outline">Añadir primer jugador</Button>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map((player) => (
            <Card key={player.id} className="premium-card group overflow-hidden border-none hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300">
              <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden underline-none">
                {player.foto_url ? (
                  <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="w-20 h-20 rounded-full border-2 border-slate-700 flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-700" />
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className={cn(
                    "border-none text-white shadow-lg text-[10px] font-black uppercase tracking-widest px-3 py-1",
                    getStatusColor(player.estado)
                  )}>
                    {player.estado}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-white font-bold text-xl leading-tight truncate tracking-tight">
                    {player.nombre} {player.apellidos}
                  </p>
                  <p className="text-blue-500 text-[10px] uppercase tracking-[0.2em] font-black mt-0.5">
                    {player.posicion} {player.equipo_asignado ? `• ${player.equipo_asignado}` : ''}
                  </p>
                </div>
              </div>
              <CardContent className="p-5 space-y-4 bg-slate-900/80">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <Star 
                          key={val} 
                          className={cn(
                            "w-3 h-3", 
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
                    <div className="px-2 py-1 bg-blue-600/20 rounded-lg border border-blue-600/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                      <span className="text-sm font-black text-blue-400 tracking-tighter">{calculateAverage(player.attributes)}</span>
                    </div>
                  </div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                    {player.equipo_actual && `${player.equipo_actual}`} {player.equipo_asignado && <span className="text-emerald-500 font-extrabold normal-case font-sans">({player.equipo_asignado})</span>}
                  </span>
                </div>

                {player.observador && (
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-1">
                    <span>Obs:</span>
                    <span className="text-slate-300 font-black truncate max-w-[150px]">{player.observador}</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Link to={`/players/${player.id}`} className="flex-1">
                    <Button variant="outline" className="w-full h-10 text-xs font-bold rounded-xl border-slate-700 hover:bg-slate-800 text-slate-300">
                      Ver informe
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-10 w-10 text-slate-500 hover:text-white rounded-xl")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/players/${player.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalle
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={() => navigate(`/players/${player.id}/edit`)}>
                            <Edit2 className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                            onClick={() => requestDelete(player.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="premium-card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-slate-900 border-b border-slate-800">
                <TableHead className="w-[80px] text-slate-500 font-bold uppercase text-[10px]">Foto</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Nombre Completo</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Posición</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Equipo</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Observador</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Estado</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Potencial</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Media</TableHead>
                <TableHead className="text-right text-slate-500 font-bold uppercase text-[10px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id} className="hover:bg-slate-800/30 border-b border-slate-800/50 transition-colors">
                  <TableCell>
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-800">
                      {player.foto_url ? (
                        <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <Users className="w-5 h-5 text-slate-700" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-white tracking-tight">
                    {player.nombre} {player.apellidos}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-bold text-[10px] uppercase border-slate-700 text-slate-400">{player.posicion}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {player.equipo_actual}
                    {player.equipo_asignado && (
                      <span className="block text-[10px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider">
                        → {player.equipo_asignado}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 font-bold text-xs truncate max-w-[120px]">
                    {player.observador || <span className="text-slate-600 font-medium">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-none text-white text-[10px] font-black uppercase", getStatusColor(player.estado))}>
                      {player.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <Star 
                          key={val} 
                          className={cn(
                            "w-2.5 h-2.5", 
                            val <= player.potencial 
                              ? cn(
                                  "fill-current",
                                  player.potencial === 1 && "text-red-500",
                                  player.potencial === 2 && "text-orange-500",
                                  player.potencial === 3 && "text-yellow-500",
                                  player.potencial === 4 && "text-lime-500",
                                  player.potencial === 5 && "text-emerald-500"
                                )
                              : "text-slate-800"
                          )} 
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600/20 rounded-xl border border-blue-600/30 shadow-[0_0_10px_rgba(37,99,235,0.1)]">
                      <span className="text-base font-black text-blue-400 tracking-tighter">{calculateAverage(player.attributes)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Link to={`/players/${player.id}`}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-xl">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                       {isAdmin && (
                         <Link to={`/players/${player.id}/edit`}>
                           <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl">
                             <Edit2 className="h-4 w-4" />
                           </Button>
                         </Link>
                       )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-10 w-10 text-slate-500 hover:text-red-500 hover:bg-slate-800 rounded-xl", !isAdmin && "hidden")}
                        onClick={() => requestDelete(player.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="¿Eliminar jugador?"
        message="¿Estás seguro de que deseas eliminar este jugador de forma permanente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setPlayerToDelete(null);
        }}
        variant="danger"
        isSubmitting={isDeleting}
      />
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", props.className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

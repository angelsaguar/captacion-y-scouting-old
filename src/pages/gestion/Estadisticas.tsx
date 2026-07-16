import React, { useState, useEffect } from 'react';
import { CLUB_TEAMS } from '@/types';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Users, 
  Award, 
  ShieldAlert,
  Clock
} from 'lucide-react';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
}

interface Match {
  rival: string;
  goles_favor?: number;
  goles_contra?: number;
  estado: string;
  estadisticas?: {
    jugadoras_stats?: {
      playerId: string;
      nombre: string;
      apellidos: string;
      dorsal: string;
      posicion: string;
      titular: boolean;
      minutos: number;
      tarjetas_amarillas: number;
      tarjetas_rojas: number;
      goles_metidos: number;
      goles_encajados: number;
    }[];
  };
}

interface Session {
  records: { status: string }[];
}

export default function Estadisticas() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  
  // Real stats state derived from localStorage
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [matchData, setMatchData] = useState<any[]>([]);
  const [positionData, setPositionData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [sessionTrendData, setSessionTrendData] = useState<any[]>([]);
  const [playerAttendanceRank, setPlayerAttendanceRank] = useState<any[]>([]);
  const [playerMatchParticipationRank, setPlayerMatchParticipationRank] = useState<any[]>([]);
  
  // Custom derived states for full player stats
  const [playerMinutesData, setPlayerMinutesData] = useState<any[]>([]);
  const [goalscorers, setGoalscorers] = useState<any[]>([]);
  const [cardsData, setCardsData] = useState<any[]>([]);
  const [goalkeepersConceded, setGoalkeepersConceded] = useState<any[]>([]);

  const [overallStats, setOverallStats] = useState({
    avgGoalsScored: 0,
    avgGoalsConceded: 0,
    totalGoalsScored: 0,
    totalGoalsConceded: 0,
    attendanceRate: 0,
    totalGames: 0
  });

  useEffect(() => {
    // 1. Fetch Players
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const playersList: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];
    setTotalPlayers(playersList.length);

    // Derive position distribution
    const positions: Record<string, number> = {};
    playersList.forEach(p => {
      positions[p.posicion] = (positions[p.posicion] || 0) + 1;
    });
    const posChartData = Object.entries(positions).map(([name, value]) => ({ name, value }));
    setPositionData(posChartData);

    // 2. Fetch Matches
    const matchesKey = `team_matches_${selectedTeam}`;
    const savedMatches = localStorage.getItem(matchesKey);
    const matchesList: Match[] = savedMatches ? JSON.parse(savedMatches) : [];
    
    const playedGames = matchesList.filter(m => m.estado === 'Finalizado');
    const goalsChartData = playedGames.map((m, i) => ({
      name: `P${i + 1} (${m.rival.substring(0, 5)})`,
      GolesFavor: m.goles_favor ?? 0,
      GolesContra: m.goles_contra ?? 0
    })).reverse(); // Oldest first
    setMatchData(goalsChartData);

    // Calculate averages
    const totalGoalsScored = playedGames.reduce((acc, curr) => acc + (curr.goles_favor ?? 0), 0);
    const totalGoalsConceded = playedGames.reduce((acc, curr) => acc + (curr.goles_contra ?? 0), 0);
    
    // Accumulate player-specific detailed stats
    const accumulatedStats: Record<string, {
      id: string;
      nombre: string;
      apellidos: string;
      dorsal: string;
      posicion: string;
      minutos: number;
      goles: number;
      goles_encajados: number;
      amarillas: number;
      rojas: number;
    }> = {};

    // Initialize with all current roster players
    playersList.forEach(p => {
      accumulatedStats[p.id] = {
        id: p.id,
        nombre: p.nombre,
        apellidos: p.apellidos,
        dorsal: p.dorsal,
        posicion: p.posicion,
        minutos: 0,
        goles: 0,
        goles_encajados: 0,
        amarillas: 0,
        rojas: 0
      };
    });

    // Populate from finished match stats
    playedGames.forEach(m => {
      const stats = m.estadisticas?.jugadoras_stats;
      if (stats && Array.isArray(stats)) {
        stats.forEach((st: any) => {
          if (!accumulatedStats[st.playerId]) {
            accumulatedStats[st.playerId] = {
              id: st.playerId,
              nombre: st.nombre || 'Jugadora',
              apellidos: st.apellidos || '',
              dorsal: st.dorsal || '',
              posicion: st.posicion || 'Campo',
              minutos: 0,
              goles: 0,
              goles_encajados: 0,
              amarillas: 0,
              rojas: 0
            };
          }
          accumulatedStats[st.playerId].minutos += st.minutos || 0;
          accumulatedStats[st.playerId].goles += st.goles_metidos || 0;
          accumulatedStats[st.playerId].goles_encajados += st.goles_encajados || 0;
          accumulatedStats[st.playerId].amarillas += st.tarjetas_amarillas || 0;
          accumulatedStats[st.playerId].rojas += st.tarjetas_rojas || 0;
        });
      }
    });

    const accumulatedList = Object.values(accumulatedStats);

    // Filter, sort and map for minutes played chart
    const minChartData = accumulatedList
      .map(p => ({
        name: p.nombre,
        Minutos: p.minutos
      }))
      .sort((a, b) => b.Minutos - a.Minutos);
    setPlayerMinutesData(minChartData);

    // Goalscorers ranking list
    const scorers = accumulatedList
      .filter(p => p.goles > 0)
      .sort((a, b) => b.goles - a.goles);
    setGoalscorers(scorers);

    // Goalkeeper goals conceded against list
    const concededGks = accumulatedList
      .filter(p => p.posicion === 'PORTERO')
      .sort((a, b) => a.goles_encajados - b.goles_encajados);
    setGoalkeepersConceded(concededGks);

    // Card totals ranking
    const cardRankings = accumulatedList
      .filter(p => p.amarillas > 0 || p.rojas > 0)
      .sort((a, b) => b.amarillas - a.amarillas);
    setCardsData(cardRankings);
    
    // 3. Fetch Sessions (Attendance)
    const sessionsKey = `team_sessions_${selectedTeam}`;
    const savedSessions = localStorage.getItem(sessionsKey);
    const sessionsList: any[] = savedSessions ? JSON.parse(savedSessions) : [];

    let totalAttendanceRecords = 0;
    let presentRecords = 0;
    const statusCounts: Record<string, number> = {
      Presente: 0,
      Retraso: 0,
      'No Justificó': 0,
      Justificado: 0,
      Lesionado: 0
    };

    sessionsList.forEach(s => {
      s.records.forEach((r: any) => {
        totalAttendanceRecords++;
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        if (r.status === 'Presente' || r.status === 'Retraso') {
          presentRecords++;
        }
      });
    });

    const attChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    setAttendanceData(attChartData);

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
      : 0;

    // Attendance Trend by session
    const trend = sessionsList
      .map((s: any) => {
        const total = s.records.length;
        const present = s.records.filter((r: any) => r.status === 'Presente' || r.status === 'Retraso').length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return {
          fecha: s.fecha.split('-').slice(1).join('/'),
          Asistencia: rate,
          tipo: s.tipo
        };
      })
      .reverse();
    setSessionTrendData(trend);

    // Player attendance rankings
    const playerAttendanceMap: Record<string, { nombre: string; total: number; present: number }> = {};
    playersList.forEach(p => {
      playerAttendanceMap[p.id] = { nombre: p.nombre + ' ' + p.apellidos.substring(0, 1) + '.', total: 0, present: 0 };
    });
    sessionsList.forEach((s: any) => {
      s.records.forEach((r: any) => {
        if (playerAttendanceMap[r.playerId]) {
          playerAttendanceMap[r.playerId].total += 1;
          if (r.status === 'Presente' || r.status === 'Retraso') {
            playerAttendanceMap[r.playerId].present += 1;
          }
        }
      });
    });
    const playerAttendanceRankList = Object.values(playerAttendanceMap)
      .map(st => ({
        name: st.nombre,
        Asistencia: st.total > 0 ? Math.round((st.present / st.total) * 100) : 0
      }))
      .sort((a, b) => b.Asistencia - a.Asistencia);
    setPlayerAttendanceRank(playerAttendanceRankList);

    // Calculate match attendance (participation) rank for players
    const matchParticipationMap: Record<string, { nombre: string; total: number; played: number }> = {};
    playersList.forEach(p => {
      matchParticipationMap[p.id] = { nombre: p.nombre + ' ' + p.apellidos.substring(0, 1) + '.', total: playedGames.length, played: 0 };
    });

    playedGames.forEach(m => {
      const stats = m.estadisticas?.jugadoras_stats;
      if (stats && Array.isArray(stats)) {
        stats.forEach((st: any) => {
          if (matchParticipationMap[st.playerId]) {
            if (st.minutos > 0 || st.titular || st.suplente) {
              matchParticipationMap[st.playerId].played += 1;
            }
          }
        });
      }
    });

    const playerMatchRankList = Object.values(matchParticipationMap)
      .map(st => ({
        name: st.nombre,
        Participacion: st.total > 0 ? Math.round((st.played / st.total) * 100) : 0
      }))
      .sort((a, b) => b.Participacion - a.Participacion);
    setPlayerMatchParticipationRank(playerMatchRankList);

    // Calculate general match participation average across all players
    const sumMatchPart = playerMatchRankList.reduce((acc, curr) => acc + curr.Participacion, 0);
    const avgMatchParticipation = playerMatchRankList.length > 0 ? Math.round(sumMatchPart / playerMatchRankList.length) : 0;

    setOverallStats({
      avgGoalsScored: playedGames.length > 0 ? parseFloat((totalGoalsScored / playedGames.length).toFixed(1)) : 0,
      avgGoalsConceded: playedGames.length > 0 ? parseFloat((totalGoalsConceded / playedGames.length).toFixed(1)) : 0,
      totalGoalsScored,
      totalGoalsConceded,
      attendanceRate,
      totalGames: playedGames.length,
      matchParticipationRate: avgMatchParticipation
    });

  }, [selectedTeam]);

  // Colors for Pie Chart cells
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#a855f7', '#6366f1'];

  return (
    <div className="space-y-6">
      {/* Selector */}
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
      </div>

      {/* KPI Stats blocks */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Players */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Plantilla</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white">{totalPlayers}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Jugadoras Registradas</p>
          </div>
        </div>

        {/* KPI 2: Played Games */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Partidos</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white">{overallStats.totalGames}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Disputados en Liga/Copa</p>
          </div>
        </div>

        {/* KPI 3: Goles Favor Promedio */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Goles Favor</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white">{overallStats.avgGoalsScored}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Por Partido (Media)</p>
          </div>
        </div>

        {/* KPI 4: Goles Contra Total (Interactive Button) */}
        <button
          type="button"
          onClick={() => {
            toast.info(`Estadísticas de Defensa: ${overallStats.totalGoalsConceded} goles encajados en total. Promedio de ${overallStats.avgGoalsConceded} goles por partido.`);
          }}
          className="bg-slate-900/40 border border-slate-900 hover:border-red-900/50 hover:bg-red-950/10 p-4 rounded-2xl flex flex-col justify-between gap-2 text-left transition-all active:scale-95 group cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest group-hover:text-red-400 transition-colors">Goles Contra</span>
            <ShieldAlert className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white group-hover:text-red-400 transition-colors">{overallStats.totalGoalsConceded}</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Total Goles Encajados (Click)</p>
          </div>
        </button>

        {/* KPI 5: Training Attendance rate */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Asistencia Entrenos</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white">{overallStats.attendanceRate}%</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Media en Sesiones</p>
          </div>
        </div>

        {/* KPI 6: Match Attendance rate */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Asistencia Partidos</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-white">{overallStats.matchParticipationRate}%</h4>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Media de Participación</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Performance Timeline Goals */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>Goles a Favor vs Contra (Histórico)</span>
          </h5>

          <div className="h-72 w-full text-xs">
            {matchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={matchData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Legend />
                  <Line type="monotone" dataKey="GolesFavor" stroke="#3b82f6" activeDot={{ r: 8 }} name="Goles Favor" strokeWidth={3} />
                  <Line type="monotone" dataKey="GolesContra" stroke="#ef4444" name="Goles Contra" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase">
                Completa actas de partidos para ver evolución
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Attendance breakdown pie chart */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Distribución de Asistencia a Entrenamientos (Total)</span>
          </h5>

          <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center text-xs">
            {overallStats.attendanceRate > 0 ? (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {attendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full sm:w-1/2 space-y-2 px-4">
                  {attendanceData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-400 font-semibold">{entry.name}</span>
                      </div>
                      <span className="font-bold text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase">
                Registra asistencia diaria para graficar
              </div>
            )}
          </div>
        </div>

        {/* NEW CHART: Tendencia de Asistencia por Sesión */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span>Tendencia de Asistencia a Entrenamientos (% por Sesión)</span>
          </h5>

          <div className="h-72 w-full text-xs">
            {sessionTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessionTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="fecha" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Line type="monotone" dataKey="Asistencia" stroke="#a855f7" strokeWidth={3} activeDot={{ r: 8 }} name="Asistencia %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                Registra múltiples sesiones para ver la tendencia histórica
              </div>
            )}
          </div>
        </div>

        {/* NEW CHART: Ranking Asistencia Jugadoras */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Asistencia a Entrenamientos por Jugadora (%)</span>
          </h5>

          <div className="h-72 w-full text-xs">
            {playerAttendanceRank.some(p => p.Asistencia > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={playerAttendanceRank.slice(0, 10)} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" interval={0} />
                  <YAxis stroke="#64748b" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="Asistencia" fill="#10b981" radius={[8, 8, 0, 0]} name="Asistencia Entrenos %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                No hay registros de asistencia. Registra sesiones para ver estadísticas individuales.
              </div>
            )}
          </div>
        </div>

        {/* NEW CHART: Ranking Asistencia a Partidos (Match Participation) */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Asistencia a Partidos por Jugadora (%)</span>
          </h5>

          <div className="h-72 w-full text-xs">
            {playerMatchParticipationRank.some(p => p.Participacion > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={playerMatchParticipationRank.slice(0, 10)} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" interval={0} />
                  <YAxis stroke="#64748b" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="Participacion" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Asistencia Partidos %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                No hay registros de partidos finalizados para calcular la participación individual.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Position Distribution */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4 lg:col-span-2">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>Balance Táctico de Plantilla (Jugadoras por Posición)</span>
          </h5>

          <div className="h-72 w-full text-xs">
            {positionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={positionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} name="Cantidad">
                    {positionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase">
                Agrega jugadores a la plantilla para ver balance
              </div>
            )}
          </div>
        </div>

        {/* NEW CHART: Minutos Jugados por Jugadora */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4 lg:col-span-2">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>Minutos Jugados por Jugadora</span>
          </h5>

          <div className="h-72 w-full text-xs">
            {playerMinutesData.some(p => p.Minutos > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={playerMinutesData.filter(p => p.Minutos > 0)} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" interval={0} />
                  <YAxis stroke="#64748b" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                  <Bar dataKey="Minutos" fill="#10b981" radius={[8, 8, 0, 0]} name="Minutos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-semibold uppercase text-center p-4">
                No hay registros de minutos jugados. Cierra actas de partidos con estadísticas detalladas de jugadoras para graficar.
              </div>
            )}
          </div>
        </div>

        {/* NEW SECTION: Ranking de Goleadoras y Porteras */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Ranking de Goleadoras</span>
          </h5>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {goalscorers.length > 0 ? (
              goalscorers.map((p, index) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] ${
                      index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-400/30' :
                      index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-800/30' :
                      'bg-slate-900 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white text-xs block">{p.nombre} {p.apellidos}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-400">{p.goles}</span>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase block">Goles</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 italic text-center py-8">No se han registrado goles en partidos finalizados.</p>
            )}
          </div>
        </div>

        {/* NEW SECTION: Porteras / Goles en contra */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
            <span>Goles en Contra (Porteras)</span>
          </h5>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {goalkeepersConceded.length > 0 ? (
              goalkeepersConceded.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full font-black text-[9px] bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                      GK
                    </span>
                    <div>
                      <span className="font-bold text-white text-xs block">{p.nombre} {p.apellidos}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-indigo-400">{p.goles_encajados}</span>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase block">Recibidos</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 italic text-center py-8">No hay registros de goles encajados en porteras.</p>
            )}
          </div>
        </div>

        {/* NEW SECTION: Control de Tarjetas & Alerta Sanción */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-3xl space-y-4 lg:col-span-2">
          <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Control de Tarjetas y Alerta de Sanción (4+ Amarillas)</span>
          </h5>

          <div className="space-y-2.5">
            {cardsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cardsData.map((p) => {
                  const hasSuspensionWarning = p.amarillas >= 4;
                  return (
                    <div 
                      key={p.id} 
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${
                        hasSuspensionWarning 
                          ? 'bg-red-500/5 border-red-500/40 text-white animate-pulse' 
                          : 'bg-slate-950/40 border-slate-850'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-black text-xs text-white block uppercase">{p.nombre} {p.apellidos}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Dorsal {p.dorsal} • {p.posicion}</span>
                        </div>

                        {hasSuspensionWarning && (
                          <span className="text-[9px] font-black uppercase bg-red-600 text-white px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Alerta Sanción</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 border-t border-slate-900/60 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-4 bg-amber-400 rounded-sm inline-block shadow-md" title="Tarjetas Amarillas" />
                          <div>
                            <span className="text-xs font-black text-white">{p.amarillas}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Amarillas</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-3 h-4 bg-red-600 rounded-sm inline-block shadow-md" title="Tarjetas Rojas" />
                          <div>
                            <span className="text-xs font-black text-white">{p.rojas}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Rojas</span>
                          </div>
                        </div>

                        {hasSuspensionWarning && (
                          <p className="text-[10px] text-red-400 font-semibold italic flex-1 text-right">
                            ¡Llegó a {p.amarillas} amarillas! Próxima tarjeta conlleva suspensión.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic text-center py-8">No se han registrado tarjetas amarillas o rojas.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { TrendingUp, Users, Target, Activity } from 'lucide-react';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed', '#db2777'];

export default function Analytics() {
  const [data, setData] = useState({
    posiciones: [] as any[],
    potenciales: [] as any[],
    captacionesPorMes: [] as any[],
    lateralidad: [] as any[]
  });

  useEffect(() => {
    async function fetchAnalytics() {
      const { data: rawPlayers } = await supabase.from('players').select('*');
      const players = (rawPlayers || []).filter(p => !(p as any).es_plantilla && (p as any).origen !== 'plantilla');
      if (players) {
        // Group by position
        const posMap = players.reduce((acc: any, p) => {
          acc[p.posicion] = (acc[p.posicion] || 0) + 1;
          return acc;
        }, {});

        // Group by potential
        const potMap = players.reduce((acc: any, p) => {
          acc[`${p.potencial} Estrellas`] = (acc[`${p.potencial} Estrellas`] || 0) + 1;
          return acc;
        }, {});

        // Group by lateralidad
        const latMap = players.reduce((acc: any, p) => {
          acc[p.lateralidad || 'No especificado'] = (acc[p.lateralidad || 'No especificado'] || 0) + 1;
          return acc;
        }, {});

        setData({
          posiciones: Object.entries(posMap).map(([name, value]) => ({ name, value })),
          potenciales: Object.entries(potMap).map(([name, value]) => ({ name, value })),
          lateralidad: Object.entries(latMap).map(([name, value]) => ({ name, value })),
          captacionesPorMes: [
            { name: 'Ene', value: 4 },
            { name: 'Feb', value: 7 },
            { name: 'Mar', value: 5 },
            { name: 'Abr', value: 12 },
            { name: 'May', value: players.length },
          ]
        });
      }
    }
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analítica Avanzada</h1>
        <p className="text-muted-foreground">Distribución y tendencias del proceso de captación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Jugadores por Potencial</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.potenciales} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {data.potenciales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Evolución de Captaciones</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.captacionesPorMes}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Diversidad de Perfiles</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data.posiciones} layout="vertical">
               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
               <XAxis type="number" hide />
               <YAxis dataKey="name" type="category" fontSize={11} width={150} tickLine={false} axisLine={false} />
               <Tooltip />
               <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.posiciones.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
               </Bar>
             </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Lateralidad Dominante</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie 
                       data={data.lateralidad} 
                       dataKey="value" 
                       nameKey="name" 
                       cx="50%" 
                       cy="50%" 
                       innerRadius={60} 
                       outerRadius={80}
                       paddingAngle={5}
                       label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                     >
                        {data.lateralidad.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                     </Pie>
                     <Tooltip />
                     <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
            </CardContent>
         </Card>
         <Card className="border-none shadow-sm bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">KRs Logrados (Este Trimestre)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span>Jugadores Elite Detectados</span>
                    <span className="text-blue-400">80%</span>
                 </div>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: '80%' }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span>Informes Completados</span>
                    <span className="text-green-400">100%</span>
                 </div>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '100%' }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span>Fichajes Estratégicos</span>
                    <span className="text-purple-400">45%</span>
                 </div>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600" style={{ width: '45%' }} />
                 </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

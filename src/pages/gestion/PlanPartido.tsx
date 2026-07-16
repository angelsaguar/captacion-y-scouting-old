import React, { useState, useEffect } from 'react';
import { CLUB_TEAMS } from '@/types';
import { supabase } from '@/lib/supabase';
import { 
  Presentation, 
  Plus, 
  Trash2, 
  Calendar, 
  Target, 
  ShieldCheck, 
  Users, 
  Award,
  Sparkles,
  ClipboardList,
  Printer,
  FileText,
  UserCheck,
  Zap,
  Volume2,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

interface Match {
  id: string;
  rival: string;
  fecha: string;
  estado: string;
}

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
}

interface MatchPlan {
  id: string;
  matchId: string;
  rivalName: string;
  fechaPartido: string;
  sistema: string;
  sistemaRival: string;
  convocatoria: string[]; // IDs of convoked players
  objetivos_tacticos: string;
  alineacion_propuesta: string;
  puntos_fuertes_rival: string;
  balon_parado: string;
  fecha_creacion: string;
}

export default function PlanPartido() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [roster, setRoster] = useState<TeamPlayer[]>([]);
  const [plans, setPlans] = useState<MatchPlan[]>([]);
  const [activePlan, setActivePlan] = useState<MatchPlan | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Print & WhatsApp states
  const [printMode, setPrintMode] = useState<'full' | 'convocatoria' | null>(null);
  const [showWhatsappConvModal, setShowWhatsappConvModal] = useState(false);
  const [whatsappConvMessage, setWhatsappConvMessage] = useState('');

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintMode(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    rivalName: '',
    fechaPartido: new Date().toISOString().split('T')[0],
    sistema: '1-4-3-3',
    sistemaRival: '1-4-4-2',
    convocatoria: [] as string[],
    objetivos_tacticos: '',
    alineacion_propuesta: '',
    puntos_fuertes_rival: '',
    balon_parado: ''
  });

  // Load team matches, roster & game plans
  useEffect(() => {
    const matchesKey = `team_matches_${selectedTeam}`;
    const savedMatches = localStorage.getItem(matchesKey);
    const scheduledList: Match[] = savedMatches ? JSON.parse(savedMatches) : [];
    setMatches(scheduledList);

    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const playersList: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];
    setRoster(playersList);

    // Fetch plans from Supabase, fallback to localStorage
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('match_plans')
          .select('*')
          .eq('team', selectedTeam)
          .order('fecha_partido', { ascending: false });

        if (!error && data) {
          const formatted: MatchPlan[] = data.map(item => ({
            id: item.id,
            matchId: '',
            rivalName: item.rival_name,
            fechaPartido: item.fecha_partido,
            sistema: item.sistema,
            sistemaRival: item.sistema_rival,
            convocatoria: item.convocatoria || [],
            objetivos_tacticos: item.objetivos_tacticos || '',
            alineacion_propuesta: item.alineacion_propuesta || '',
            puntos_fuertes_rival: item.puntos_fuertes_rival || '',
            balon_parado: item.balon_parado || '',
            fecha_creacion: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          }));

          setPlans(formatted);
          setActivePlan(formatted.length > 0 ? formatted[0] : null);
          localStorage.setItem(`team_gameplans_${selectedTeam}`, JSON.stringify(formatted));
          return;
        } else if (error) {
          console.warn('Error fetching match plans from Supabase, using local fallback:', error);
        }
      } catch (err) {
        console.warn('Exception fetching match plans from Supabase:', err);
      }

      // Local fallback
      const plansKey = `team_gameplans_${selectedTeam}`;
      const savedPlans = localStorage.getItem(plansKey);
      if (savedPlans) {
        const parsed = JSON.parse(savedPlans);
        setPlans(parsed);
        setActivePlan(parsed.length > 0 ? parsed[0] : null);
      } else {
        // Default preloaded game plan
        const defaults: MatchPlan[] = [
          {
            id: 'gp1',
            matchId: 'm1',
            rivalName: 'A.D. Arganda',
            fechaPartido: new Date().toISOString().split('T')[0],
            sistema: '1-4-3-3',
            sistemaRival: '1-4-4-2',
            convocatoria: playersList.slice(0, 14).map(p => p.id),
            objetivos_tacticos: '1. Presión alta tras pérdida de balón en campo contrario.\n2. Basculaciones defensivas rápidas para bloquear sus transiciones por fuera.\n3. Salida de balón combinada con central de apoyo alternando pases cortos.',
            alineacion_propuesta: 'Sofía (GK)\nElena (CB), Carlos (CB), Marcos (LB), Jose (RB)\nSanti (DM), Luis (MC), Cris (MC)\nPaula (EI), Maria (ED), Jorge (DC)',
            puntos_fuertes_rival: 'Contragolpes veloces por bandas. Extremo izquierdo muy rápido con buen desborde. Debemos vigilar los balones cruzados a su espalda.',
            balon_parado: 'Córners ofensivos: Saque cerrado a primer palo con prolongación.\nFaltas defensivas: Bloque de línea de fuera de juego adelantado con barrera compacta de 4.',
            fecha_creacion: new Date().toISOString().split('T')[0]
          }
        ];
        localStorage.setItem(plansKey, JSON.stringify(defaults));
        setPlans(defaults);
        setActivePlan(defaults[0]);
      }
    };

    fetchPlans();
  }, [selectedTeam]);

  const savePlans = async (updated: MatchPlan[]) => {
    setPlans(updated);
    localStorage.setItem(`team_gameplans_${selectedTeam}`, JSON.stringify(updated));

    // Try to sync to Supabase in background
    try {
      for (const p of updated) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
        const payload = {
          team: selectedTeam,
          rival_name: p.rivalName,
          fecha_partido: p.fechaPartido,
          sistema: p.sistema,
          sistema_rival: p.sistemaRival,
          convocatoria: p.convocatoria || [],
          objetivos_tacticos: p.objetivos_tacticos || '',
          alineacion_propuesta: p.alineacion_propuesta || '',
          puntos_fuertes_rival: p.puntos_fuertes_rival || '',
          balon_parado: p.balon_parado || ''
        };

        if (isUuid) {
          await supabase
            .from('match_plans')
            .upsert({ id: p.id, ...payload });
        } else {
          // If it's a temporary ID like 'gp1', insert it and let Supabase assign a real UUID
          const { data, error } = await supabase
            .from('match_plans')
            .insert({ ...payload })
            .select();

          if (!error && data && data[0]) {
            // Update temporary ID in state and local storage with UUID
            p.id = data[0].id;
            setPlans([...updated]);
            localStorage.setItem(`team_gameplans_${selectedTeam}`, JSON.stringify(updated));
            if (activePlan && activePlan.id === p.id) {
              setActivePlan({ ...activePlan, id: data[0].id });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync match plans to Supabase:', err);
    }
  };

  // Generate Counter Strategy with AI
  const handleGenerateAiCounterStrategy = () => {
    if (!formData.sistema || !formData.sistemaRival) {
      toast.error('Selecciona el sistema de juego de ambos equipos para proponer la estrategia.');
      return;
    }

    let objetivos = '';
    let analisisRival = '';

    const ourSys = formData.sistema;
    const rivalSys = formData.sistemaRival;

    if (ourSys === '1-4-3-3' && rivalSys === '1-4-4-2') {
      objetivos = '1. Aprovechar la superioridad en el mediocampo (3 contra 2) para mover rápido el balón.\n2. Extremos fijos bien abiertos para obligar a sus laterales a abrirse, creando carriles interiores.\n3. Presión tras pérdida alta obligando al rival a tirar en largo hacia sus delanteros aislados.';
      analisisRival = 'El rival juega un 1-4-4-2 plano. Su debilidad es la inferioridad central de sus dos pivotes. Si nuestro pivote defensivo (MCD) recibe limpio, podemos dominar las transiciones y filtrar balones de peligro.';
    } else if (ourSys === '1-3-5-2' && rivalSys === '1-4-3-3') {
      objetivos = '1. Dominar el mediocampo con superioridad 5 contra 3.\n2. Repliegue de carrileros para formar línea de 5 atrás y frenar el desborde de sus extremos.\n3. Transiciones ofensivas rápidas buscando los duelos 2 contra 2 de nuestras atacantes contra sus centrales.';
      analisisRival = 'Juegan con un ofensivo 1-4-3-3. Sus extremos son muy dinámicos pero descuidan la ayuda defensiva. Si nuestros carrileros ganan su espalda en contragolpe, la línea defensiva rival quedará totalmente expuesta.';
    } else if (ourSys === '1-4-4-2' && rivalSys === '1-3-5-2') {
      objetivos = '1. Cerrar pasillos interiores con bloque medio compacto.\n2. Doblar marcas en banda para contrarrestar la subida de sus carrileros.\n3. Balones aéreos al espacio libre detrás de sus carrileros cuando se sumen al ataque.';
      analisisRival = 'El rival utiliza un 1-3-5-2. Al poblar tanto el centro del campo, intentarán filtrar pases constantes. No obstante, si logramos transicionar rápido hacia las bandas opuestas, encontraremos amplios espacios libres.';
    } else {
      // General match
      objetivos = `1. Presión media coordinada tapando las líneas de pase de su pivote organizador.\n2. Salida limpia de balón por bajo explotando la amplitud.\n3. Coberturas defensivas constantes en zona de tres cuartos para evitar el tiro exterior.`;
      analisisRival = `El rival juega con un sistema de juego ${rivalSys}. Tienen buen trato de balón pero suelen sufrir ante presión asfixiante tras pérdida. Hay que forzar sus errores en su primer tercio del campo.`;
    }

    // Auto assign suggested lineup using roster names if possible
    let alineacion = '';
    const gks = roster.filter(p => p.posicion === 'PORTERO');
    const dfs = roster.filter(p => p.posicion === 'DEFENSA');
    const mfs = roster.filter(p => p.posicion === 'CENTROCAMPISTA');
    const fws = roster.filter(p => p.posicion === 'DELANTERO');

    if (ourSys === '1-4-3-3') {
      alineacion = `Portero: ${gks[0]?.nombre || 'GK'}\nDefensas: ${dfs[0]?.nombre || 'LI'}, ${dfs[1]?.nombre || 'CDI'}, ${dfs[2]?.nombre || 'CDD'}, ${dfs[3]?.nombre || 'LD'}\nMediocampo: ${mfs[0]?.nombre || 'MCD'}, ${mfs[1]?.nombre || 'MCI'}, ${mfs[2]?.nombre || 'MCD'}\nDelanteros: ${fws[0]?.nombre || 'EI'}, ${fws[1]?.nombre || 'ED'}, ${fws[2]?.nombre || 'DC'}`;
    } else if (ourSys === '1-4-4-2') {
      alineacion = `Portero: ${gks[0]?.nombre || 'GK'}\nDefensas: ${dfs[0]?.nombre || 'LI'}, ${dfs[1]?.nombre || 'CDI'}, ${dfs[2]?.nombre || 'CDD'}, ${dfs[3]?.nombre || 'LD'}\nMediocampo: ${mfs[0]?.nombre || 'MCI'}, ${mfs[1]?.nombre || 'MC'}, ${mfs[2]?.nombre || 'MCD'}, ${mfs[3]?.nombre || 'MCO'}\nDelanteros: ${fws[0]?.nombre || 'DCI'}, ${fws[1]?.nombre || 'DCD'}`;
    } else {
      alineacion = `Portero: ${gks[0]?.nombre || 'GK'}\nDefensas: ${dfs.slice(0, 3).map(d => d.nombre).join(', ') || 'DEF, DEF, DEF'}\nMediocampo: ${mfs.slice(0, 4).map(m => m.nombre).join(', ') || 'MED, MED, MED, MED'}\nDelanteros: ${fws.slice(0, 3).map(f => f.nombre).join(', ') || 'DEL, DEL, DEL'}`;
    }

    setFormData({
      ...formData,
      objetivos_tacticos: objetivos,
      puntos_fuertes_rival: analisisRival,
      alineacion_propuesta: alineacion,
      balon_parado: 'Córners defensivos: Marca mixta. 2 jugadoras al primer palo, resto al hombre.\nFaltas ofensivas: Lanzamiento directo al área buscando prolongación en segundo palo.'
    });

    toast.success('¡Estrategia recomendada por la IA cargada con éxito! Revisa los campos sugeridos.');
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rivalName.trim()) {
      toast.error('Debe ingresar el nombre del equipo rival.');
      return;
    }

    const newPlan: MatchPlan = {
      id: crypto.randomUUID(),
      matchId: '',
      rivalName: formData.rivalName,
      fechaPartido: formData.fechaPartido,
      sistema: formData.sistema,
      sistemaRival: formData.sistemaRival,
      convocatoria: formData.convocatoria,
      objetivos_tacticos: formData.objetivos_tacticos,
      alineacion_propuesta: formData.alineacion_propuesta,
      puntos_fuertes_rival: formData.puntos_fuertes_rival,
      balon_parado: formData.balon_parado,
      fecha_creacion: new Date().toISOString().split('T')[0]
    };

    const updated = [newPlan, ...plans];
    savePlans(updated);
    setActivePlan(newPlan);
    setShowAddForm(false);
    toast.success(`Plan de partido contra ${formData.rivalName} preparado con éxito.`);

    // Clear form
    setFormData({
      rivalName: '',
      fechaPartido: new Date().toISOString().split('T')[0],
      sistema: '1-4-3-3',
      sistemaRival: '1-4-4-2',
      convocatoria: [],
      objetivos_tacticos: '',
      alineacion_propuesta: '',
      puntos_fuertes_rival: '',
      balon_parado: ''
    });
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;
    if (!formData.rivalName.trim()) {
      toast.error('El nombre del equipo rival es obligatorio.');
      return;
    }

    const updatedPlans = plans.map(p => {
      if (p.id === editingPlanId) {
        return {
          ...p,
          rivalName: formData.rivalName,
          fechaPartido: formData.fechaPartido,
          sistema: formData.sistema,
          sistemaRival: formData.sistemaRival,
          convocatoria: formData.convocatoria,
          objetivos_tacticos: formData.objetivos_tacticos,
          alineacion_propuesta: formData.alineacion_propuesta,
          puntos_fuertes_rival: formData.puntos_fuertes_rival,
          balon_parado: formData.balon_parado,
        };
      }
      return p;
    });

    savePlans(updatedPlans);
    const updatedActive = updatedPlans.find(p => p.id === editingPlanId) || null;
    setActivePlan(updatedActive);
    setEditingPlanId(null);
    setShowAddForm(false);
    toast.success('Plan de partido modificado con éxito.');

    // Clear form
    setFormData({
      rivalName: '',
      fechaPartido: new Date().toISOString().split('T')[0],
      sistema: '1-4-3-3',
      sistemaRival: '1-4-4-2',
      convocatoria: [],
      objetivos_tacticos: '',
      alineacion_propuesta: '',
      puntos_fuertes_rival: '',
      balon_parado: ''
    });
  };

  const handleDeletePlan = async (id: string, rival: string) => {
    if (confirm(`¿Estás seguro de eliminar el plan técnico contra ${rival}?`)) {
      const updated = plans.filter(p => p.id !== id);
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        try {
          await supabase
            .from('match_plans')
            .delete()
            .eq('id', id);
        } catch (err) {
          console.warn('Failed to delete match plan from Supabase:', err);
        }
      }

      savePlans(updated);
      if (activePlan?.id === id) {
        setActivePlan(updated.length > 0 ? updated[0] : null);
      }
      toast.success('Plan de partido eliminado.');
    }
  };

  const togglePlayerInConvocation = (playerId: string) => {
    setFormData(prev => {
      const isSelected = prev.convocatoria.includes(playerId);
      const updated = isSelected 
        ? prev.convocatoria.filter(id => id !== playerId)
        : [...prev.convocatoria, playerId];
      return { ...prev, convocatoria: updated };
    });
  };

  const handlePrintFull = () => {
    setPrintMode('full');
    setTimeout(() => {
      window.focus();
      window.print();
    }, 150);
  };

  const handlePrintConvocatoriaOnly = () => {
    setPrintMode('convocatoria');
    setTimeout(() => {
      window.focus();
      window.print();
    }, 150);
  };

  const handleOpenWhatsappConvocatoria = () => {
    if (!activePlan) return;
    
    // Build initial list of players
    const listText = activePlan.convocatoria && activePlan.convocatoria.length > 0
      ? activePlan.convocatoria
          .map((id, index) => {
            const pl = roster.find(p => p.id === id);
            if (!pl) return null;
            return `🔹 ${pl.dorsal ? `#${pl.dorsal} ` : `Jugadora ${index + 1}`}: ${pl.nombre} ${pl.apellidos}`;
          })
          .filter(Boolean)
          .join('\n')
      : 'No se han seleccionado jugadoras convocadas.';

    const initialMsg = `📢 *U.D. LA POVEDA - CONVOCATORIA OFICIAL* 📢\n\n` +
      `⚔️ *Rival:* VS ${activePlan.rivalName}\n` +
      `📅 *Fecha:* ${activePlan.fechaPartido}\n\n` +
      `📋 *Jugadoras Convocadas:* \n${listText}\n\n` +
      `👔 *Cuerpo Técnico* • Acudir con la equipación oficial 1 hora antes del encuentro. ¡Vamos equipo! 💪⚽`;

    setWhatsappConvMessage(initialMsg);
    setShowWhatsappConvModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Selector & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 border border-slate-900 p-4 rounded-2xl print:hidden">
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
          className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-orange-600 hover:bg-orange-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Elaborar Plan de Partido</span>
        </Button>
      </div>

      {/* Add Plan Form */}
      {showAddForm && (
        <form onSubmit={editingPlanId ? handleUpdatePlan : handleCreatePlan} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-6 animate-in slide-in-from-top duration-200 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
            <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2">
              <Presentation className="w-4 h-4 text-orange-500" />
              <span>{editingPlanId ? 'Modificar Plan Técnico & Convocatoria' : 'Nuevo Plan Técnico & Convocatoria'}</span>
            </h4>
            <Button
              type="button"
              onClick={handleGenerateAiCounterStrategy}
              className="text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white flex items-center gap-1.5 self-start sm:self-auto shadow-md"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span>Propuesta Táctica IA ✨</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Equipo Rival *</label>
              <input
                type="text"
                required
                placeholder="Ej. F.C. Arganda"
                value={formData.rivalName}
                onChange={(e) => setFormData({...formData, rivalName: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 mt-1 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fecha del Partido *</label>
              <input
                type="date"
                required
                value={formData.fechaPartido}
                onChange={(e) => setFormData({...formData, fechaPartido: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 mt-1 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-bold cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nuestro Sistema</label>
              <select 
                value={formData.sistema}
                onChange={(e) => setFormData({...formData, sistema: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 cursor-pointer font-bold"
              >
                <option value="1-4-3-3">1-4-3-3</option>
                <option value="1-4-4-2">1-4-4-2</option>
                <option value="1-3-4-3">1-3-4-3</option>
                <option value="1-3-5-2">1-3-5-2</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Sistema del Rival</label>
              <select 
                value={formData.sistemaRival}
                onChange={(e) => setFormData({...formData, sistemaRival: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 cursor-pointer font-bold"
              >
                <option value="1-4-3-3">1-4-3-3</option>
                <option value="1-4-4-2">1-4-4-2</option>
                <option value="1-3-4-3">1-3-4-3</option>
                <option value="1-3-5-2">1-3-5-2</option>
              </select>
            </div>

            {/* Convocation Builder Selector */}
            <div className="col-span-full bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Construir Convocatoria ({formData.convocatoria.length} Jugadoras Seleccionadas)</span>
              </span>
              <p className="text-[10px] text-slate-500">Haz clic sobre las jugadoras del equipo para convocarlas al encuentro.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                {roster.map(p => {
                  const isSelected = formData.convocatoria.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayerInConvocation(p.id)}
                      className={`p-2 rounded-xl text-[11px] text-left border transition-all flex items-center justify-between font-bold ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">
                        {p.dorsal ? `#${p.dorsal} ` : ''}{p.nombre}
                      </span>
                      <span className="text-[8px] opacity-60 ml-1 uppercase">{p.posicion.substring(0,3)}</span>
                    </button>
                  );
                })}
                {roster.length === 0 && (
                  <div className="col-span-full py-4 text-center text-slate-650 text-xs font-semibold">
                    No hay jugadoras cargadas en la plantilla.
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Objetivos Tácticos Principales</label>
                <textarea 
                  value={formData.objetivos_tacticos}
                  onChange={(e) => setFormData({...formData, objetivos_tacticos: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-32 leading-relaxed"
                  placeholder="Ej. Bloque medio defensivo rápido..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Alineación Teórica Recomendada</label>
                <textarea 
                  value={formData.alineacion_propuesta}
                  onChange={(e) => setFormData({...formData, alineacion_propuesta: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-32 leading-relaxed"
                  placeholder="Enumera el once inicial titular..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Puntos Fuertes / Debilidades del Rival</label>
                <textarea 
                  value={formData.puntos_fuertes_rival}
                  onChange={(e) => setFormData({...formData, puntos_fuertes_rival: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-32 leading-relaxed"
                  placeholder="Describe cómo neutralizar las fortalezas del oponente..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Estrategia a Balón Parado (ABP)</label>
                <textarea 
                  value={formData.balon_parado}
                  onChange={(e) => setFormData({...formData, balon_parado: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1 h-32 leading-relaxed"
                  placeholder="Detalla saques de esquina, faltas y marcas..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
              className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold"
            >
              {editingPlanId ? 'Guardar Cambios' : 'Crear Plan Matchday'}
            </Button>
          </div>
        </form>
      )}

      {/* Main Grid: Feed & Plan Book */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
        
        {/* Left column: Scheduled Game plans lists */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-3xl p-4 space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Planes de Partido</h5>
            <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-400 px-2.5 py-1 rounded-full font-bold">{plans.length}</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {plans.length > 0 ? (
              plans.map((pl) => {
                const isActive = activePlan?.id === pl.id;
                
                return (
                  <div 
                    key={pl.id}
                    onClick={() => setActivePlan(pl)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 group relative ${
                      isActive 
                        ? 'bg-blue-600/10 border-blue-600' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex gap-1 mb-1.5">
                        <span className="text-[9px] text-orange-400 font-extrabold bg-orange-500/10 border border-orange-500/15 px-2 py-0.5 rounded uppercase">
                          {pl.sistema}
                        </span>
                        <span className="text-[9px] text-blue-400 font-extrabold bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded uppercase">
                          VS {pl.sistemaRival}
                        </span>
                      </div>
                      <h6 className="font-bold text-white text-xs truncate max-w-[180px]">VS {pl.rivalName}</h6>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">Fecha partido: {pl.fechaPartido}</p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(pl.id, pl.rivalName);
                      }}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                <Presentation className="w-8 h-8 text-slate-700" />
                <h6 className="font-bold text-slate-400 text-xs uppercase">No hay dossieres creados</h6>
                <p className="text-[9px] text-slate-650 max-w-xs">Diseña tu primer dossier táctico para el próximo partido.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Game Plan Dossier book details */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 min-h-[500px] print:hidden">
          {activePlan ? (
            <div className="space-y-6">
              
              {/* Dossier Header details */}
              <div className="border-b border-slate-900 pb-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-white text-base uppercase tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-6 bg-orange-500 rounded-sm inline-block shrink-0" />
                      <span>DOSSIER TÁCTICO: VS {activePlan.rivalName}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                      FECHA ENCUENTRO: {activePlan.fechaPartido} • SISTEMA: {activePlan.sistema} (POVEDA) VS {activePlan.sistemaRival} (RIVAL)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Button 
                    onClick={() => {
                      setEditingPlanId(activePlan.id);
                      setFormData({
                        rivalName: activePlan.rivalName,
                        fechaPartido: activePlan.fechaPartido,
                        sistema: activePlan.sistema,
                        sistemaRival: activePlan.sistemaRival,
                        convocatoria: activePlan.convocatoria || [],
                        objetivos_tacticos: activePlan.objetivos_tacticos || '',
                        alineacion_propuesta: activePlan.alineacion_propuesta || '',
                        puntos_fuertes_rival: activePlan.puntos_fuertes_rival || '',
                        balon_parado: activePlan.balon_parado || '',
                      });
                      setShowAddForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    variant="outline" 
                    className="text-xs font-bold uppercase border-slate-800 hover:bg-slate-800 rounded-xl px-4 py-1.5 h-auto cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Modificar Plan</span>
                  </Button>

                  <Button 
                    onClick={handlePrintFull}
                    variant="outline" 
                    className="text-xs font-bold uppercase border-slate-800 hover:bg-slate-800 rounded-xl px-4 py-1.5 h-auto cursor-pointer flex items-center gap-1.5 text-orange-500"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Dossier Completo</span>
                  </Button>

                  <Button 
                    onClick={handlePrintConvocatoriaOnly}
                    className="text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-1.5 h-auto cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Convocatoria</span>
                  </Button>

                  <Button 
                    onClick={handleOpenWhatsappConvocatoria}
                    className="text-xs font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-1.5 h-auto cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Convocatoria</span>
                  </Button>
                </div>
              </div>

              {/* Convocatoria list */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5 print:bg-gray-100 print:border-gray-300 print:text-black">
                <h5 className="font-extrabold text-white text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-emerald-400 border-b border-slate-900 pb-2 print:text-black print:border-gray-300">
                  <UserCheck className="w-4 h-4 text-emerald-500 print:text-black" />
                  <span>Convocatoria de Jugadoras ({activePlan.convocatoria?.length || 0})</span>
                </h5>
                {activePlan.convocatoria && activePlan.convocatoria.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
                    {activePlan.convocatoria.map(id => {
                      const pl = roster.find(p => p.id === id);
                      if (!pl) return null;
                      return (
                        <span key={id} className="bg-slate-900/80 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg uppercase print:bg-white print:border-gray-300 print:text-black">
                          {pl.dorsal ? `#${pl.dorsal} ` : ''}{pl.nombre} {pl.apellidos.substring(0, 8)}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No se ha registrado una convocatoria oficial para este encuentro.</p>
                )}
              </div>

              {/* Dossier structured grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed print:block print:space-y-4">
                
                {/* Block 1: Objetivos tacticos */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5 print:bg-transparent print:border-none print:p-0 print:text-black">
                  <h5 className="font-extrabold text-white text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-orange-400 border-b border-slate-900 pb-2 print:text-black print:border-b print:border-gray-400 print:text-xs">
                    <Target className="w-4 h-4 text-orange-500 print:hidden" />
                    <span>Objetivos Tácticos de Bloque & Contra-Estrategia IA</span>
                  </h5>
                  <p className="text-slate-300 font-medium whitespace-pre-wrap print:text-black">{activePlan.objetivos_tacticos || 'Sin objetivos de bloque especificados.'}</p>
                </div>

                {/* Block 2: Alineacion propuesta */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5 print:bg-transparent print:border-none print:p-0 print:text-black">
                  <h5 className="font-extrabold text-white text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-blue-400 border-b border-slate-900 pb-2 print:text-black print:border-b print:border-gray-400 print:text-xs">
                    <Users className="w-4 h-4 text-blue-500 print:hidden" />
                    <span>Alineación Teórica Propuesta</span>
                  </h5>
                  <p className="text-slate-300 font-mono whitespace-pre-wrap leading-relaxed print:text-black">{activePlan.alineacion_propuesta || 'Sin alineación redactada.'}</p>
                </div>

                {/* Block 3: Analisis Rival */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5 print:bg-transparent print:border-none print:p-0 print:text-black">
                  <h5 className="font-extrabold text-white text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-red-400 border-b border-slate-900 pb-2 print:text-black print:border-b print:border-gray-400 print:text-xs">
                    <Award className="w-4 h-4 text-red-500 print:hidden" />
                    <span>Puntos Fuertes / Vigilancias Rival</span>
                  </h5>
                  <p className="text-slate-300 font-medium whitespace-pre-wrap print:text-black">{activePlan.puntos_fuertes_rival || 'Sin análisis del rival redactado.'}</p>
                </div>

                {/* Block 4: Balon parado */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5 print:bg-transparent print:border-none print:p-0 print:text-black">
                  <h5 className="font-extrabold text-white text-[10px] uppercase tracking-wider flex items-center gap-1.5 text-emerald-400 border-b border-slate-900 pb-2 print:text-black print:border-b print:border-gray-400 print:text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 print:hidden" />
                    <span>Estrategia a Balón Parado (ABP)</span>
                  </h5>
                  <p className="text-slate-300 font-medium whitespace-pre-wrap print:text-black">{activePlan.balon_parado || 'Sin jugadas de estrategia añadidas.'}</p>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <Presentation className="w-12 h-12 text-slate-800" />
              <h5 className="font-bold text-white uppercase text-sm">Sin dossier activo</h5>
              <p className="text-xs text-slate-500 max-w-xs">Crea un nuevo dossier técnico o selecciona uno para preparar tu próxima jornada de competición.</p>
            </div>
          )}
        </div>

      </div>

      {/* WhatsApp Convocatoria Modal */}
      {showWhatsappConvModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3">
              <MessageCircle className="w-5 h-5" />
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Enviar Convocatoria por WhatsApp</h4>
            </div>
            
            <p className="text-xs text-slate-400">
              Copia o edita este mensaje listo para enviar al grupo de WhatsApp del equipo o a las jugadoras:
            </p>

            <div className="space-y-1.5">
              <textarea
                value={whatsappConvMessage}
                onChange={(e) => setWhatsappConvMessage(e.target.value)}
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-mono leading-relaxed resize-none"
                placeholder="Escribe el mensaje de convocatoria..."
              />
            </div>

            <div className="bg-blue-950/40 border border-blue-900/30 rounded-2xl p-4 space-y-2.5 text-xs text-blue-300">
              <span className="font-bold uppercase tracking-wider block text-[10px] text-blue-400">💡 Instrucciones de envío:</span>
              <p className="leading-relaxed">
                Por seguridad, WhatsApp no permite enviar mensajes automáticamente. Al pulsar cualquiera de los botones, se abrirá WhatsApp con tu mensaje precargado. Solo tendrás que elegir el destinatario o grupo y pulsar **Enviar**.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWhatsappConvModal(false)}
                  className="flex-1 text-xs font-bold uppercase border-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappConvMessage);
                    toast.success('¡Mensaje copiado al portapapeles!');
                  }}
                  className="flex-1 text-xs font-bold uppercase border-slate-800 text-slate-300 hover:text-white"
                >
                  Copiar Mensaje
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappConvMessage)}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                    toast.success('Abriendo WhatsApp App...');
                  }}
                  className="text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 py-2.5 h-auto"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp (Móvil / App)</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappConvMessage)}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                    toast.success('Abriendo WhatsApp Web...');
                  }}
                  className="text-xs font-bold uppercase bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1.5 py-2.5 h-auto"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Web (Navegador)</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY CONVOCATORIA POR SEPARADO */}
      {activePlan && createPortal(
        <div id="printable-convocatoria" className="print-only-convocatoria-container text-black bg-white min-h-screen">
          <div className="border-4 border-double border-emerald-400 p-12 rounded-3xl relative max-w-2xl mx-auto my-12">
            <div className="border-b-4 border-emerald-600 pb-4 text-center">
              <h1 className="text-3xl font-black tracking-tight text-emerald-700">U.D. LA POVEDA</h1>
              <p className="text-sm font-extrabold text-slate-600 uppercase tracking-widest mt-1">CONVOCATORIA OFICIAL MATCHDAY</p>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                TEMPORADA 2026/2027 • JORNADA DE COMPETICIÓN
              </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 my-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-slate-300 py-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rival</p>
                  <p className="text-sm font-black text-slate-900">VS {activePlan.rivalName}</p>
                </div>
                <div className="py-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Partido</p>
                  <p className="text-sm font-black text-slate-900">{activePlan.fechaPartido}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-950 pb-2 flex items-center justify-between">
                <span>Jugadoras Convocadas</span>
                <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-xs font-extrabold">Total: {activePlan.convocatoria?.length || 0}</span>
              </h3>

              {activePlan.convocatoria && activePlan.convocatoria.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {activePlan.convocatoria.map((id, index) => {
                    const pl = roster.find(p => p.id === id);
                    if (!pl) return null;
                    return (
                      <div key={`conv-print-sep-${id}`} className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-sm">
                        <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                          {pl.dorsal || index + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900 uppercase leading-none">{pl.nombre} {pl.apellidos}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{pl.posicion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-12">No se han seleccionado jugadoras convocadas todavía.</p>
              )}
            </div>

            <div className="pt-12 text-center max-w-md mx-auto">
              <div className="border-t border-slate-350 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuerpo Técnico • U.D. LA POVEDA</p>
                <p className="text-[10px] text-slate-500 mt-1">Por favor, acudan con la equipación oficial 1 hora antes del encuentro.</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PRINT-ONLY DUPLICATE CONTAINERS TO ENSURE PERFECT PDF DIVISION */}
      {activePlan && createPortal(
        <div id="printable-plan" className="print-only-container text-black bg-white min-h-screen">
          
          {/* PAGE 1: DOSSIER TÁCTICO */}
          <div className="print-page border-4 border-double border-slate-400 p-12 rounded-3xl relative mb-12">
            <div className="border-b-4 border-slate-900 pb-4 text-center">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">U.D. LA POVEDA</h1>
              <p className="text-xs font-bold text-slate-500 uppercase">DOSSIER TÁCTICO OFICIAL • {selectedTeam}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-100 p-4 rounded-xl border border-slate-300 my-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Rival del Encuentro</p>
                <p className="text-sm font-extrabold text-slate-900">VS {activePlan.rivalName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Fecha del Partido</p>
                <p className="text-sm font-extrabold text-slate-900">{activePlan.fechaPartido}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Sistema Propuesto</p>
                <p className="text-xs font-extrabold text-slate-900">{activePlan.sistema}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Sistema Rival</p>
                <p className="text-xs font-extrabold text-slate-900">{activePlan.sistemaRival}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-900">1. Objetivos Tácticos de Bloque & Contra-Estrategia</h3>
                <p className="text-xs text-slate-850 whitespace-pre-wrap mt-1.5 leading-relaxed">{activePlan.objetivos_tacticos || 'Sin objetivos especificados.'}</p>
              </div>

              <div className="border-b-2 border-slate-200 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-900">2. Alineación Teórica Propuesta</h3>
                <p className="text-xs text-slate-850 whitespace-pre-wrap font-mono mt-1.5 leading-relaxed">{activePlan.alineacion_propuesta || 'Sin alineación propuesta.'}</p>
              </div>

              <div className="border-b-2 border-slate-200 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-900">3. Puntos Fuertes / Vigilancias del Rival</h3>
                <p className="text-xs text-slate-850 whitespace-pre-wrap mt-1.5 leading-relaxed">{activePlan.puntos_fuertes_rival || 'Sin análisis del rival.'}</p>
              </div>

              <div className="border-b-2 border-slate-200 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-900">4. Estrategia a Balón Parado (ABP)</h3>
                <p className="text-xs text-slate-850 whitespace-pre-wrap mt-1.5 leading-relaxed">{activePlan.balon_parado || 'Sin jugadas de estrategia.'}</p>
              </div>
            </div>
            
            <div className="pt-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>U.D. LA POVEDA © 2026 • DOSSIER DE COMPETICIÓN</span>
            </div>
          </div>

          {/* PAGE 2: HOJA DE CONVOCATORIA (IMPRESA POR SEPARADO) */}
          <div className="print-page border-4 border-double border-emerald-400 p-12 rounded-3xl relative">
            <div className="border-b-4 border-emerald-600 pb-4 text-center">
              <h1 className="text-3xl font-black tracking-tight text-emerald-700">U.D. LA POVEDA</h1>
              <p className="text-sm font-extrabold text-slate-600 uppercase tracking-widest mt-1">CONVOCATORIA OFICIAL MATCHDAY</p>
              <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-lg p-2.5 mt-3 max-w-md mx-auto">
                <p className="text-xs font-extrabold text-emerald-800 uppercase">Jornada de Competición • {selectedTeam}</p>
              </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300 my-6 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="border-r border-slate-300 py-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rival</p>
                  <p className="text-lg font-black text-slate-900 uppercase mt-0.5">VS {activePlan.rivalName}</p>
                </div>
                <div className="py-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Encuentro</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{activePlan.fechaPartido}</p>
                </div>
              </div>
            </div>

            <div className="max-w-2xl mx-auto space-y-4 my-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-950 pb-2 flex items-center justify-between">
                <span>Jugadoras Convocadas</span>
                <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-xs font-extrabold">Total: {activePlan.convocatoria?.length || 0}</span>
              </h3>

              {activePlan.convocatoria && activePlan.convocatoria.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {activePlan.convocatoria.map((id, index) => {
                    const pl = roster.find(p => p.id === id);
                    if (!pl) return null;
                    return (
                      <div key={`conv-print-${id}`} className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-sm">
                        <span className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">
                          {pl.dorsal || index + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900 uppercase leading-none">{pl.nombre} {pl.apellidos}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{pl.posicion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-12">No se han seleccionado jugadoras convocadas todavía.</p>
              )}
            </div>

            <div className="pt-12 text-center max-w-md mx-auto">
              <div className="border-t border-slate-350 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuerpo Técnico • U.D. LA POVEDA</p>
                <p className="text-[10px] text-slate-500 mt-1">Por favor, acudan con la equipación oficial 1 hora antes del encuentro.</p>
              </div>
            </div>
          </div>

        </div>,
        document.body
      )}

      {/* Printable Style Block */}
      <style>{`
        .print-only-container, .print-only-convocatoria-container {
          display: none !important;
        }
        @media print {
          html, body {
            background-color: white !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            display: none !important;
          }
          ${printMode === 'full' ? `
            .print-only-container {
              display: block !important;
              background: white !important;
              color: black !important;
            }
          ` : ''}
          ${printMode === 'convocatoria' ? `
            .print-only-convocatoria-container {
              display: block !important;
              background: white !important;
              color: black !important;
            }
          ` : ''}
          .print-page {
            page-break-after: always;
            break-after: page;
            min-height: 100vh;
          }
          @page {
            size: portrait;
            margin: 15mm;
          }
        }
      `}</style>

    </div>
  );
}

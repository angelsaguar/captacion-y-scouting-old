import React, { useRef, useState, useEffect } from 'react';
import { 
  Activity, 
  Trash2, 
  RotateCcw, 
  MousePointer, 
  Edit3, 
  Eraser, 
  Sparkles,
  Info,
  Users,
  Trophy,
  Compass,
  Zap
} from 'lucide-react';
import { CLUB_TEAMS } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
}

interface TacticalToken {
  id: string;
  name: string;
  fullName?: string;
  x: number;
  y: number;
  color: string;
  posType?: string; // PORTERO, DEFENSA, CENTROCAMPISTA, DELANTERO
}

export default function PizarraTactica() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Active team selector
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  
  // Tactical Systems selectors
  const [povedaSystem, setPovedaSystem] = useState<string>('1-4-3-3');
  const [rivalSystem, setRivalSystem] = useState<string>('1-4-4-2');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#ffffff');
  const [penWidth, setPenWidth] = useState(3);
  const [tool, setTool] = useState<'draw' | 'move'>('move');
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Tokens state (Red team, Blue team, Yellow ball)
  const [tokens, setTokens] = useState<TacticalToken[]>([]);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  // Counter Strategy AI Suggestions
  const [aiSuggestion, setAiSuggestion] = useState<string>('');

  // Fetch roster and initialize tokens on team/formation change
  const initializeTokens = () => {
    const initialTokens: TacticalToken[] = [];
    
    // 1. Fetch real roster
    const rosterKey = `team_roster_${selectedTeam}`;
    const savedRoster = localStorage.getItem(rosterKey);
    const playersList: TeamPlayer[] = savedRoster ? JSON.parse(savedRoster) : [];

    // Categorize roster by position
    const gks = playersList.filter(p => p.posicion === 'PORTERO');
    const dfs = playersList.filter(p => p.posicion === 'DEFENSA');
    const mfs = playersList.filter(p => p.posicion === 'CENTROCAMPISTA');
    const fws = playersList.filter(p => p.posicion === 'DELANTERO');
    const remaining = playersList.filter(p => !['PORTERO', 'DEFENSA', 'CENTROCAMPISTA', 'DELANTERO'].includes(p.posicion));

    // Queue of backups
    const fallbackQueue = [...remaining, ...fws, ...mfs, ...dfs, ...gks];

    // Helper to get player or fallback label
    let fallbackIndex = 1;
    const getPlayerForSlot = (positionType: string, slotIndex: number, defaultLabel: string) => {
      let selected: TeamPlayer | undefined;
      if (positionType === 'PORTERO') {
        selected = gks[slotIndex];
      } else if (positionType === 'DEFENSA') {
        selected = dfs[slotIndex];
      } else if (positionType === 'CENTROCAMPISTA') {
        selected = mfs[slotIndex];
      } else if (positionType === 'DELANTERO') {
        selected = fws[slotIndex];
      }

      if (selected) {
        return {
          name: selected.dorsal || selected.nombre.substring(0, 2).toUpperCase(),
          fullName: `${selected.nombre} ${selected.apellidos}`
        };
      }

      // Try fallbacks
      const popped = fallbackQueue.shift();
      if (popped) {
        return {
          name: popped.dorsal || popped.nombre.substring(0, 2).toUpperCase(),
          fullName: `${popped.nombre} ${popped.apellidos}`
        };
      }

      return {
        name: defaultLabel,
        fullName: `Jugadora de Apoyo ${fallbackIndex++}`
      };
    };

    // Coordinate templates for UD La Poveda (Left Side, 50 to 380)
    let redCoords: { label: string; x: number; y: number; posType: string; slotIdx: number }[] = [];

    if (povedaSystem === '1-4-3-3') {
      redCoords = [
        { label: 'GK', x: 50, y: 200, posType: 'PORTERO', slotIdx: 0 },
        { label: 'LI', x: 120, y: 60, posType: 'DEFENSA', slotIdx: 0 },
        { label: 'CDI', x: 140, y: 150, posType: 'DEFENSA', slotIdx: 1 },
        { label: 'CDD', x: 140, y: 250, posType: 'DEFENSA', slotIdx: 2 },
        { label: 'LD', x: 120, y: 340, posType: 'DEFENSA', slotIdx: 3 },
        { label: 'MCD', x: 230, y: 200, posType: 'CENTROCAMPISTA', slotIdx: 0 },
        { label: 'MCI', x: 280, y: 120, posType: 'CENTROCAMPISTA', slotIdx: 1 },
        { label: 'MCD', x: 280, y: 280, posType: 'CENTROCAMPISTA', slotIdx: 2 },
        { label: 'EI', x: 360, y: 80, posType: 'DELANTERO', slotIdx: 0 },
        { label: 'ED', x: 360, y: 320, posType: 'DELANTERO', slotIdx: 1 },
        { label: 'DC', x: 380, y: 200, posType: 'DELANTERO', slotIdx: 2 }
      ];
    } else if (povedaSystem === '1-4-4-2') {
      redCoords = [
        { label: 'GK', x: 50, y: 200, posType: 'PORTERO', slotIdx: 0 },
        { label: 'LI', x: 120, y: 60, posType: 'DEFENSA', slotIdx: 0 },
        { label: 'CDI', x: 140, y: 150, posType: 'DEFENSA', slotIdx: 1 },
        { label: 'CDD', x: 140, y: 250, posType: 'DEFENSA', slotIdx: 2 },
        { label: 'LD', x: 120, y: 340, posType: 'DEFENSA', slotIdx: 3 },
        { label: 'MCI', x: 220, y: 110, posType: 'CENTROCAMPISTA', slotIdx: 0 },
        { label: 'MC', x: 240, y: 180, posType: 'CENTROCAMPISTA', slotIdx: 1 },
        { label: 'MCD', x: 240, y: 240, posType: 'CENTROCAMPISTA', slotIdx: 2 },
        { label: 'MCO', x: 290, y: 200, posType: 'CENTROCAMPISTA', slotIdx: 3 },
        { label: 'DCI', x: 380, y: 140, posType: 'DELANTERO', slotIdx: 0 },
        { label: 'DCD', x: 380, y: 260, posType: 'DELANTERO', slotIdx: 1 }
      ];
    } else if (povedaSystem === '1-3-4-3') {
      redCoords = [
        { label: 'GK', x: 50, y: 200, posType: 'PORTERO', slotIdx: 0 },
        { label: 'CI', x: 140, y: 100, posType: 'DEFENSA', slotIdx: 0 },
        { label: 'CC', x: 150, y: 200, posType: 'DEFENSA', slotIdx: 1 },
        { label: 'CD', x: 140, y: 300, posType: 'DEFENSA', slotIdx: 2 },
        { label: 'MCI', x: 230, y: 80, posType: 'CENTROCAMPISTA', slotIdx: 0 },
        { label: 'MCD', x: 230, y: 170, posType: 'CENTROCAMPISTA', slotIdx: 1 },
        { label: 'MCD', x: 230, y: 230, posType: 'CENTROCAMPISTA', slotIdx: 2 },
        { label: 'MCO', x: 280, y: 200, posType: 'CENTROCAMPISTA', slotIdx: 3 },
        { label: 'EI', x: 360, y: 80, posType: 'DELANTERO', slotIdx: 0 },
        { label: 'ED', x: 360, y: 320, posType: 'DELANTERO', slotIdx: 1 },
        { label: 'DC', x: 380, y: 200, posType: 'DELANTERO', slotIdx: 2 }
      ];
    } else { // 1-3-5-2
      redCoords = [
        { label: 'GK', x: 50, y: 200, posType: 'PORTERO', slotIdx: 0 },
        { label: 'CI', x: 140, y: 110, posType: 'DEFENSA', slotIdx: 0 },
        { label: 'CC', x: 150, y: 200, posType: 'DEFENSA', slotIdx: 1 },
        { label: 'CD', x: 140, y: 290, posType: 'DEFENSA', slotIdx: 2 },
        { label: 'CRI', x: 210, y: 60, posType: 'CENTROCAMPISTA', slotIdx: 0 },
        { label: 'MCI', x: 230, y: 140, posType: 'CENTROCAMPISTA', slotIdx: 1 },
        { label: 'MCD', x: 230, y: 200, posType: 'CENTROCAMPISTA', slotIdx: 2 },
        { label: 'MCD', x: 230, y: 260, posType: 'CENTROCAMPISTA', slotIdx: 3 },
        { label: 'CRD', x: 210, y: 340, posType: 'CENTROCAMPISTA', slotIdx: 4 },
        { label: 'DCI', x: 380, y: 150, posType: 'DELANTERO', slotIdx: 0 },
        { label: 'DCD', x: 380, y: 250, posType: 'DELANTERO', slotIdx: 1 }
      ];
    }

    redCoords.forEach((coord, i) => {
      const pInfo = getPlayerForSlot(coord.posType, coord.slotIdx, coord.label);
      initialTokens.push({
        id: `red-${i}`,
        name: pInfo.name,
        fullName: pInfo.fullName,
        x: coord.x,
        y: coord.y,
        color: '#ef4444', // Red (La Poveda)
        posType: coord.posType
      });
    });

    // Coordinate templates for Rival (Right Side, 750 to 420)
    let blueCoords: { label: string; x: number; y: number }[] = [];

    if (rivalSystem === '1-4-3-3') {
      blueCoords = [
        { label: 'GK', x: 750, y: 200 },
        { label: 'LD', x: 680, y: 60 },
        { label: 'CDD', x: 660, y: 150 },
        { label: 'CDI', x: 660, y: 250 },
        { label: 'LI', x: 680, y: 340 },
        { label: 'MCD', x: 570, y: 200 },
        { label: 'MCD', x: 520, y: 120 },
        { label: 'MCI', x: 520, y: 280 },
        { label: 'ED', x: 440, y: 80 },
        { label: 'EI', x: 440, y: 320 },
        { label: 'DC', x: 420, y: 200 }
      ];
    } else if (rivalSystem === '1-4-4-2') {
      blueCoords = [
        { label: 'GK', x: 750, y: 200 },
        { label: 'LD', x: 680, y: 60 },
        { label: 'CDD', x: 660, y: 150 },
        { label: 'CDI', x: 660, y: 250 },
        { label: 'LI', x: 680, y: 340 },
        { label: 'MCD', x: 560, y: 130 },
        { label: 'MC', x: 580, y: 200 },
        { label: 'MCI', x: 560, y: 270 },
        { label: 'MCO', x: 510, y: 200 },
        { label: 'DCD', x: 420, y: 150 },
        { label: 'DCI', x: 420, y: 250 }
      ];
    } else if (rivalSystem === '1-3-4-3') {
      blueCoords = [
        { label: 'GK', x: 750, y: 200 },
        { label: 'CD', x: 660, y: 110 },
        { label: 'CC', x: 650, y: 200 },
        { label: 'CI', x: 660, y: 290 },
        { label: 'MCD', x: 570, y: 80 },
        { label: 'MC', x: 580, y: 170 },
        { label: 'MCI', x: 580, y: 230 },
        { label: 'MCO', x: 520, y: 200 },
        { label: 'ED', x: 440, y: 80 },
        { label: 'DC', x: 420, y: 200 },
        { label: 'EI', x: 440, y: 320 }
      ];
    } else { // 1-3-5-2
      blueCoords = [
        { label: 'GK', x: 750, y: 200 },
        { label: 'CD', x: 660, y: 110 },
        { label: 'CC', x: 650, y: 200 },
        { label: 'CI', x: 660, y: 290 },
        { label: 'CRD', x: 590, y: 60 },
        { label: 'MCD', x: 570, y: 150 },
        { label: 'MC', x: 570, y: 200 },
        { label: 'MCI', x: 570, y: 250 },
        { label: 'CRI', x: 590, y: 340 },
        { label: 'DCD', x: 420, y: 150 },
        { label: 'DCI', x: 420, y: 250 }
      ];
    }

    blueCoords.forEach((coord, i) => {
      initialTokens.push({
        id: `blue-${i}`,
        name: coord.label,
        fullName: `Rival: ${coord.label}`,
        x: coord.x,
        y: coord.y,
        color: '#2563eb' // Blue (Rival)
      });
    });

    // Ball (Yellow)
    initialTokens.push({
      id: 'ball',
      name: '⚽',
      fullName: 'Balón Oficial',
      x: 400,
      y: 200,
      color: '#eab308' // Yellow
    });

    setTokens(initialTokens);
    toast.success(`Alineaciones tácticas y plantilla asignada para ${povedaSystem} contra ${rivalSystem}`);
  };

  // Generate AI Suggestions based on systems
  useEffect(() => {
    let suggestion = '';
    if (rivalSystem === '1-4-3-3') {
      suggestion = 'Para contrarrestar un 1-4-3-3 con extremos muy abiertos, proponemos jugar con un **1-3-5-2**. El uso de un centro de campo superpoblado (5 jugadoras contra 3 rivales) nos garantizará una superioridad numérica abrumadora en el carril central para dominar la posesión. Además, nuestros carrileros deben fijar las subidas de sus laterales e impedir la libertad de sus extremos en el juego a las bandas.';
    } else if (rivalSystem === '1-4-4-2') {
      suggestion = 'Frente al clásico 1-4-4-2 plano del rival, el sistema **1-4-3-3** es la respuesta ideal. Situar 3 delanteras contra sus 4 defensoras obligará a sus centrales a dudar en las marcas. Además, el pivote defensivo de La Poveda se mantendrá libre para iniciar juego limpio, y crearemos superioridades 3v2 constantes frente a su doble pivote en el medio campo.';
    } else if (rivalSystem === '1-3-4-3') {
      suggestion = 'Contra un esquema agresivo de 3 centrales como el 1-3-4-3, la mejor opción es el **1-4-4-2** o **1-4-3-3**. Al contar el rival con solo 3 zagueros, los pasillos exteriores quedan completamente desprotegidos. Es vital realizar doblamientos laterales rápidos por fuera para generar situaciones de 2 contra 1 letales contra sus defensores exteriores.';
    } else { // 1-3-5-2
      suggestion = 'Para neutralizar un 1-3-5-2 compacto, proponemos un dinámico **1-4-3-3**. Fijando a sus 3 centrales con nuestras 3 atacantes obligaremos a sus carrileros a retroceder defensivamente, convirtiendo su ofensiva en una línea conservadora de 5. Además, la marca a presión sobre su pivote destructor en el círculo central detendrá su progresión táctica.';
    }
    setAiSuggestion(suggestion);
  }, [rivalSystem]);

  // Recalculate tokens on changes
  useEffect(() => {
    initializeTokens();
  }, [selectedTeam, povedaSystem, rivalSystem]);

  // Drawing static lines on canvas
  const drawPitch = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Pitch Green Background
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(0, 0, width, height);

    // Grid grass pattern (subtle lines)
    ctx.fillStyle = '#143626';
    for (let i = 0; i < width; i += 80) {
      if ((i / 80) % 2 === 0) {
        ctx.fillRect(i, 0, 40, height);
      }
    }

    // Line Styles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;

    // Outer Boundary lines
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Halfway Line
    ctx.beginPath();
    ctx.moveTo(width / 2, 20);
    ctx.lineTo(width / 2, height - 20);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 60, 0, 2 * Math.PI);
    ctx.stroke();

    // Center Spot
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    // Penalty Area Left (UD La Poveda side)
    ctx.strokeRect(20, height / 2 - 120, 100, 240);
    ctx.strokeRect(20, height / 2 - 60, 35, 120); // Goal Area
    // Penalty Spot Left
    ctx.beginPath();
    ctx.arc(85, height / 2, 3, 0, 2 * Math.PI);
    ctx.fill();
    // Penalty Arc Left
    ctx.beginPath();
    ctx.arc(120, height / 2, 40, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();

    // Penalty Area Right (Rival side)
    ctx.strokeRect(width - 120, height / 2 - 120, 100, 240);
    ctx.strokeRect(width - 55, height / 2 - 60, 35, 120); // Goal Area
    // Penalty Spot Right
    ctx.beginPath();
    ctx.arc(width - 85, height / 2, 3, 0, 2 * Math.PI);
    ctx.fill();
    // Penalty Arc Right
    ctx.beginPath();
    ctx.arc(width - 120, height / 2, 40, 2 * Math.PI / 3, 4 * Math.PI / 3);
    ctx.stroke();

    // Corner Arcs
    const corners = [
      { x: 20, y: 20, sa: 0, ea: Math.PI / 2 },
      { x: width - 20, y: 20, sa: Math.PI / 2, ea: Math.PI },
      { x: 20, y: height - 20, sa: 1.5 * Math.PI, ea: 2 * Math.PI },
      { x: width - 20, y: height - 20, sa: Math.PI, ea: 1.5 * Math.PI }
    ];

    corners.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, c.sa, c.ea);
      ctx.stroke();
    });
  };

  // Redraw the entire board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPitch(ctx, canvas.width, canvas.height);
      }
    }
  }, []);

  const clearDrawings = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPitch(ctx, canvas.width, canvas.height);
        toast.success('Pizarra despejada.');
      }
    }
  };

  // Mouse & Touch events for Canvas Drawing
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handleStartDraw = (e: any) => {
    if (tool !== 'draw') return;
    setIsDrawing(true);
    const coords = getCoordinates(e);
    setLastPos(coords);
  };

  const handleDrawing = (e: any) => {
    if (!isDrawing || tool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentCoords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    setLastPos(currentCoords);
  };

  const handleStopDraw = () => {
    setIsDrawing(false);
  };

  // Drag and Drop Player Tokens
  const handleTokenMouseDown = (tokenId: string, e: any) => {
    if (tool !== 'move') return;
    setDraggingTokenId(tokenId);
    e.preventDefault();
  };

  const handleTokenTouchStart = (tokenId: string, e: any) => {
    if (tool !== 'move') return;
    setDraggingTokenId(tokenId);
  };

  const handleContainerMouseMove = (e: any) => {
    if (!draggingTokenId || tool !== 'move') return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const containerX = Math.max(0, Math.min(800, ((clientX - rect.left) / rect.width) * 800));
    const containerY = Math.max(0, Math.min(400, ((clientY - rect.top) / rect.height) * 400));

    setTokens(prev => prev.map(tok => {
      if (tok.id === draggingTokenId) {
        return { ...tok, x: containerX, y: containerY };
      }
      return tok;
    }));
  };

  const handleStopDragging = () => {
    setDraggingTokenId(null);
  };

  return (
    <div className="space-y-4">
      {/* Selector & Systems Header Grid */}
      <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Equipo para Cargar Roster</span>
          </label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-slate-950 text-white font-bold text-xs border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            {CLUB_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-red-500" />
            <span>Formación UD La Poveda (Rojas)</span>
          </label>
          <select 
            value={povedaSystem} 
            onChange={(e) => setPovedaSystem(e.target.value)}
            className="bg-slate-950 text-red-400 font-bold text-xs border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-red-500 transition-all cursor-pointer"
          >
            <option value="1-4-3-3">1-4-3-3</option>
            <option value="1-4-4-2">1-4-4-2</option>
            <option value="1-3-5-2">1-3</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>Formación Rival (Azules)</span>
          </label>
          <select 
            value={rivalSystem} 
            onChange={(e) => setRivalSystem(e.target.value)}
            className="bg-slate-950 text-blue-400 font-bold text-xs border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="1-4-3-3">1-4-3-3</option>
            <option value="1-4-4-2">1-4-4-2</option>
            <option value="1-3-5-2">1-3</option>
          </select>
        </div>
      </div>

      {/* Control Actions Panel */}
      <div className="bg-slate-900/60 border border-slate-900 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Toggle Mode Tools */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <Button
            onClick={() => setTool('move')}
            className={`text-xs font-bold px-3.5 py-1.5 h-auto uppercase rounded-lg cursor-pointer ${
              tool === 'move' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MousePointer className="w-4 h-4 mr-1.5" />
            <span>Mover Fichas</span>
          </Button>
 
          <Button
            onClick={() => setTool('draw')}
            className={`text-xs font-bold px-3.5 py-1.5 h-auto uppercase rounded-lg cursor-pointer ${
              tool === 'draw' ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4 mr-1.5" />
            <span>Dibujar Táctica</span>
          </Button>
        </div>

        {/* Color Palette (only visible during Draw mode) */}
        {tool === 'draw' && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Color:</span>
            {[
              { hex: '#ffffff', label: 'Blanco' },
              { hex: '#ef4444', label: 'Rojo' },
              { hex: '#3b82f6', label: 'Azul' },
              { hex: '#eab308', label: 'Amarillo' },
              { hex: '#10b981', label: 'Verde' }
            ].map(col => (
              <button
                key={col.hex}
                onClick={() => setPenColor(col.hex)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  penColor === col.hex ? 'scale-125 border-white shadow-md' : 'border-slate-800 hover:scale-110'
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.label}
              />
            ))}

            <div className="flex items-center gap-1.5 ml-4 border-l border-slate-800 pl-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Grosor:</span>
              <input 
                type="range" 
                min="2" 
                max="8" 
                value={penWidth}
                onChange={(e) => setPenWidth(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-950 rounded-lg cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Action Resets */}
        <div className="flex gap-2">
          <Button
            onClick={clearDrawings}
            variant="outline"
            className="text-xs font-bold uppercase tracking-wider border-slate-850 hover:bg-slate-800 flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-xl"
            title="Borrar líneas de dibujo"
          >
            <Eraser className="w-4 h-4 text-emerald-500" />
            <span>Limpiar Dibujo</span>
          </Button>

          <Button
            onClick={initializeTokens}
            variant="outline"
            className="text-xs font-bold uppercase tracking-wider border-slate-850 hover:bg-slate-800 flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-xl"
            title="Restablecer posiciones"
          >
            <RotateCcw className="w-4 h-4 text-blue-500" />
            <span>Alineación Base</span>
          </Button>
        </div>

      </div>

      {/* AI SUGGESTION COUNTER STRATEGY */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs leading-relaxed">
        <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-md">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Propuesta IA de Contra-Estrategia Táctica</span>
          </span>
          <p className="text-slate-300 leading-relaxed font-medium">
            {aiSuggestion}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-950/20 border border-blue-500/10 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-blue-400 font-semibold leading-relaxed">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Los jugadores de <strong className="text-white">La Poveda (Rojo)</strong> se han cargado automáticamente desde la plantilla real según sus posiciones correspondientes. Coloca el cursor encima de las fichas rojas para ver los nombres completos de las jugadoras asignadas. Arrastra cualquier ficha libremente.
        </p>
      </div>

      {/* Tactial Board Stage wrapper */}
      <div 
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleStopDragging}
        onTouchMove={handleContainerMouseMove}
        onTouchEnd={handleStopDragging}
        className="relative bg-slate-950 rounded-3xl overflow-hidden border border-slate-900 aspect-[2/1] w-full max-w-5xl mx-auto shadow-2xl select-none"
        id="tactical-board-stage"
        style={{ touchAction: 'none' }}
      >
        {/* Draw Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onMouseDown={handleStartDraw}
          onMouseMove={handleDrawing}
          onMouseUp={handleStopDraw}
          onMouseLeave={handleStopDraw}
          onTouchStart={handleStartDraw}
          onTouchMove={handleDrawing}
          onTouchEnd={handleStopDraw}
          className={`absolute inset-0 w-full h-full ${tool === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
        />

        {/* Absolute Floating Player Tokens */}
        {tokens.map((tok) => (
          <div
            key={tok.id}
            onMouseDown={(e) => handleTokenMouseDown(tok.id, e)}
            onTouchStart={(e) => handleTokenTouchStart(tok.id, e)}
            title={tok.fullName}
            className={`absolute flex flex-col items-center justify-center font-black select-none transition-shadow ${
              tool === 'move' ? 'cursor-grab active:cursor-grabbing hover:shadow-xl hover:scale-110' : 'pointer-events-none'
            } ${tok.id === 'ball' ? 'w-6 h-6 rounded-full text-xs shadow-md border border-slate-950 bg-yellow-500' : 'w-8 h-8 rounded-full text-[10px] border-2 border-white/95 text-white shadow-lg'}`}
            style={{
              left: `${(tok.x / 800) * 100}%`,
              top: `${(tok.y / 400) * 100}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: tok.color,
              zIndex: tok.id === 'ball' ? 15 : 10
            }}
          >
            <span>{tok.name}</span>
            {tok.fullName && tok.id.startsWith('red') && (
              <span className="absolute -bottom-4 bg-slate-950/90 text-white text-[8px] px-1 rounded border border-slate-800 scale-75 whitespace-nowrap font-medium pointer-events-none uppercase">
                {tok.fullName.split(' ')[0]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

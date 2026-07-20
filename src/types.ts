export type Role = 'admin' | 'scout';

export interface User {
  id: string;
  nombre: string;
  email: string;
  role: Role;
  created_at?: string;
}

export type PlayerStatus = 'Observado' | 'En seguimiento' | 'Interesa' | 'Fichado' | 'Rechazado';
export type ContactType = 'Padre' | 'Madre' | 'Jugador';
export type Lateralidad = 'Izquierdo' | 'Derecho' | 'Ambidiestro';

export interface Player {
  id: string;
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string; // New field for player/family email
  contacto_tipo?: ContactType;
  equipo_actual?: string;
  equipo_asignado?: string; // New field for assigned team in La Poveda club
  dorsal?: string;
  posicion: string;
  lateralidad?: Lateralidad;
  anio_nacimiento?: number;
  foto_url?: string;
  observaciones?: string;
  motivos_rechazo?: string;
  fecha_seguimiento?: string;
  potencial: number; // 1-5
  estado: PlayerStatus;
  observador?: string; // name of the observer/scout
  created_by?: string;
  created_at?: string;
  attributes?: PlayerAttribute[];
  tags?: string[];
}

export interface Observer {
  id: string;
  nombre: string;
  foto_url?: string;
  created_at?: string;
}

export interface Need {
  id: string;
  equipo: string;
  posicion: string;
  solicitante: string;
  observaciones?: string;
  created_by?: string;
  created_at?: string;
}

export interface PlayerAttribute {
  player_id: string;
  atributo: string;
  valor: number; // 0-5
}

export interface Coach {
  id: string;
  nombre: string;
  club: string;
  equipo: string;
  categoria: string;
  edad?: number;
  email?: string; // New field for coach email
  telefono?: string; // New field for coach phone number
  observaciones?: string;
  equipo_asignado?: string; // New field for assigned team in La Poveda club
  created_by?: string;
  created_at?: string;
}

export const CLUB_TEAMS = [
  'SENIOR FEMENINO',
  'SENIOR MASCULINO',
  'JUVENIL A',
  'JUVENIL B',
  'CADETE A',
  'CADETE B',
  'INFANTIL A',
  'INFANTIL B',
  'INFANTIL C',
  'ALEVIN A F11',
  'ALEVIN A F7',
  'ALEVIN B F7',
  'BENJAMIN A',
  'BENJAMIN B',
  'BENJAMIN C',
  'PRE BENJAMIN A',
  'PREBENJAMIN B'
];

export interface AttributeGroup {
  category: string;
  items: string[];
}

export const POSITION_STRUCTURED_ATTRIBUTES: Record<string, AttributeGroup[]> = {
  PORTERO: [
    { category: 'Aspecto técnico', items: ['Blocaje', 'Desvíos', 'Juego aéreo', 'Uno contra uno', 'Reflejos', 'Paradas de media/larga distancia', 'Juego con los pies', 'Pase corto', 'Pase largo', 'Saque con mano', 'Saque con pie'] },
    { category: 'Aspecto táctico', items: ['Colocación', 'Lectura del juego', 'Cobertura de espacios', 'Anticipación', 'Comunicación con la defensa'] },
    { category: 'Aspecto físico', items: ['Agilidad', 'Explosividad', 'Velocidad de reacción', 'Fuerza', 'Coordinación'] },
    { category: 'Aspecto mental', items: ['Concentración', 'Personalidad', 'Toma de decisiones', 'Liderazgo', 'Gestión de la presión'] }
  ],
  CENTRAL: [
    { category: 'Defensa', items: ['Marcaje', 'Anticipación', 'Entradas', 'Timing defensivo', 'Interceptaciones', 'Coberturas', 'Duelos aéreos', 'Duelos terrestres'] },
    { category: 'Construcción', items: ['Primer pase', 'Pase medio', 'Pase largo', 'Cambio de orientación', 'Conducción', 'Salida de balón bajo presión'] },
    { category: 'Táctica', items: ['Posicionamiento', 'Coordinación de la línea defensiva', 'Lectura del juego', 'Defensa del área'] },
    { category: 'Físico', items: ['Velocidad', 'Potencia', 'Fuerza', 'Resistencia'] },
    { category: 'Mental', items: ['Concentración', 'Liderazgo', 'Agresividad competitiva', 'Calma con balón'] }
  ],
  LATERAL: [
    { category: 'Defensa', items: ['1 vs 1 defensivo', 'Entradas', 'Anticipación', 'Coberturas', 'Defensa del segundo palo'] },
    { category: 'Ataque', items: ['Incorporación ofensiva', 'Centros', 'Pase', 'Conducción', 'Regate', 'Asociación'] },
    { category: 'Táctica', items: ['Ocupación de espacios', 'Temporización', 'Lectura ofensiva', 'Lectura defensiva'] },
    { category: 'Físico', items: ['Velocidad', 'Resistencia', 'Aceleración', 'Capacidad de repetir esfuerzos'] },
    { category: 'Mental', items: ['Intensidad', 'Competitividad', 'Concentración'] }
  ],
  'MEDIO CENTRO DEFENSIVO': [
    { category: 'Defensa', items: ['Recuperación', 'Interceptaciones', 'Duelos', 'Coberturas', 'Presión tras pérdida'] },
    { category: 'Organización', items: ['Primer pase', 'Cambios de orientación', 'Juego entre líneas', 'Ritmo del juego', 'Conservación del balón'] },
    { category: 'Táctica', items: ['Posicionamiento', 'Lectura del juego', 'Equilibrio del equipo', 'Ayudas defensivas'] },
    { category: 'Físico', items: ['Resistencia', 'Fuerza', 'Movilidad'] },
    { category: 'Mental', items: ['Toma de decisiones', 'Inteligencia táctica', 'Personalidad', 'Serenidad'] }
  ],
  INTERIOR: [
    { category: 'Ataque', items: ['Pase', 'Pase filtrado', 'Conducción', 'Regate', 'Llegada al área', 'Disparo'] },
    { category: 'Defensa', items: ['Presión', 'Recuperación', 'Ayudas'] },
    { category: 'Táctica', items: ['Movilidad', 'Ocupación de espacios', 'Juego entre líneas', 'Interpretación del juego'] },
    { category: 'Físico', items: ['Resistencia', 'Dinamismo', 'Intensidad'] },
    { category: 'Mental', items: ['Creatividad', 'Decisión', 'Competitividad'] }
  ],
  'MEDIA PUNTA': [
    { category: 'Creatividad', items: ['Último pase', 'Visión', 'Juego entre líneas', 'Asociación', 'Regate'] },
    { category: 'Finalización', items: ['Disparo', 'Definición', 'Llegada al área'] },
    { category: 'Táctica', items: ['Movimientos entre líneas', 'Recepción orientada', 'Lectura ofensiva'] },
    { category: 'Físico', items: ['Agilidad', 'Cambios de ritmo'] },
    { category: 'Mental', items: ['Imaginación', 'Toma de decisiones', 'Personalidad'] }
  ],
  EXTREMO: [
    { category: 'Desequilibrio', items: ['Regate', 'Uno contra uno', 'Cambios de ritmo', 'Velocidad'] },
    { category: 'Producción ofensiva', items: ['Centro', 'Pase atrás', 'Asistencia'] },
    { category: 'Definición', items: ['Disparo'] },
    { category: 'Táctica', items: ['Desmarques', 'Ataque al espacio', 'Amplitud', 'Juego interior'] },
    { category: 'Defensa', items: ['Repliegue', 'Presión'] },
    { category: 'Mental', items: ['Atrevimiento', 'Confianza', 'Capacidad competitiva'] }
  ],
  DELANTERO: [
    { category: 'Finalización', items: ['Definición', 'Remate de cabeza', 'Remate con ambas piernas', 'Uno contra uno con el portero', 'Primer toque'] },
    { category: 'Juego ofensivo', items: ['Desmarques', 'Ataque del espacio', 'Juego de espaldas', 'Descargas', 'Protección del balón'] },
    { category: 'Táctica', items: ['Movilidad', 'Lectura del área', 'Ocupación de espacios'] },
    { category: 'Físico', items: ['Potencia', 'Velocidad', 'Salto'] },
    { category: 'Mental', items: ['Instinto goleador', 'Ambición', 'Sangre fría', 'Competitividad'] }
  ]
};

export const COMMON_ATTRIBUTES: AttributeGroup[] = [
  { category: 'Técnica', items: ['Control orientado', 'Calidad del pase', 'Dominio de ambas piernas', 'Primer toque'] },
  { category: 'Táctica', items: ['Comprensión del juego', 'Posicionamiento', 'Adaptación a diferentes sistemas', 'Transiciones ofensivas', 'Transiciones defensivas'] },
  { category: 'Física', items: ['Velocidad', 'Aceleración', 'Resistencia', 'Fuerza', 'Coordinación', 'Equilibrio'] },
  { category: 'Mental', items: ['Concentración', 'Personalidad', 'Toma de decisiones', 'Comunicación', 'Liderazgo', 'Resiliencia', 'Actitud competitiva', 'Inteligencia táctica'] }
];

export const POSITION_ATTRIBUTES: Record<string, string[]> = {};
Object.entries(POSITION_STRUCTURED_ATTRIBUTES).forEach(([pos, groups]) => {
  const specific = groups.flatMap(g => g.items);
  const common = COMMON_ATTRIBUTES.flatMap(g => g.items);
  POSITION_ATTRIBUTES[pos] = Array.from(new Set([...specific, ...common]));
});

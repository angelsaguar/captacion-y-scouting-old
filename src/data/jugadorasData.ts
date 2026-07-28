import { Player } from '@/types';

export interface JugadoraOficial {
  id: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  anio_nacimiento: number;
  posicion: string;
  posicion_detalle: string;
  dorsal: string;
  lateralidad?: 'Derecho' | 'Izquierdo' | 'Ambidiestro';
  foto_url?: string;
  estado: 'Fichado' | 'Observado' | 'En seguimiento' | 'Interesa';
  equipo_actual?: string;
  equipo_asignado?: string;
  potencial: number;
}

export const JUGADORAS_ADJUNTAS: JugadoraOficial[] = [
  {
    id: 'jugadora-laura-gutierrez',
    nombre: 'Laura',
    apellidos: 'Gutiérrez Valdericeda',
    fecha_nacimiento: '23/08/2005',
    anio_nacimiento: 2005,
    posicion: 'PIVOTE',
    posicion_detalle: 'Mediocentro (pivote defensivo)',
    dorsal: '6',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-lucia-sanchez',
    nombre: 'Lucía',
    apellidos: 'Sánchez Losada',
    fecha_nacimiento: '07/05/2005',
    anio_nacimiento: 2005,
    posicion: 'DELANTERO',
    posicion_detalle: 'Punta',
    dorsal: '9',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-carmen-rodriguez',
    nombre: 'Carmen',
    apellidos: 'Rodriguez Botella',
    fecha_nacimiento: '29/05/2004',
    anio_nacimiento: 2004,
    posicion: 'LATERAL IZQUIERDO',
    posicion_detalle: 'Lateral izquierda',
    dorsal: '3',
    lateralidad: 'Izquierdo',
    foto_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-laura-marin',
    nombre: 'Laura',
    apellidos: 'Marín Orell',
    fecha_nacimiento: '22/06/1999',
    anio_nacimiento: 1999,
    posicion: 'PORTERO',
    posicion_detalle: 'Portera',
    dorsal: '1',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-maria-angeles-pareja',
    nombre: 'María Ángeles',
    apellidos: 'Pareja Aranda',
    fecha_nacimiento: '14/05/1996',
    anio_nacimiento: 1996,
    posicion: 'LATERAL IZQUIERDO',
    posicion_detalle: 'Lateral izquierda',
    dorsal: '12',
    lateralidad: 'Izquierdo',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-marina-fernandez',
    nombre: 'Marina',
    apellidos: 'Fernández Herreros',
    fecha_nacimiento: '10/05/2000',
    anio_nacimiento: 2000,
    posicion: 'LATERAL DERECHO',
    posicion_detalle: 'Lateral derecha',
    dorsal: '2',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-marina',
    nombre: 'Marina',
    apellidos: '',
    fecha_nacimiento: '22/05/2006',
    anio_nacimiento: 2006,
    posicion: 'DELANTERO',
    posicion_detalle: 'Punta',
    dorsal: '19',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-marta-pulido',
    nombre: 'Marta',
    apellidos: 'Marta Pulido',
    fecha_nacimiento: '01/02/1996',
    anio_nacimiento: 1996,
    posicion: 'MEDIA PUNTA',
    posicion_detalle: 'Media punta o interior',
    dorsal: '10',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-lucia-fernandez',
    nombre: 'Lucía',
    apellidos: 'Fernández Herreros',
    fecha_nacimiento: '22/11/2002',
    anio_nacimiento: 2002,
    posicion: 'MEDIA PUNTA',
    posicion_detalle: 'Media punta o interior',
    dorsal: '8',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-natalia-jimenez',
    nombre: 'Natalia',
    apellidos: 'Jiménez Serrano',
    fecha_nacimiento: '18/09/2002',
    anio_nacimiento: 2002,
    posicion: 'LATERAL DERECHO',
    posicion_detalle: 'Lateral derecha',
    dorsal: '14',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-marta-pastor',
    nombre: 'Marta',
    apellidos: 'Pastor León',
    fecha_nacimiento: '15/11/2006',
    anio_nacimiento: 2006,
    posicion: 'LATERAL DERECHO',
    posicion_detalle: 'Lateral derecha',
    dorsal: '17',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-marta-nieto',
    nombre: 'Marta',
    apellidos: 'Nieto Agraz',
    fecha_nacimiento: '01/04/1998',
    anio_nacimiento: 1998,
    posicion: 'PORTERO',
    posicion_detalle: 'Portera',
    dorsal: '13',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 4
  },
  {
    id: 'jugadora-candela-paris',
    nombre: 'Candela',
    apellidos: 'Paris de la Peña Preira',
    fecha_nacimiento: '08/06/2009',
    anio_nacimiento: 2009,
    posicion: 'MEDIA PUNTA',
    posicion_detalle: 'Media punta o interior',
    dorsal: '18',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-laura-alcantara',
    nombre: 'Laura',
    apellidos: 'Alcántara',
    fecha_nacimiento: '25/12/2003',
    anio_nacimiento: 2003,
    posicion: 'CENTRAL',
    posicion_detalle: 'Central',
    dorsal: '4',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  },
  {
    id: 'jugadora-sara-esquer',
    nombre: 'Sara',
    apellidos: 'Esquer Cañero',
    fecha_nacimiento: '24/08/2008',
    anio_nacimiento: 2008,
    posicion: 'EXTREMO DERECHO',
    posicion_detalle: 'Extrema derecha',
    dorsal: '7',
    lateralidad: 'Derecho',
    foto_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=300&auto=format&fit=crop',
    estado: 'Fichado',
    equipo_actual: 'UD La Poveda',
    equipo_asignado: 'Sénior Femenino',
    potencial: 5
  }
];

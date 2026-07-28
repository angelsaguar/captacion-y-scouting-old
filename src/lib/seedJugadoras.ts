import { supabase } from '@/lib/supabase';
import { JUGADORAS_ADJUNTAS } from '@/data/jugadorasData';
import { CLUB_TEAMS } from '@/types';

export async function syncJugadorasToDatabaseAndLocalStorage() {
  try {
    console.log('Iniciando sincronización de las 15 jugadoras adjuntas...');

    const officialRoster = JUGADORAS_ADJUNTAS.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      apellidos: j.apellidos,
      dorsal: j.dorsal,
      posicion: j.posicion,
      foto_url: j.foto_url,
      anio_nacimiento: j.anio_nacimiento,
      fecha_nacimiento: j.fecha_nacimiento,
      lateralidad: j.lateralidad || 'Derecho',
      estado_fisico: 'Disponible',
      email: `${j.nombre.toLowerCase().replace(/\s+/g, '')}@povedafemenino.es`
    }));

    // Team keys to sync in localStorage
    const teamsToPopulate = Array.from(new Set([
      'SENIOR FEMENINO',
      'Sénior Femenino',
      'Femenino A',
      'Femenino B',
      CLUB_TEAMS[0]
    ]));

    for (const team of teamsToPopulate) {
      const rosterKey = `team_roster_${team}`;
      // Set the clean roster of 15 players
      localStorage.setItem(rosterKey, JSON.stringify(officialRoster));
    }

    // 2. Sync to Supabase `players` table
    const { data: { user } } = await supabase.auth.getUser();

    const payloads = JUGADORAS_ADJUNTAS.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      apellidos: j.apellidos,
      posicion: j.posicion,
      dorsal: j.dorsal,
      lateralidad: j.lateralidad || 'Derecho',
      anio_nacimiento: j.anio_nacimiento,
      fecha_nacimiento: j.fecha_nacimiento,
      foto_url: j.foto_url,
      estado: 'Fichado',
      potencial: j.potencial,
      equipo_actual: j.equipo_actual || 'UD La Poveda',
      equipo_asignado: 'SENIOR FEMENINO',
      created_by: user?.id || undefined,
      observaciones: `Posición principal: ${j.posicion_detalle}. Fecha nacimiento: ${j.fecha_nacimiento}`
    }));

    for (const payload of payloads) {
      try {
        const { error } = await supabase.from('players').upsert(payload);
        if (error) {
          // Retry without fecha_nacimiento if column is missing in older schema
          const { fecha_nacimiento, ...fallback } = payload;
          await supabase.from('players').upsert(fallback);
        }
      } catch (err) {
        console.warn('Error syncing player to Supabase:', payload.nombre, err);
      }
    }

    console.log('Sincronización completada con éxito para las 15 jugadoras.');
  } catch (err) {
    console.error('Error durante la sincronización de jugadoras:', err);
  }
}


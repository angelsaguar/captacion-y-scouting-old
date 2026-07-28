import { supabase } from '@/lib/supabase';
import { JUGADORAS_ADJUNTAS } from '@/data/jugadorasData';

export async function syncJugadorasToDatabaseAndLocalStorage() {
  try {
    console.log('Iniciando sincronización de las 15 jugadoras adjuntas...');

    // 1. Sync to localStorage for team rosters
    const teamsToPopulate = ['Sénior Femenino', 'Femenino A', 'Femenino B'];
    
    for (const team of teamsToPopulate) {
      const rosterKey = `team_roster_${team}`;
      const existingRosterStr = localStorage.getItem(rosterKey);
      let roster = existingRosterStr ? JSON.parse(existingRosterStr) : [];

      // Check if roster has old demo players ("Carlos López") or lacks our official players
      const isDemoRoster = roster.some((p: any) => p.nombre === 'Carlos' || p.nombre === 'Marcos');
      if (isDemoRoster || roster.length < 10) {
        roster = JUGADORAS_ADJUNTAS.map((j) => ({
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
        localStorage.setItem(rosterKey, JSON.stringify(roster));
      } else {
        // Merge missing players
        let updated = false;
        for (const j of JUGADORAS_ADJUNTAS) {
          const idx = roster.findIndex((p: any) => 
            (p.nombre.toLowerCase() === j.nombre.toLowerCase() && p.apellidos.toLowerCase() === j.apellidos.toLowerCase()) ||
            p.id === j.id
          );
          if (idx === -1) {
            roster.push({
              id: j.id,
              nombre: j.nombre,
              apellidos: j.apellidos,
              dorsal: j.dorsal,
              posicion: j.posicion,
              foto_url: j.foto_url,
              anio_nacimiento: j.anio_nacimiento,
              fecha_nacimiento: j.fecha_nacimiento,
              lateralidad: j.lateralidad || 'Derecho',
              estado_fisico: 'Disponible'
            });
            updated = true;
          } else {
            // Update details
            roster[idx] = {
              ...roster[idx],
              fecha_nacimiento: j.fecha_nacimiento,
              anio_nacimiento: j.anio_nacimiento,
              posicion: j.posicion,
              dorsal: j.dorsal || roster[idx].dorsal
            };
            updated = true;
          }
        }
        if (updated) {
          localStorage.setItem(rosterKey, JSON.stringify(roster));
        }
      }
    }

    // 2. Sync to Supabase `players` table
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
      equipo_asignado: 'Sénior Femenino',
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

    console.log('Sincronización completada con éxito.');
  } catch (err) {
    console.error('Error durante la sincronización de jugadoras:', err);
  }
}

import { supabase } from './supabase';
import { Coach } from '@/types';
import { generateUUID } from './utils';

const LOCAL_STORAGE_KEY = 'ud_lapoveda_coaches_backup';

const DEFAULT_COACHES: Coach[] = [
  {
    id: 'coach-1',
    nombre: 'Carlos Martínez',
    club: 'RCD Carabanchel',
    equipo: 'Juvenil A',
    categoria: 'Autonómica',
    edad: 38,
    observaciones: 'Entrenador con perfil muy metodológico, bueno gestionando grupos de cantera y con propuesta de juego combinativo.',
    created_at: new Date().toISOString()
  },
  {
    id: 'coach-2',
    nombre: 'David Sanz',
    club: 'AD Arganda',
    equipo: 'Sénior B',
    categoria: 'Primera Regional',
    edad: 42,
    observaciones: 'Mucha experiencia en categorías senior. Muy intenso defensivamente y destaca por la gestión de vestuario.',
    created_at: new Date().toISOString()
  }
];

export async function getCoaches(): Promise<Coach[]> {
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Preserve local entries that might have failed to insert into Supabase
      // Also preserve specific local fields (like telefono, email, equipo_asignado) if they are missing in the Supabase schema
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      let localCoaches: Coach[] = [];
      if (cached) {
        try {
          localCoaches = JSON.parse(cached);
        } catch {}
      }
      
      const localMap = new Map<string, Coach>();
      localCoaches.forEach(c => localMap.set(c.id, c));

      const merged = data.map(remoteCoach => {
        const localCoach = localMap.get(remoteCoach.id);
        if (localCoach) {
          return {
            ...localCoach,
            ...remoteCoach,
            // If remote doesn't contain these key fields (due to missing columns), keep the local ones
            telefono: remoteCoach.telefono !== undefined ? remoteCoach.telefono : localCoach.telefono,
            email: remoteCoach.email !== undefined ? remoteCoach.email : localCoach.email,
            equipo_asignado: remoteCoach.equipo_asignado !== undefined ? remoteCoach.equipo_asignado : localCoach.equipo_asignado
          };
        }
        return remoteCoach;
      });

      const remoteIds = new Set(data.map(c => c.id));
      const unsynced = localCoaches.filter(c => !remoteIds.has(c.id));
      
      const finalMerged = [...merged, ...unsynced];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalMerged));
      return finalMerged;
    } else {
      console.warn('Supabase returned error or empty for coaches:', error);
    }
  } catch (error) {
    console.warn('Could not fetch coaches from Supabase, falling back to localStorage:', error);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return DEFAULT_COACHES;
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_COACHES));
  return DEFAULT_COACHES;
}

export async function addCoach(
  nombre: string,
  club: string,
  equipo: string,
  categoria: string,
  edad?: number,
  observaciones?: string,
  created_by?: string,
  equipo_asignado?: string,
  email?: string,
  telefono?: string
): Promise<Coach> {
  const trimmedNombre = nombre.trim();
  const trimmedClub = club.trim();
  const trimmedEquipo = equipo.trim();
  const trimmedCategoria = categoria.trim();

  if (!trimmedNombre) throw new Error('El nombre del entrenador is obligatorio');
  if (!trimmedClub) throw new Error('El club actual es obligatorio');
  if (!trimmedEquipo) throw new Error('El equipo que dirige es obligatorio');
  if (!trimmedCategoria) throw new Error('La categoría es obligatoria');

  const newId = generateUUID();

  const newCoach: Coach = {
    id: newId,
    nombre: trimmedNombre,
    club: trimmedClub,
    equipo: trimmedEquipo,
    categoria: trimmedCategoria,
    edad: edad || undefined,
    email: email?.trim() || undefined,
    telefono: telefono?.trim() || undefined,
    observaciones: observaciones?.trim() || '',
    equipo_asignado: equipo_asignado || undefined,
    created_by,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('coaches')
      .insert([newCoach])
      .select()
      .single();

    if (!error && data) {
      await getCoaches();
      return data;
    }
    
    // Fallback if foreign key violation, missing columns, or schema cache issues
    if (error) {
      console.warn('Supabase coach insert failed. Error info:', error);
      
      const isFkViolation = error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('violates foreign key');
      const isMissingColumn = error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache');
      
      if (isFkViolation || isMissingColumn) {
        console.warn('Retrying coach insert with safe fallback fields...');
        const retryCoach: any = { ...newCoach };
        
        if (isFkViolation) {
          delete retryCoach.created_by;
        }
        if (isMissingColumn) {
          delete retryCoach.equipo_asignado;
          delete retryCoach.email;
          delete retryCoach.telefono;
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from('coaches')
          .insert([retryCoach])
          .select()
          .single();
          
        if (!retryError && retryData) {
          // Save the fully populated coach to local storage first, so when getCoaches() fetches and merges, it preserves these fields
          const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
          let list: Coach[] = [];
          if (cached) {
            try { list = JSON.parse(cached); } catch {}
          }
          const updatedList = [newCoach, ...list.filter(c => c.id !== newCoach.id)];
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

          await getCoaches();
          return {
            ...newCoach,
            ...retryData
          };
        }
        
        // Double fallback if second insert failed on foreign key constraint with other options
        if (retryError && (retryError.code === '23503' || retryError.message?.includes('foreign key') || retryError.message?.includes('violates foreign key'))) {
          delete retryCoach.created_by;
          const { data: retryData3, error: retryError3 } = await supabase
            .from('coaches')
            .insert([retryCoach])
            .select()
            .single();
            
          if (!retryError3 && retryData3) {
            // Save the fully populated coach to local storage first, so when getCoaches() fetches and merges, it preserves these fields
            const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
            let list: Coach[] = [];
            if (cached) {
              try { list = JSON.parse(cached); } catch {}
            }
            const updatedList = [newCoach, ...list.filter(c => c.id !== newCoach.id)];
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

            await getCoaches();
            return {
              ...newCoach,
              ...retryData3
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Exception inserting coach to Supabase:', err);
  }

  // Local fallback insert
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Coach[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      list = DEFAULT_COACHES;
    }
  } else {
    list = DEFAULT_COACHES;
  }

  const updated = [newCoach, ...list];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return newCoach;
}

export async function updateCoach(
  id: string,
  nombre: string,
  club: string,
  equipo: string,
  categoria: string,
  edad?: number,
  observaciones?: string,
  equipo_asignado?: string,
  email?: string,
  telefono?: string
): Promise<Coach> {
  const trimmedNombre = nombre.trim();
  const trimmedClub = club.trim();
  const trimmedEquipo = equipo.trim();
  const trimmedCategoria = categoria.trim();

  if (!trimmedNombre) throw new Error('El nombre del entrenador es obligatorio');
  if (!trimmedClub) throw new Error('El club actual es obligatorio');
  if (!trimmedEquipo) throw new Error('El equipo es obligatorio');
  if (!trimmedCategoria) throw new Error('La categoría es obligatoria');

  const updatePayload: any = {
    nombre: trimmedNombre,
    club: trimmedClub,
    equipo: trimmedEquipo,
    categoria: trimmedCategoria,
    edad: edad || null,
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
    observaciones: observaciones?.trim() || '',
    equipo_asignado: equipo_asignado || null
  };

  try {
    const { data, error } = await supabase
      .from('coaches')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      await getCoaches();
      return data;
    }
    
    // Fallback if equipo_asignado, email or telefono column is missing
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
      console.warn('Supabase coach update failed due to missing columns, retrying with fallback...');
      const { equipo_asignado, email: fallbackEmail, telefono: fallbackTelefono, ...retryPayload } = updatePayload;
      const { data: retryData, error: retryError } = await supabase
        .from('coaches')
        .update(retryPayload)
        .eq('id', id)
        .select()
        .single();
        
      if (!retryError && retryData) {
        // Save the fully populated update (including fields dropped for Supabase) to local storage
        // so that the getCoaches fetch merges them and persists them to browser cache.
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          try {
            const list: Coach[] = JSON.parse(cached);
            const index = list.findIndex(c => c.id === id);
            if (index !== -1) {
              list[index] = {
                ...list[index],
                ...updatePayload,
                id // ensure id is kept
              };
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
            }
          } catch {}
        }

        await getCoaches();
        return {
          id,
          ...updatePayload,
          ...retryData
        };
      }
    }

    if (error) {
      console.warn('Supabase update coach failed, using fallback:', error);
    }
  } catch (err) {
    console.warn('Exception updating coach in Supabase:', err);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Coach[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      list = DEFAULT_COACHES;
    }
  } else {
    list = DEFAULT_COACHES;
  }

  const index = list.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('No se encontró el entrenador para actualizar');
  }

  const updatedCoach = {
    ...list[index],
    ...updatePayload,
    edad: edad || undefined
  };

  list[index] = updatedCoach;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return updatedCoach;
}

export async function deleteCoach(id: string): Promise<boolean> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    try {
      const { error } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id);

      if (!error) {
        await getCoaches().catch(() => {});
      } else {
        console.warn('Supabase error while deleting coach:', error);
      }
    } catch (err) {
      console.warn('Failed deleting coach from Supabase:', err);
    }
  } else {
    console.info('Skipping Supabase delete because ID is not a valid UUID:', id);
  }

  // Local fallback - always complete delete operation locally
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const list: Coach[] = JSON.parse(cached);
      const filtered = list.filter(c => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

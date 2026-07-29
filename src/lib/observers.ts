import { supabase } from './supabase';
import { Observer } from '@/types';
import { generateUUID } from './utils';

const LOCAL_STORAGE_KEY = 'ud_lapoveda_observers_backup';

// Default built-in observers to ensure the list is never completely empty
const DEFAULT_OBSERVERS: Observer[] = [
  { id: 'def-1', nombre: 'Ángel Saguar', created_at: new Date().toISOString() },
  { id: 'def-2', nombre: 'Alejandro Saguar', created_at: new Date().toISOString() },
  { id: 'def-3', nombre: 'Scout UD La Poveda', created_at: new Date().toISOString() }
];

export async function getObservers(): Promise<Observer[]> {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let localList: Observer[] = [];
  if (cached) {
    try {
      localList = JSON.parse(cached);
      // Ensure default observers are in local list
      for (const defObs of DEFAULT_OBSERVERS) {
        if (!localList.some(o => o.nombre.toLowerCase() === defObs.nombre.toLowerCase())) {
          localList.push(defObs);
        }
      }
    } catch {
      localList = [...DEFAULT_OBSERVERS];
    }
  } else {
    // Initialize cache on first use
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_OBSERVERS));
    localList = [...DEFAULT_OBSERVERS];
  }

  try {
    const { data, error } = await supabase
      .from('observers')
      .select('*')
      .order('nombre');

    if (!error && data) {
      // Keep database values, but fallback to local cached photo if db photo is missing
      const remoteIds = new Set(data.map((item: any) => item.id));
      const unsynced = localList.filter((o) => !remoteIds.has(o.id));

      const merged = [
        ...data.map((item: any) => {
          const localItem = localList.find((o) => o.id === item.id);
          return {
            ...item,
            foto_url: item.foto_url || (localItem ? localItem.foto_url : undefined)
          };
        }),
        ...unsynced
      ];
      // Synchronize to localStorage backup
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } else {
      console.warn('Supabase returned error or empty for observers:', error);
    }
  } catch (error) {
    console.warn('Could not fetch observers from Supabase, falling back to localStorage:', error);
  }

  return localList;
}

export async function addObserver(nombre: string, foto_url?: string): Promise<Observer> {
  const trimmedName = nombre.trim();
  if (!trimmedName) throw new Error('El nombre del observador no puede estar vacío');

  const newId = generateUUID();

  const newObserver: Observer = {
    id: newId,
    nombre: trimmedName,
    foto_url,
    created_at: new Date().toISOString(),
  };

  try {
    // Try inserting with foto_url. If it fails due to missing column, we'll try without foto_url.
    const { data, error } = await supabase
      .from('observers')
      .insert([newObserver])
      .select()
      .single();

    if (!error && data) {
      await getObservers();
      return data;
    }
    
    if (error) {
      console.warn('Supabase insert observer with foto_url failed, trying without foto_url:', error);
      // Fallback: try inserting without foto_url
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('observers')
        .insert([{ id: newId, nombre: trimmedName, created_at: newObserver.created_at }])
        .select()
        .single();
        
      if (!fallbackError && fallbackData) {
        // Enriched with the picture locally
        const enriched = { ...fallbackData, foto_url };
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        let list: Observer[] = [];
        if (cached) {
          try { list = JSON.parse(cached); } catch { list = []; }
        }
        list = [...list.filter(o => o.id !== enriched.id), enriched];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        return enriched;
      }
    }
  } catch (error) {
    console.warn('Exception inserting observer to Supabase:', error);
  }

  // Local fallback insert
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Observer[] = DEFAULT_OBSERVERS;
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      list = DEFAULT_OBSERVERS;
    }
  }

  // Prevent duplicates
  if (list.some(o => o.nombre.toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error('Ya existe un observador con este nombre');
  }

  const updated = [...list, newObserver];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return newObserver;
}

export async function deleteObserver(id: string): Promise<boolean> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  if (isUUID) {
    try {
      const { error } = await supabase
        .from('observers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed deleting observer from Supabase:', error);
      }
    } catch (err) {
      console.warn('Failed deleting observer exception:', err);
    }
  } else {
    console.info('Skipping Supabase delete because ID is not a valid UUID:', id);
  }

  // Local fallback - always complete delete operation locally
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const list: Observer[] = JSON.parse(cached);
      const filtered = list.filter(o => o.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      await getObservers(); // Fetch/sync remaining from Supabase to keep state in sync
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

export async function updateObserver(id: string, nombre: string, foto_url?: string): Promise<Observer> {
  const trimmedName = nombre.trim();
  if (!trimmedName) throw new Error('El nombre del observador no puede estar vacío');

  try {
    const updatePayload: any = { nombre: trimmedName };
    if (foto_url !== undefined) {
      updatePayload.foto_url = foto_url || null;
    }

    const { data, error } = await supabase
      .from('observers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      await getObservers();
      // Ensure we keep the local state updated with latest
      return data;
    }
    
    if (error) {
      console.warn('Supabase update observer with foto_url failed, trying only name update:', error);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('observers')
        .update({ nombre: trimmedName })
        .eq('id', id)
        .select()
        .single();
        
      if (!fallbackError && fallbackData) {
        const enriched = { ...fallbackData, foto_url: foto_url || undefined };
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        let list: Observer[] = [];
        if (cached) {
          try { list = JSON.parse(cached); } catch { list = []; }
        }
        const idx = list.findIndex(o => o.id === id);
        if (idx !== -1) {
          list[idx] = enriched;
        } else {
          list.push(enriched);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        return enriched;
      }
    }
  } catch (error) {
    console.error('Exception updating observer in Supabase:', error);
  }

  // Local fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  let list: Observer[] = [];
  if (cached) {
    try {
      list = JSON.parse(cached);
    } catch {
      list = DEFAULT_OBSERVERS;
    }
  }

  const index = list.findIndex(o => o.id === id);
  if (index === -1) {
    throw new Error('No se encontró el scouter para editar');
  }

  if (list.some((o, idx) => idx !== index && o.nombre.toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error('Ya existe un observador con este nombre');
  }

  const updatedObj = { ...list[index], nombre: trimmedName };
  if (foto_url !== undefined) {
    updatedObj.foto_url = foto_url || undefined;
  }
  
  list[index] = updatedObj;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return list[index];
}

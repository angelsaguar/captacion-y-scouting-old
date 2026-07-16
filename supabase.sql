-- SQL Schema for La Poveda Scouting

-- Tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'scout',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  contacto_tipo TEXT, -- Padre, Madre, Jugador
  equipo_actual TEXT,
  equipo_asignado TEXT,
  dorsal TEXT,
  posicion TEXT NOT NULL,
  lateralidad TEXT, -- Izquierdo, Derecho, Ambidiestro
  anio_nacimiento INTEGER,
  foto_url TEXT,
  observaciones TEXT,
  fecha_seguimiento DATE,
  potencial INTEGER CHECK (potencial >= 1 AND potencial <= 5),
  estado TEXT DEFAULT 'Observado', -- Observado, En seguimiento, Interesa, Fichado
  observador TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Observers table
CREATE TABLE IF NOT EXISTS public.observers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Needs table
CREATE TABLE IF NOT EXISTS public.needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo TEXT NOT NULL,
  posicion TEXT NOT NULL,
  solicitante TEXT NOT NULL,
  observaciones TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  club TEXT NOT NULL,
  equipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  edad INTEGER,
  email TEXT,
  telefono TEXT,
  observaciones TEXT,
  equipo_asignado TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Player attributes for valuation (0-5)
CREATE TABLE IF NOT EXISTS public.player_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  atributo TEXT NOT NULL,
  valor INTEGER CHECK (valor >= 0 AND valor <= 5),
  UNIQUE(player_id, atributo)
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.player_tags (
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (player_id, tag_id)
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Observers Policies
DROP POLICY IF EXISTS "Anyone can view observers" ON public.observers;
CREATE POLICY "Anyone can view observers" ON public.observers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Scouts can insert observers" ON public.observers;
CREATE POLICY "Scouts can insert observers" ON public.observers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Scouts can delete observers" ON public.observers;
CREATE POLICY "Scouts can delete observers" ON public.observers FOR DELETE USING (auth.uid() IS NOT NULL);

-- Needs Policies
DROP POLICY IF EXISTS "Anyone can view needs" ON public.needs;
CREATE POLICY "Anyone can view needs" ON public.needs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Scouts can insert needs" ON public.needs;
CREATE POLICY "Scouts can insert needs" ON public.needs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Scouts can update needs" ON public.needs;
CREATE POLICY "Scouts can update needs" ON public.needs FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Scouts can delete needs" ON public.needs;
CREATE POLICY "Scouts can delete needs" ON public.needs FOR DELETE USING (auth.uid() IS NOT NULL);

-- Coaches Policies
DROP POLICY IF EXISTS "Anyone can view coaches" ON public.coaches;
CREATE POLICY "Anyone can view coaches" ON public.coaches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Scouts can insert coaches" ON public.coaches;
CREATE POLICY "Scouts can insert coaches" ON public.coaches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Scouts can update coaches" ON public.coaches;
CREATE POLICY "Scouts can update coaches" ON public.coaches FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Scouts can delete coaches" ON public.coaches;
CREATE POLICY "Scouts can delete coaches" ON public.coaches FOR DELETE USING (auth.uid() IS NOT NULL);

-- Profiles logic (auto-create profile for new users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, nombre, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'nombre', new.email, 'scout');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies
DROP POLICY IF EXISTS "Users can see all players" ON public.players;
CREATE POLICY "Users can see all players" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Scouts can insert players" ON public.players;
CREATE POLICY "Scouts can insert players" ON public.players FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can update players" ON public.players;
CREATE POLICY "Only admins can update players" ON public.players FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'scout'));

DROP POLICY IF EXISTS "Only admins can delete players" ON public.players;
CREATE POLICY "Only admins can delete players" ON public.players FOR DELETE USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can see attributes" ON public.player_attributes;
CREATE POLICY "Users can see attributes" ON public.player_attributes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Scouts can insert attributes" ON public.player_attributes;
CREATE POLICY "Scouts can insert attributes" ON public.player_attributes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can update attributes" ON public.player_attributes;
CREATE POLICY "Only admins can update attributes" ON public.player_attributes FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'scout'));

DROP POLICY IF EXISTS "Only admins can delete attributes" ON public.player_attributes;
CREATE POLICY "Only admins can delete attributes" ON public.player_attributes FOR DELETE USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Everyone can see tags" ON public.tags;
CREATE POLICY "Everyone can see tags" ON public.tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Everyone can see player tags" ON public.player_tags;
CREATE POLICY "Everyone can see player tags" ON public.player_tags FOR SELECT USING (true);

-- Functions for stats
CREATE OR REPLACE FUNCTION get_player_stats()
RETURNS TABLE (
  total_players BIGINT,
  by_position JSON,
  by_lateralidad JSON
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.players),
    (SELECT json_object_agg(posicion, count) FROM (SELECT posicion, count(*) FROM public.players GROUP BY posicion) s),
    (SELECT json_object_agg(lateralidad, count) FROM (SELECT lateralidad, count(*) FROM public.players GROUP BY lateralidad) s);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create Tactics (Campograma state) table
CREATE TABLE IF NOT EXISTS public.tactics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season TEXT NOT NULL,
    team TEXT NOT NULL,
    roster JSONB NOT NULL DEFAULT '[]'::jsonb,
    lineup JSONB NOT NULL DEFAULT '{}'::jsonb,
    formation TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE(season, team)
);

-- Enable RLS for tactics
ALTER TABLE public.tactics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tactics" ON public.tactics;
CREATE POLICY "Anyone can view tactics" ON public.tactics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert/update tactics" ON public.tactics;
DROP POLICY IF EXISTS "Anyone can insert/update/delete tactics" ON public.tactics;
DROP POLICY IF EXISTS "Anyone can insert/update tactics" ON public.tactics;
CREATE POLICY "Anyone can insert/update tactics" ON public.tactics
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- 10. CREAR TABLA DE ASISTENCIA (ATTENDANCE SESSIONS)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team TEXT NOT NULL,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT,
    records JSONB NOT NULL DEFAULT '[]'::jsonb,
    tareas JSONB NOT NULL DEFAULT '[]'::jsonb,
    archivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para asistencia
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Anyone can view attendance sessions" ON public.attendance_sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Anyone can manage attendance sessions" ON public.attendance_sessions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- 11. CREAR TABLA DE PLANES DE PARTIDO (MATCH PLANS)
CREATE TABLE IF NOT EXISTS public.match_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team TEXT NOT NULL,
    rival_name TEXT NOT NULL,
    fecha_partido DATE NOT NULL,
    sistema TEXT NOT NULL,
    sistema_rival TEXT NOT NULL,
    convocatoria JSONB NOT NULL DEFAULT '[]'::jsonb,
    objetivos_tacticos TEXT,
    alineacion_propuesta TEXT,
    puntos_fuertes_rival TEXT,
    balon_parado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para planes de partido
ALTER TABLE public.match_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view match plans" ON public.match_plans;
CREATE POLICY "Anyone can view match plans" ON public.match_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage match plans" ON public.match_plans;
CREATE POLICY "Anyone can manage match plans" ON public.match_plans
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);



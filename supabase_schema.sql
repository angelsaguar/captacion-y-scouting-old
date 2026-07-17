-- ==========================================================
-- SCRIPT DE MIGRACIÓN COMPLETO PARA U.D. LA POVEDA SCOUTING
-- ==========================================================
-- Ejecuta este script todo junto en el editor de SQL (SQL Editor) 
-- de tu consola de Supabase.

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREAR TABLA DE USUARIOS (PERFILES)
-- Esta tabla almacena los perfiles adicionales asignados a las cuentas de auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'scout', -- 'scout' o 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CREAR TABLA DE JUGADORES (PLAYERS)
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
    motivos_rechazo TEXT, -- Campo exclusivo para jugadores con estado 'Rechazado'
    fecha_seguimiento DATE,
    potencial INTEGER DEFAULT 1 CHECK (potencial >= 1 AND potencial <= 5),
    estado TEXT NOT NULL DEFAULT 'Observado', -- 'Observado', 'En seguimiento', 'Interesa', 'Fichado', 'Rechazado'
    observador TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREAR TABLA DE OBSERVADORES (OBSERVERS)
CREATE TABLE IF NOT EXISTS public.observers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREAR TABLA DE NECESIDADES (NEEDS)
CREATE TABLE IF NOT EXISTS public.needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo TEXT NOT NULL,
    posicion TEXT NOT NULL,
    solicitante TEXT NOT NULL,
    observaciones TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CREAR TABLA DE ENTRENADORES (COACHES)
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
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CREAR TABLA DE ATRIBUTOS PARA VALORACIÓN DE JUGADORES
CREATE TABLE IF NOT EXISTS public.player_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    atributo TEXT NOT NULL, -- Ej: 'Velocidad', 'Regate', 'Táctica', etc.
    valor INTEGER DEFAULT 0 CHECK (valor >= 0 AND valor <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(player_id, atributo)
);

-- 7. CREAR TABLA DE TÁCTICAS (CAMPOGRAMA)
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

-- ==========================================================
-- SISTEMA DE CREACIÓN AUTOMÁTICA DE PERFILES (TRIGGER)
-- ==========================================================
-- Cuando un usuario se registra en la sección Auth de Supabase, 
-- se creará automáticamente un registro con rol 'scout' en public.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, nombre, email, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Nuevo scouting'),
        new.email,
        'scout'
    )
    ON CONFLICT (id) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        email = EXCLUDED.email;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enlazar la función como un trigger después de insertar en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- CONFIGURACIÓN DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ==========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactics ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA USUARIOS (USERS)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- POLÍTICAS PARA JUGADORES (PLAYERS)
DROP POLICY IF EXISTS "Authenticated users can view players" ON public.players;
CREATE POLICY "Authenticated users can view players" ON public.players
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert players" ON public.players;
CREATE POLICY "Authenticated users can insert players" ON public.players
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update players" ON public.players;
CREATE POLICY "Only admins and scouts can update players" ON public.players
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'scout')
        )
    );

DROP POLICY IF EXISTS "Only admins can delete players" ON public.players;
CREATE POLICY "Only admins can delete players" ON public.players
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- POLÍTICAS PARA ATRIBUTOS (PLAYER ATTRIBUTES)
DROP POLICY IF EXISTS "Authenticated users can view attributes" ON public.player_attributes;
CREATE POLICY "Authenticated users can view attributes" ON public.player_attributes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert attributes" ON public.player_attributes;
CREATE POLICY "Authenticated users can insert attributes" ON public.player_attributes
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update attributes" ON public.player_attributes;
CREATE POLICY "Only admins and scouts can update attributes" ON public.player_attributes
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'scout')
        )
    );

DROP POLICY IF EXISTS "Only admins can delete attributes" ON public.player_attributes;
CREATE POLICY "Only admins can delete attributes" ON public.player_attributes
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- POLÍTICAS PARA OBSERVADORES (OBSERVERS)
DROP POLICY IF EXISTS "Anyone can view observers" ON public.observers;
CREATE POLICY "Anyone can view observers" ON public.observers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert observers" ON public.observers;
CREATE POLICY "Authenticated users can insert observers" ON public.observers
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete observers" ON public.observers;
CREATE POLICY "Authenticated users can delete observers" ON public.observers
    FOR DELETE TO authenticated USING (true);

-- POLÍTICAS PARA NECESIDADES (NEEDS)
DROP POLICY IF EXISTS "Anyone can view needs" ON public.needs;
CREATE POLICY "Anyone can view needs" ON public.needs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert needs" ON public.needs;
CREATE POLICY "Authenticated users can insert needs" ON public.needs
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update needs" ON public.needs;
CREATE POLICY "Authenticated users can update needs" ON public.needs
    FOR UPDATE TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete needs" ON public.needs;
CREATE POLICY "Authenticated users can delete needs" ON public.needs
    FOR DELETE TO authenticated USING (true);

-- POLÍTICAS PARA ENTRENADORES (COACHES)
DROP POLICY IF EXISTS "Anyone can view coaches" ON public.coaches;
CREATE POLICY "Anyone can view coaches" ON public.coaches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert coaches" ON public.coaches;
CREATE POLICY "Authenticated users can insert coaches" ON public.coaches
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update coaches" ON public.coaches;
CREATE POLICY "Authenticated users can update coaches" ON public.coaches
    FOR UPDATE TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete coaches" ON public.coaches;
CREATE POLICY "Authenticated users can delete coaches" ON public.coaches
    FOR DELETE TO authenticated USING (true);

-- POLÍTICAS PARA TÁCTICAS (TACTICS)
DROP POLICY IF EXISTS "Anyone can view tactics" ON public.tactics;
CREATE POLICY "Anyone can view tactics" ON public.tactics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert/update tactics" ON public.tactics;
CREATE POLICY "Anyone can insert/update tactics" ON public.tactics
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==========================================================
-- 8. CONFIGURACIÓN DEL BUCKET DE IMÁGENES (AVATARS)
-- ==========================================================
-- Ejecuta esta sección para dar de alta automáticamente el storage si tienes permiso de administrador:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;


-- ==========================================================
-- 9. CREAR TABLA DE ASISTENCIA (ATTENDANCE SESSIONS)
-- ==========================================================
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


-- ==========================================================
-- 10. CREAR TABLA DE PLANES DE PARTIDO (MATCH PLANS)
-- ==========================================================
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


-- ==========================================================
-- 11. CREAR TABLA DE PARTIDOS (TEAM MATCHES)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.team_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team TEXT NOT NULL,
    rival TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'Local' | 'Visitante'
    competicion TEXT NOT NULL, -- 'Liga' | 'Copa' | 'Amistoso'
    estado TEXT NOT NULL, -- 'Programado' | 'Finalizado'
    goles_favor INTEGER,
    goles_contra INTEGER,
    acta TEXT,
    estadisticas JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para partidos
ALTER TABLE public.team_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view team matches" ON public.team_matches;
CREATE POLICY "Anyone can view team matches" ON public.team_matches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage team matches" ON public.team_matches;
CREATE POLICY "Anyone can manage team matches" ON public.team_matches
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);



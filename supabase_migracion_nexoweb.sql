-- Migración consolidada y no destructiva para NexoWeb.
-- Ejecutar una sola vez en el SQL Editor de Supabase antes de publicar.

alter table if exists public.tareas_acuario
  add column if not exists fecha_original timestamptz,
  add column if not exists reprogramada_desde timestamptz,
  add column if not exists completada_en timestamptz,
  add column if not exists omitida_en timestamptz,
  add column if not exists motivo_omision text,
  add column if not exists fecha_rutina date;

alter table if exists public.productos
  add column if not exists estado text default 'activo',
  add column if not exists updated_at timestamptz default now();

alter table if exists public.reglas_dosificacion
  add column if not exists updated_at timestamptz default now();

create unique index if not exists tareas_acuario_rutina_fecha_unica
  on public.tareas_acuario (rutina_id, fecha_rutina)
  where rutina_id is not null and fecha_rutina is not null;

create index if not exists tareas_acuario_acuario_fecha_idx
  on public.tareas_acuario (acuario_id, fecha_programada);

create index if not exists rutinas_acuario_acuario_activa_idx
  on public.rutinas_acuario (acuario_id, activa);

create table if not exists public.tratamientos_acuario (
  id uuid primary key default gen_random_uuid(),
  acuario_id uuid not null references public.acuarios(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  dosis numeric,
  unidad text,
  fecha_inicio date not null,
  hora time,
  duracion_dias integer default 1,
  intervalo_dias integer default 1,
  total_dosis integer default 1,
  observaciones text,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tratamientos_acuario_acuario_idx
  on public.tratamientos_acuario (acuario_id, fecha_inicio);

create table if not exists public.bitacora_acuario (
  id uuid primary key default gen_random_uuid(),
  acuario_id uuid not null references public.acuarios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  estado text not null check (estado in ('bien', 'regular', 'novedades')),
  nota text,
  foto_url text,
  tareas_completadas integer not null default 0,
  tareas_totales integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (acuario_id, fecha)
);

create index if not exists bitacora_acuario_acuario_fecha_idx
  on public.bitacora_acuario (acuario_id, fecha desc);

alter table public.tratamientos_acuario enable row level security;
alter table public.bitacora_acuario enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tratamientos_acuario'
      and policyname = 'tratamientos_por_propietario'
  ) then
    create policy tratamientos_por_propietario
      on public.tratamientos_acuario
      for all
      using (
        exists (
          select 1 from public.acuarios a
          where a.id = tratamientos_acuario.acuario_id
            and a.usuario_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.acuarios a
          where a.id = tratamientos_acuario.acuario_id
            and a.usuario_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bitacora_acuario'
      and policyname = 'bitacora_por_propietario'
  ) then
    create policy bitacora_por_propietario
      on public.bitacora_acuario
      for all
      using (usuario_id = auth.uid())
      with check (usuario_id = auth.uid());
  end if;
end
$$;

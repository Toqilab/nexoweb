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

alter table if exists public.habitantes
  add column if not exists temperatura_min_c numeric,
  add column if not exists temperatura_max_c numeric;

alter table if exists public.plantas
  add column if not exists temperatura_min_c numeric,
  add column if not exists temperatura_max_c numeric;

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

-- =========================================================
-- CUENTAS COMPARTIDAS Y MENSAJES TEMPORALES
-- =========================================================

create table if not exists public.acuario_miembros (
  id uuid primary key default gen_random_uuid(),
  acuario_id uuid not null references public.acuarios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  rol text not null default 'lector' check (rol in ('lector', 'editor')),
  invitado_por uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (acuario_id, usuario_id)
);

create table if not exists public.mensajes_acuario (
  id uuid primary key default gen_random_uuid(),
  acuario_id uuid not null references public.acuarios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  autor_email text not null,
  contenido text not null check (char_length(contenido) between 1 and 300),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists acuario_miembros_usuario_idx on public.acuario_miembros(usuario_id);
create index if not exists mensajes_acuario_activos_idx on public.mensajes_acuario(acuario_id, expires_at);

alter table public.acuario_miembros enable row level security;
alter table public.mensajes_acuario enable row level security;

create or replace function public.puede_ver_acuario(p_acuario_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.acuarios a where a.id = p_acuario_id and a.usuario_id = auth.uid())
    or exists(select 1 from public.acuario_miembros m where m.acuario_id = p_acuario_id and m.usuario_id = auth.uid());
$$;

create or replace function public.puede_editar_acuario(p_acuario_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.acuarios a where a.id = p_acuario_id and a.usuario_id = auth.uid())
    or exists(select 1 from public.acuario_miembros m where m.acuario_id = p_acuario_id and m.usuario_id = auth.uid() and m.rol = 'editor');
$$;

create or replace function public.invitar_miembro_acuario(p_acuario_id uuid, p_email text, p_rol text default 'lector')
returns void language plpgsql security definer set search_path = public
as $$
declare v_usuario uuid;
begin
  if not exists(select 1 from public.acuarios where id = p_acuario_id and usuario_id = auth.uid()) then
    raise exception 'Solo el propietario puede compartir este acuario';
  end if;
  if p_rol not in ('lector', 'editor') then raise exception 'Permiso no válido'; end if;
  select id into v_usuario from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_usuario is null then raise exception 'No existe una cuenta NexoWeb con ese correo'; end if;
  if v_usuario = auth.uid() then raise exception 'Esa cuenta ya es la propietaria'; end if;
  insert into public.acuario_miembros(acuario_id, usuario_id, email, rol, invitado_por)
  values (p_acuario_id, v_usuario, lower(trim(p_email)), p_rol, auth.uid())
  on conflict (acuario_id, usuario_id) do update set rol = excluded.rol, email = excluded.email;
end;
$$;

grant execute on function public.invitar_miembro_acuario(uuid, text, text) to authenticated;
grant execute on function public.puede_ver_acuario(uuid) to authenticated;
grant execute on function public.puede_editar_acuario(uuid) to authenticated;

do $$
declare t text;
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='acuarios' and policyname='acuarios_compartidos_lectura') then
    create policy acuarios_compartidos_lectura on public.acuarios for select using (public.puede_ver_acuario(id));
  end if;

  foreach t in array array['habitantes','plantas','parametros_agua','tareas_acuario','rutinas_acuario','notas_acuario','mantenimientos','alimentaciones','equipos','iluminacion','ciclos_acuario','dosis_aplicadas','salud_habitantes','actividad_historial'] loop
    if to_regclass('public.' || t) is not null then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_lectura') then
        execute format('create policy compartido_lectura on public.%I for select using (public.puede_ver_acuario(acuario_id))', t);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_insertar') then
        execute format('create policy compartido_insertar on public.%I for insert with check (public.puede_editar_acuario(acuario_id))', t);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_actualizar') then
        execute format('create policy compartido_actualizar on public.%I for update using (public.puede_editar_acuario(acuario_id)) with check (public.puede_editar_acuario(acuario_id))', t);
      end if;
    end if;
  end loop;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='acuario_miembros' and policyname='miembros_ver') then
    create policy miembros_ver on public.acuario_miembros for select using (public.puede_ver_acuario(acuario_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='acuario_miembros' and policyname='miembros_quitar') then
    create policy miembros_quitar on public.acuario_miembros for delete using (exists(select 1 from public.acuarios a where a.id=acuario_id and a.usuario_id=auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mensajes_acuario' and policyname='mensajes_ver') then
    create policy mensajes_ver on public.mensajes_acuario for select using (public.puede_ver_acuario(acuario_id) and expires_at > now());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mensajes_acuario' and policyname='mensajes_enviar') then
    create policy mensajes_enviar on public.mensajes_acuario for insert with check (public.puede_ver_acuario(acuario_id) and usuario_id=auth.uid() and expires_at <= now() + interval '7 days');
  end if;
end $$;

-- Ejecutar periódicamente si pg_cron está disponible; mientras tanto los
-- mensajes vencidos quedan invisibles y la siguiente limpieza los elimina.
create or replace function public.limpiar_mensajes_vencidos()
returns integer language plpgsql security definer set search_path = public
as $$
declare eliminados integer;
begin
  delete from public.mensajes_acuario where expires_at <= now();
  get diagnostics eliminados = row_count;
  return eliminados;
end;
$$;

grant execute on function public.limpiar_mensajes_vencidos() to authenticated;

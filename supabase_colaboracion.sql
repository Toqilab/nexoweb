-- Ejecuta TODO este archivo en Supabase > SQL Editor.
-- Es seguro repetirlo: no borra acuarios ni información existente.

create table if not exists public.acuario_miembros (
  id uuid primary key default gen_random_uuid(),
  acuario_id uuid not null references public.acuarios(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  rol text not null default 'lector' check (rol in ('lector','editor')),
  invitado_por uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(acuario_id, usuario_id)
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

grant select, insert, update, delete on public.acuario_miembros to authenticated;
grant select, insert, update, delete on public.mensajes_acuario to authenticated;

create or replace function public.puede_ver_acuario(p_acuario_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.acuarios a where a.id=p_acuario_id and a.usuario_id=auth.uid())
  or exists(select 1 from public.acuario_miembros m where m.acuario_id=p_acuario_id and m.usuario_id=auth.uid());
$$;

create or replace function public.puede_editar_acuario(p_acuario_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.acuarios a where a.id=p_acuario_id and a.usuario_id=auth.uid())
  or exists(select 1 from public.acuario_miembros m where m.acuario_id=p_acuario_id and m.usuario_id=auth.uid() and m.rol='editor');
$$;

create or replace function public.invitar_miembro_acuario(p_acuario_id uuid, p_email text, p_rol text default 'lector')
returns void language plpgsql security definer set search_path=public as $$
declare v_usuario uuid;
begin
  if not exists(select 1 from public.acuarios where id=p_acuario_id and usuario_id=auth.uid()) then raise exception 'Solo el propietario puede compartir este acuario'; end if;
  if p_rol not in ('lector','editor') then raise exception 'Permiso no válido'; end if;
  select id into v_usuario from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if v_usuario is null then raise exception 'No existe una cuenta NexoWeb con ese correo'; end if;
  if v_usuario=auth.uid() then raise exception 'Esa cuenta ya es la propietaria'; end if;
  insert into public.acuario_miembros(acuario_id,usuario_id,email,rol,invitado_por)
  values(p_acuario_id,v_usuario,lower(trim(p_email)),p_rol,auth.uid())
  on conflict(acuario_id,usuario_id) do update set rol=excluded.rol,email=excluded.email;
end $$;

create or replace function public.limpiar_mensajes_vencidos()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin delete from public.mensajes_acuario where expires_at<=now(); get diagnostics n=row_count; return n; end $$;

grant execute on function public.puede_ver_acuario(uuid) to authenticated;
grant execute on function public.puede_editar_acuario(uuid) to authenticated;
grant execute on function public.invitar_miembro_acuario(uuid,text,text) to authenticated;
grant execute on function public.limpiar_mensajes_vencidos() to authenticated;

do $$ declare t text;
begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='acuarios' and policyname='acuarios_compartidos_lectura') then
    create policy acuarios_compartidos_lectura on public.acuarios for select using(public.puede_ver_acuario(id));
  end if;
  foreach t in array array['habitantes','plantas','parametros_agua','tareas_acuario','rutinas_acuario','notas_acuario','mantenimientos','alimentaciones','equipos','iluminacion','ciclos_acuario','dosis_aplicadas','salud_habitantes','actividad_historial','productos_acuario','plan_ciclado_actividades','gastos_acuario','tratamientos_acuario','bitacora_acuario','rutina_ejecuciones'] loop
    if to_regclass('public.'||t) is not null then
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_lectura') then execute format('create policy compartido_lectura on public.%I for select using(public.puede_ver_acuario(acuario_id))',t); end if;
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_insertar') then execute format('create policy compartido_insertar on public.%I for insert with check(public.puede_editar_acuario(acuario_id))',t); end if;
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_actualizar') then execute format('create policy compartido_actualizar on public.%I for update using(public.puede_editar_acuario(acuario_id)) with check(public.puede_editar_acuario(acuario_id))',t); end if;
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='compartido_eliminar') then execute format('create policy compartido_eliminar on public.%I for delete using(public.puede_editar_acuario(acuario_id))',t); end if;
    end if;
  end loop;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='acuario_miembros' and policyname='miembros_ver') then create policy miembros_ver on public.acuario_miembros for select using(public.puede_ver_acuario(acuario_id)); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='acuario_miembros' and policyname='miembros_quitar') then create policy miembros_quitar on public.acuario_miembros for delete using(exists(select 1 from public.acuarios a where a.id=acuario_id and a.usuario_id=auth.uid())); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='acuario_miembros' and policyname='miembros_cambiar_rol') then create policy miembros_cambiar_rol on public.acuario_miembros for update using(exists(select 1 from public.acuarios a where a.id=acuario_id and a.usuario_id=auth.uid())) with check(exists(select 1 from public.acuarios a where a.id=acuario_id and a.usuario_id=auth.uid())); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mensajes_acuario' and policyname='mensajes_ver') then create policy mensajes_ver on public.mensajes_acuario for select using(public.puede_ver_acuario(acuario_id) and expires_at>now()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='mensajes_acuario' and policyname='mensajes_enviar') then create policy mensajes_enviar on public.mensajes_acuario for insert with check(public.puede_ver_acuario(acuario_id) and usuario_id=auth.uid() and expires_at<=now()+interval '7 days'); end if;
end $$;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mensajes_acuario') then
    alter publication supabase_realtime add table public.mensajes_acuario;
  end if;
end $$;

select 'Colaboración instalada correctamente' as resultado;
